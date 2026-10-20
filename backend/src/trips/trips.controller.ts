import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { TripStatus } from "../generated/client";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";

export const tripsRouter = Router();

// A Trip only ever exists because a Booking created one, so trips are
// gated the same way bookings are rather than a separate entitlement flag.
tripsRouter.use(authenticate, scopeTenant(), requireEntitlement("bookings"));

tripsRouter.get("/", requirePermission("trips", "view"), async (req, res, next) => {
  try {
    const { status } = req.query as Record<string, string | undefined>;

    const isAuthUserDriver = req.auth!.roleId
      ? await prisma.role.findFirst({ where: { id: req.auth!.roleId, clientId: req.clientId!, name: "Driver" } })
      : null;

    const trips = await prisma.trip.findMany({
      where: {
        clientId: req.clientId!,
        ...(status ? { status: status as any } : {}),
        ...(isAuthUserDriver ? { driverId: req.auth!.sub } : {}),
      },
      include: {
        booking: { include: { customer: true } },
        driver: { select: { id: true, name: true } },
        vehicle: { select: { id: true, registrationNumber: true } },
      },
      orderBy: { startDate: "asc" },
      take: 300,
    });
    return ok(res, trips);
  } catch (err) {
    next(err);
  }
});

tripsRouter.get("/:id", requirePermission("trips", "view"), async (req, res, next) => {
  try {
    const trip = await prisma.trip.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: { booking: { include: { customer: true, quotation: true } }, driver: true, vehicle: true },
    });
    if (!trip) return fail(res, 404, "Trip not found", "NOT_FOUND");
    return ok(res, trip);
  } catch (err) {
    next(err);
  }
});

const updateTripSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  pickup: z.string().optional(),
  drop: z.string().optional(),
  itineraryNotes: z.string().optional(),
});

tripsRouter.patch("/:id", requirePermission("trips", "edit"), async (req, res, next) => {
  try {
    const input = updateTripSchema.parse(req.body);
    const existing = await prisma.trip.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Trip not found", "NOT_FOUND");

    const trip = await prisma.trip.update({ where: { id: req.params.id }, data: input });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_TRIP", target: trip.id });
    return ok(res, trip, "Trip updated");
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({ status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) });

tripsRouter.patch("/:id/status", requirePermission("trips", "edit"), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const existing = await prisma.trip.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Trip not found", "NOT_FOUND");

    const trip = await prisma.trip.update({ where: { id: req.params.id }, data: { status } });

    // Keep the parent Booking's status in step with common trip transitions.
    if (status === "IN_PROGRESS" || status === "COMPLETED" || status === "CANCELLED") {
      await prisma.booking.update({ where: { id: existing.bookingId }, data: { status } });
    }

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_TRIP_STATUS", target: trip.id, metadata: { from: existing.status, to: status } });
    return ok(res, trip, "Trip status updated");
  } catch (err) {
    next(err);
  }
});

// --- Assignment with double-booking prevention (SRS FR-6.2/FR-7.2) -------------
async function findConflictingTrip(params: {
  clientId: string; tripId: string; driverId?: string | null; vehicleId?: string | null;
  startDate: Date | null; endDate: Date | null;
}) {
  const { clientId, tripId, driverId, vehicleId, startDate, endDate } = params;
  if (!startDate) return null; // no dates yet — nothing to conflict with

  const effectiveEnd = endDate ?? startDate;

  const overlapCondition = {
    id: { not: tripId },
    clientId,
    status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
    startDate: { lte: effectiveEnd },
    OR: [{ endDate: { gte: startDate } }, { endDate: null }],
  };

  if (driverId) {
    const conflict = await prisma.trip.findFirst({ where: { ...overlapCondition, driverId } });
    if (conflict) return { type: "driver" as const, conflict };
  }
  if (vehicleId) {
    const conflict = await prisma.trip.findFirst({ where: { ...overlapCondition, vehicleId } });
    if (conflict) return { type: "vehicle" as const, conflict };
  }
  return null;
}

const assignSchema = z.object({
  driverId: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
});

tripsRouter.patch("/:id/assign", requirePermission("trips", "edit"), async (req, res, next) => {
  try {
    const input = assignSchema.parse(req.body);
    const trip = await prisma.trip.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!trip) return fail(res, 404, "Trip not found", "NOT_FOUND");

    if (input.driverId) {
      const driver = await prisma.driver.findFirst({ where: { id: input.driverId, clientId: req.clientId! } });
      if (!driver) return fail(res, 400, "Driver not found", "BAD_REQUEST");
    }
    if (input.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: input.vehicleId, clientId: req.clientId! } });
      if (!vehicle) return fail(res, 400, "Vehicle not found", "BAD_REQUEST");
    }

    const conflict = await findConflictingTrip({
      clientId: req.clientId!,
      tripId: trip.id,
      driverId: input.driverId ?? undefined,
      vehicleId: input.vehicleId ?? undefined,
      startDate: trip.startDate,
      endDate: trip.endDate,
    });

    if (conflict) {
      return fail(
        res, 409,
        `This ${conflict.type} is already assigned to another trip in this date range`,
        "DOUBLE_BOOKING_CONFLICT"
      );
    }

    const updated = await prisma.trip.update({ where: { id: trip.id }, data: input });

    // Keep the Booking's driver/vehicle fields (shown on the voucher) in sync.
    await prisma.booking.update({ where: { id: trip.bookingId }, data: input });

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "ASSIGN_TRIP", target: trip.id, metadata: input });
    return ok(res, updated, "Assignment updated");
  } catch (err) {
    next(err);
  }
});
