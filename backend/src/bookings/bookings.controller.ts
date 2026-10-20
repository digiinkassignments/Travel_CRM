import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";
import { emitWorkflowEvent } from "../automation/automation.service";

export const bookingsRouter = Router();

bookingsRouter.use(authenticate, scopeTenant(), requireEntitlement("bookings"));

bookingsRouter.get("/", requirePermission("bookings", "view"), async (req, res, next) => {
  try {
    const { status } = req.query as Record<string, string | undefined>;
    const bookings = await prisma.booking.findMany({
      where: { clientId: req.clientId!, ...(status ? { status: status as any } : {}) },
      include: {
        customer: true,
        quotation: { select: { id: true, version: true } },
        driver: { select: { id: true, name: true } },
        vehicle: { select: { id: true, registrationNumber: true } },
        trip: true,
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return ok(res, bookings);
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get("/:id", requirePermission("bookings", "view"), async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: {
        customer: true,
        quotation: true,
        driver: true,
        vehicle: true,
        trip: true,
        payments: { orderBy: { paymentDate: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!booking) return fail(res, 404, "Booking not found", "NOT_FOUND");
    return ok(res, booking);
  } catch (err) {
    next(err);
  }
});

const updateStatusSchema = z.object({ status: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) });

bookingsRouter.patch("/:id/status", requirePermission("bookings", "edit"), async (req, res, next) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const existing = await prisma.booking.findFirst({ where: { id: req.params.id, clientId: req.clientId! }, include: { quotation: true } });
    if (!existing) return fail(res, 404, "Booking not found", "NOT_FOUND");

    const booking = await prisma.booking.update({ where: { id: req.params.id }, data: { status } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_BOOKING_STATUS", target: booking.id, metadata: { from: existing.status, to: status } });

    if (status === "CONFIRMED" && existing.status !== "CONFIRMED") {
      emitWorkflowEvent({
        clientId: req.clientId!,
        eventType: "BOOKING_CONFIRMED",
        targetType: "BOOKING",
        targetId: booking.id,
      }).catch((err) => {
        console.error("[workflow:BOOKING_CONFIRMED:status]", err);
      });
    }

    return ok(res, booking, "Booking status updated");
  } catch (err) {
    next(err);
  }
});

const updateTravelDatesSchema = z.object({
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().min(1).optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  travelStart: z.coerce.date().optional(),
  travelEnd: z.coerce.date().optional(),
  pickup: z.string().optional(),
  drop: z.string().optional(),
  vehicleType: z.string().optional(),
  distance: z.string().optional(),
  duration: z.string().optional(),
  fareInPaise: z.number().int().nonnegative().optional(),
  status: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).optional(),
  driverId: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  notes: z.string().optional(),
  paymentDueDate: z.coerce.date().optional(),
});

bookingsRouter.patch("/:id", requirePermission("bookings", "edit"), async (req, res, next) => {
  try {
    const input = updateTravelDatesSchema.parse(req.body);
    const existing = await prisma.booking.findFirst({ where: { id: req.params.id, clientId: req.clientId! }, include: { quotation: true, payments: true } });
    if (!existing) return fail(res, 404, "Booking not found", "NOT_FOUND");

    const { customerName, customerPhone, customerEmail, pickup, drop, vehicleType, distance, duration, notes, fareInPaise, status, paymentStatus, driverId, vehicleId, ...bookingFields } = input;
    const currentPaidInPaise = existing.payments.reduce((sum, payment) => sum + payment.amountInPaise, 0);
    if (paymentStatus === "UNPAID" && currentPaidInPaise > 0) return fail(res, 400, "Payments already recorded for this booking; remove them before marking it unpaid", "PAYMENTS_ALREADY_RECORDED");
    if (driverId) {
      const driver = await prisma.driver.findFirst({ where: { id: driverId, clientId: req.clientId! } });
      if (!driver) return fail(res, 400, "Driver not found", "DRIVER_NOT_FOUND");
    }
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, clientId: req.clientId! } });
      if (!vehicle) return fail(res, 400, "Vehicle not found", "VEHICLE_NOT_FOUND");
    }

    const booking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: req.params.id },
        data: { ...bookingFields, ...(fareInPaise !== undefined ? { amountInPaise: fareInPaise } : {}), ...(status ? { status } : {}), ...(driverId !== undefined ? { driverId } : {}), ...(vehicleId !== undefined ? { vehicleId } : {}) },
      });
      if (customerName !== undefined || customerPhone !== undefined || customerEmail !== undefined) {
        await tx.customer.update({ where: { id: existing.customerId }, data: { ...(customerName !== undefined ? { name: customerName } : {}), ...(customerPhone !== undefined ? { phone: customerPhone } : {}), ...(customerEmail !== undefined ? { email: customerEmail } : {}) } });
      }
      if (pickup !== undefined || drop !== undefined || vehicleType !== undefined || distance !== undefined || duration !== undefined || notes !== undefined || input.travelStart !== undefined || input.travelEnd !== undefined || driverId !== undefined || vehicleId !== undefined) {
        const currentTrip = await tx.trip.findUnique({ where: { bookingId: updated.id } });
        const itineraryNotes = [vehicleType, distance && `Distance: ${distance}`, duration && `Duration: ${duration}`, notes].filter(Boolean).join("\n") || undefined;
        if (currentTrip) {
          await tx.trip.update({ where: { bookingId: updated.id }, data: { ...(input.travelStart !== undefined ? { startDate: input.travelStart } : {}), ...(input.travelEnd !== undefined ? { endDate: input.travelEnd } : {}), ...(pickup !== undefined ? { pickup } : {}), ...(drop !== undefined ? { drop } : {}), ...(driverId !== undefined ? { driverId } : {}), ...(vehicleId !== undefined ? { vehicleId } : {}), ...(itineraryNotes !== undefined ? { itineraryNotes } : {}) } });
        }
      }
      if (vehicleType !== undefined || distance !== undefined || duration !== undefined || fareInPaise !== undefined) {
        const itinerary = Array.isArray(existing.quotation.itineraryJson) ? existing.quotation.itineraryJson : [];
        const firstItem = (itinerary[0] && typeof itinerary[0] === "object") ? itinerary[0] as Record<string, unknown> : {};
        await tx.quotation.update({
          where: { id: existing.quotationId },
          data: {
            ...(fareInPaise !== undefined ? { totalInPaise: fareInPaise } : {}),
            itineraryJson: [{ ...firstItem, ...(vehicleType !== undefined ? { vehicleType } : {}), ...(distance !== undefined ? { distance } : {}), ...(duration !== undefined ? { duration } : {}) }, ...itinerary.slice(1)],
          },
        });
      }
      const updatedAmount = fareInPaise ?? existing.amountInPaise;
      if (paymentStatus === "PAID" && currentPaidInPaise < updatedAmount) {
        await tx.payment.create({
          data: { clientId: req.clientId!, bookingId: updated.id, customerId: existing.customerId, amountInPaise: updatedAmount - currentPaidInPaise, mode: "MANUAL", paymentDate: new Date(), recordedById: req.auth!.sub, notes: "Balance recorded while editing booking" },
        });
      }
      return updated;
    });

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_BOOKING", target: booking.id });

    if (status === "CONFIRMED" && existing.status !== "CONFIRMED") {
      emitWorkflowEvent({
        clientId: req.clientId!,
        eventType: "BOOKING_CONFIRMED",
        targetType: "BOOKING",
        targetId: booking.id,
      }).catch((err) => {
        console.error("[workflow:BOOKING_CONFIRMED:update]", err);
      });
    }

    return ok(res, booking, "Booking updated");
  } catch (err) {
    next(err);
  }
});
