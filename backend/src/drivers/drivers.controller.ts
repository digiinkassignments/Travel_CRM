import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";

export const driversRouter = Router();

// Driver Records & Assignment is Professional+ (SRS section 6/FR-6).
driversRouter.use(authenticate, scopeTenant(), requireEntitlement("drivers"));

function evalDriverDocStatus(date: Date | null | undefined): {
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "MISSING";
  daysRemaining: number | null;
} {
  if (!date) return { status: "MISSING", daysRemaining: null };
  const target = new Date(date).getTime();
  const now = Date.now();
  const days = Math.ceil((target - now) / 86400000);

  if (days < 0) return { status: "EXPIRED", daysRemaining: days };
  if (days <= 30) return { status: "EXPIRING_SOON", daysRemaining: days };
  return { status: "VALID", daysRemaining: days };
}

// -----------------------------------------------------------------------------
// GET /compliance/overview (Driver Compliance Audit List)
// -----------------------------------------------------------------------------
driversRouter.get("/compliance/overview", requirePermission("drivers", "view"), async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const drivers = await prisma.driver.findMany({
      where: { clientId },
      include: {
        vehicles: { select: { id: true, registrationNumber: true } },
        documents: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { name: "asc" },
    });

    let verifiedPoliceCount = 0;
    let pendingPoliceCount = 0;
    let licenseExpiredCount = 0;
    let licenseExpiringSoonCount = 0;

    const list = drivers.map((d) => {
      const dl = evalDriverDocStatus(d.licenseExpiry);
      const badge = evalDriverDocStatus(d.badgeExpiry);
      const med = evalDriverDocStatus(d.medicalFitnessExpiry);

      if (d.policeVerificationStatus === "VERIFIED") verifiedPoliceCount++;
      else pendingPoliceCount++;

      if (dl.status === "EXPIRED") licenseExpiredCount++;
      else if (dl.status === "EXPIRING_SOON") licenseExpiringSoonCount++;

      return {
        id: d.id,
        name: d.name,
        contact: d.contact,
        licenseNumber: d.licenseNumber,
        badgeNumber: d.badgeNumber,
        isAvailable: d.isAvailable,
        assignedVehicles: d.vehicles,
        policeVerificationStatus: d.policeVerificationStatus || "PENDING",
        policeVerificationDate: d.policeVerificationDate,
        emergencyContact: d.emergencyContact,
        bloodGroup: d.bloodGroup,
        compliance: {
          license: { expiry: d.licenseExpiry, ...dl },
          badge: { expiry: d.badgeExpiry, ...badge },
          medical: { expiry: d.medicalFitnessExpiry, ...med },
        },
      };
    });

    return ok(res, {
      summary: {
        totalDrivers: drivers.length,
        verifiedPoliceCount,
        pendingPoliceCount,
        licenseExpiredCount,
        licenseExpiringSoonCount,
      },
      drivers: list,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET / (Roster)
// -----------------------------------------------------------------------------
driversRouter.get("/", requirePermission("drivers", "view"), async (req, res, next) => {
  try {
    const isAuthUserDriver = req.auth!.roleId
      ? await prisma.role.findFirst({ where: { id: req.auth!.roleId, clientId: req.clientId!, name: "Driver" } })
      : null;

    const drivers = await prisma.driver.findMany({
      where: { clientId: req.clientId!, ...(isAuthUserDriver ? { id: req.auth!.sub } : {}) },
      include: {
        vehicles: { select: { id: true, registrationNumber: true, vehicleName: true, vehicleType: true } },
        documents: { orderBy: { createdAt: "desc" } },
        _count: { select: { trips: true, documents: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(res, drivers);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /:id (Driver detail)
// -----------------------------------------------------------------------------
driversRouter.get("/:id", requirePermission("drivers", "view"), async (req, res, next) => {
  try {
    const driver = await prisma.driver.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: {
        vehicles: true,
        documents: { orderBy: { createdAt: "desc" } },
        trips: {
          orderBy: { startDate: "desc" },
          take: 25,
          include: {
            booking: { include: { customer: { select: { name: true, phone: true } } } },
            vehicle: true,
            dutySlip: true,
          },
        },
      },
    });
    if (!driver) return fail(res, 404, "Driver not found", "NOT_FOUND");
    return ok(res, driver);
  } catch (err) {
    next(err);
  }
});

const driverSchema = z.object({
  name: z.string().min(1),
  licenseNumber: z.string().min(1),
  contact: z.string().min(1),
  licenseExpiry: z.coerce.date().nullable().optional(),
  badgeNumber: z.string().nullable().optional(),
  badgeExpiry: z.coerce.date().nullable().optional(),
  policeVerificationStatus: z.enum(["VERIFIED", "PENDING", "EXPIRED", "NOT_DONE"]).optional(),
  policeVerificationDate: z.coerce.date().nullable().optional(),
  medicalFitnessExpiry: z.coerce.date().nullable().optional(),
  emergencyContact: z.string().nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
});

driversRouter.post("/", requirePermission("drivers", "add"), async (req, res, next) => {
  try {
    const input = driverSchema.parse(req.body);
    const driver = await prisma.driver.create({ data: { clientId: req.clientId!, ...input } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_DRIVER", target: driver.id });
    return ok(res, driver, "Driver added to roster");
  } catch (err) {
    next(err);
  }
});

driversRouter.patch("/:id", requirePermission("drivers", "edit"), async (req, res, next) => {
  try {
    const input = driverSchema.partial().extend({ isAvailable: z.boolean().optional() }).parse(req.body);
    const existing = await prisma.driver.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Driver not found", "NOT_FOUND");

    const driver = await prisma.driver.update({ where: { id: req.params.id }, data: input });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_DRIVER", target: driver.id });
    return ok(res, driver, "Driver profile updated");
  } catch (err) {
    next(err);
  }
});

driversRouter.delete("/:id", requirePermission("drivers", "delete"), async (req, res, next) => {
  try {
    const existing = await prisma.driver.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Driver not found", "NOT_FOUND");

    const activeTrip = await prisma.trip.findFirst({ where: { driverId: req.params.id, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } });
    if (activeTrip) return fail(res, 400, "This driver has an active or upcoming trip and cannot be removed", "DRIVER_HAS_ACTIVE_TRIP");

    await prisma.driver.delete({ where: { id: req.params.id } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "DELETE_DRIVER", target: req.params.id });
    return ok(res, {}, "Driver removed from roster");
  } catch (err) {
    next(err);
  }
});

// Driver schedule
driversRouter.get("/:id/schedule", requirePermission("drivers", "view"), async (req, res, next) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { driverId: req.params.id, clientId: req.clientId! },
      include: { booking: { include: { customer: true } }, vehicle: true },
      orderBy: { startDate: "asc" },
    });
    return ok(res, trips);
  } catch (err) {
    next(err);
  }
});

// Driver documents
const documentSchema = z.object({
  type: z.string().min(1),
  fileUrl: z.string().min(1),
  fileKey: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  expiryDate: z.coerce.date().optional(),
});

driversRouter.post("/:id/documents", requirePermission("drivers", "edit"), async (req, res, next) => {
  try {
    const input = documentSchema.parse(req.body);
    const driver = await prisma.driver.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!driver) return fail(res, 404, "Driver not found", "NOT_FOUND");

    const document = await prisma.document.create({
      data: {
        clientId: req.clientId!,
        driverId: driver.id,
        type: input.type,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey || input.type,
        fileSize: input.fileSize || 0,
        expiryDate: input.expiryDate,
        uploadedBy: req.auth!.sub,
      },
    });

    if (input.expiryDate && (input.type.toUpperCase().includes("LICENSE") || input.type.toUpperCase().includes("DL"))) {
      await prisma.driver.update({
        where: { id: driver.id },
        data: { licenseExpiry: input.expiryDate },
      });
    }

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "ADD_DRIVER_DOCUMENT", target: document.id });
    return ok(res, document, "Driver document uploaded");
  } catch (err) {
    next(err);
  }
});

driversRouter.delete("/:id/documents/:docId", requirePermission("drivers", "edit"), async (req, res, next) => {
  try {
    const existing = await prisma.document.findFirst({
      where: { id: req.params.docId, driverId: req.params.id, clientId: req.clientId! },
    });
    if (!existing) return fail(res, 404, "Document not found", "NOT_FOUND");

    await prisma.document.delete({ where: { id: req.params.docId } });
    return ok(res, {}, "Document removed");
  } catch (err) {
    next(err);
  }
});
