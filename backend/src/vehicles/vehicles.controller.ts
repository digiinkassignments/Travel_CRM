import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";

export const vehiclesRouter = Router();

// Vehicle Records & Allocation is Professional+ (SRS section 6/FR-7).
vehiclesRouter.use(authenticate, scopeTenant(), requireEntitlement("vehicles"));

// -----------------------------------------------------------------------------
// Helper: Evaluate document compliance status
// -----------------------------------------------------------------------------
function evalDocStatus(date: Date | null | undefined): {
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
// GET /compliance/overview (Fleet-wide compliance score and matrix)
// -----------------------------------------------------------------------------
vehiclesRouter.get("/compliance/overview", requirePermission("vehicles", "view"), async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const vehicles = await prisma.vehicle.findMany({
      where: { clientId },
      include: {
        assignedDriver: { select: { id: true, name: true, contact: true } },
        documents: { orderBy: { createdAt: "desc" } },
        maintenanceLogs: { orderBy: { serviceDate: "desc" }, take: 1 },
      },
      orderBy: { registrationNumber: "asc" },
    });

    let compliantCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let inMaintenanceCount = 0;
    let onTripCount = 0;
    let availableCount = 0;

    const matrix = vehicles.map((v) => {
      const rc = evalDocStatus(v.rcExpiry);
      const insurance = evalDocStatus(v.insuranceExpiry);
      const permit = evalDocStatus(v.permitExpiry);
      const fitness = evalDocStatus(v.fitnessExpiry);
      const puc = evalDocStatus(v.pucExpiry);
      const tax = evalDocStatus(v.taxExpiry);

      const docs = [rc, insurance, permit, fitness, puc, tax];
      const hasExpired = docs.some((d) => d.status === "EXPIRED");
      const hasExpiring = docs.some((d) => d.status === "EXPIRING_SOON");

      let overallCompliance: "COMPLIANT" | "EXPIRING_SOON" | "NON_COMPLIANT";
      if (hasExpired) {
        overallCompliance = "NON_COMPLIANT";
        expiredCount++;
      } else if (hasExpiring) {
        overallCompliance = "EXPIRING_SOON";
        expiringSoonCount++;
      } else {
        overallCompliance = "COMPLIANT";
        compliantCount++;
      }

      if (v.operationalStatus === "MAINTENANCE") inMaintenanceCount++;
      else if (v.operationalStatus === "ON_TRIP") onTripCount++;
      else if (v.operationalStatus === "AVAILABLE") availableCount++;

      return {
        id: v.id,
        registrationNumber: v.registrationNumber,
        vehicleName: v.vehicleName || v.vehicleType,
        vehicleType: v.vehicleType,
        fuelType: v.fuelType || "DIESEL",
        currentOdometer: v.currentOdometer || 0,
        operationalStatus: v.operationalStatus,
        assignedDriver: v.assignedDriver,
        overallCompliance,
        complianceDocs: {
          rc: { expiry: v.rcExpiry, ...rc },
          insurance: { expiry: v.insuranceExpiry, ...insurance },
          permit: { expiry: v.permitExpiry, ...permit },
          fitness: { expiry: v.fitnessExpiry, ...fitness },
          puc: { expiry: v.pucExpiry, ...puc },
          tax: { expiry: v.taxExpiry, ...tax },
        },
        lastServiceDate: v.lastServiceDate,
        nextServiceDueKm: v.nextServiceDueKm,
        nextServiceDueDate: v.nextServiceDueDate,
      };
    });

    const totalVehicles = vehicles.length;
    const complianceRate = totalVehicles > 0 ? Math.round((compliantCount / totalVehicles) * 100) : 100;

    return ok(res, {
      summary: {
        totalVehicles,
        compliantCount,
        expiringSoonCount,
        expiredCount,
        inMaintenanceCount,
        onTripCount,
        availableCount,
        complianceRate,
      },
      matrix,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /compliance/export-csv (Fleet compliance audit CSV export)
// -----------------------------------------------------------------------------
vehiclesRouter.get("/compliance/export-csv", requirePermission("vehicles", "view"), async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const vehicles = await prisma.vehicle.findMany({
      where: { clientId },
      include: { assignedDriver: { select: { name: true } } },
      orderBy: { registrationNumber: "asc" },
    });

    const header = [
      "Registration Number",
      "Vehicle Name / Model",
      "Type",
      "Fuel Type",
      "Current Odometer (KM)",
      "Operational Status",
      "Assigned Chauffeur",
      "RC Expiry",
      "Insurance Expiry",
      "Permit Expiry",
      "Fitness Expiry",
      "PUC Expiry",
      "Tax Expiry",
      "Compliance Rating",
    ];

    const rows = vehicles.map((v) => {
      const rc = evalDocStatus(v.rcExpiry);
      const ins = evalDocStatus(v.insuranceExpiry);
      const per = evalDocStatus(v.permitExpiry);
      const fit = evalDocStatus(v.fitnessExpiry);
      const puc = evalDocStatus(v.pucExpiry);
      const tax = evalDocStatus(v.taxExpiry);

      const hasExpired = [rc, ins, per, fit, puc, tax].some((d) => d.status === "EXPIRED");
      const hasExpiring = [rc, ins, per, fit, puc, tax].some((d) => d.status === "EXPIRING_SOON");
      const rating = hasExpired ? "NON_COMPLIANT / EXPIRED" : hasExpiring ? "EXPIRING SOON" : "COMPLIANT";

      const fmt = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "N/A");

      return [
        `"${v.registrationNumber}"`,
        `"${v.vehicleName || v.vehicleType}"`,
        `"${v.vehicleType}"`,
        `"${v.fuelType || "N/A"}"`,
        v.currentOdometer ?? 0,
        `"${v.operationalStatus}"`,
        `"${v.assignedDriver?.name || "Unassigned"}"`,
        fmt(v.rcExpiry),
        fmt(v.insuranceExpiry),
        fmt(v.permitExpiry),
        fmt(v.fitnessExpiry),
        fmt(v.pucExpiry),
        fmt(v.taxExpiry),
        `"${rating}"`,
      ].join(",");
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="fleet-compliance-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET / (List all vehicles)
// -----------------------------------------------------------------------------
vehiclesRouter.get("/", requirePermission("vehicles", "view"), async (req, res, next) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { clientId: req.clientId! },
      include: {
        assignedDriver: { select: { id: true, name: true, contact: true } },
        maintenanceLogs: { orderBy: { serviceDate: "desc" }, take: 1 },
        _count: { select: { trips: true, documents: true, maintenanceLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(res, vehicles);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /alerts/expiring (Vehicles with compliance expiring within 30 days)
// -----------------------------------------------------------------------------
vehiclesRouter.get("/alerts/expiring", requirePermission("vehicles", "view"), async (req, res, next) => {
  try {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const vehicles = await prisma.vehicle.findMany({
      where: {
        clientId: req.clientId!,
        OR: [
          { rcExpiry: { lte: in30Days } },
          { insuranceExpiry: { lte: in30Days } },
          { permitExpiry: { lte: in30Days } },
          { fitnessExpiry: { lte: in30Days } },
          { pucExpiry: { lte: in30Days } },
          { taxExpiry: { lte: in30Days } },
        ],
      },
      include: { assignedDriver: { select: { id: true, name: true } } },
    });
    return ok(res, vehicles);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /:id (Vehicle detail)
// -----------------------------------------------------------------------------
vehiclesRouter.get("/:id", requirePermission("vehicles", "view"), async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: {
        assignedDriver: true,
        documents: { orderBy: { createdAt: "desc" } },
        maintenanceLogs: { orderBy: { serviceDate: "desc" } },
        trips: {
          orderBy: { startDate: "desc" },
          take: 25,
          include: {
            booking: { include: { customer: { select: { name: true, phone: true } } } },
            driver: { select: { id: true, name: true, contact: true } },
            dutySlip: true,
          },
        },
      },
    });
    if (!vehicle) return fail(res, 404, "Vehicle not found", "NOT_FOUND");
    return ok(res, vehicle);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Validation schema for Vehicle create/update
// -----------------------------------------------------------------------------
const vehicleSchema = z.object({
  vehicleType: z.string().min(1),
  vehicleName: z.string().optional(),
  slug: z.string().optional(),
  pricePerKm: z.number().nonnegative().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  seats: z.number().int().positive().optional(),
  bags: z.number().int().nonnegative().optional(),
  acType: z.string().optional(),
  pricingType: z.string().optional(),
  description: z.string().optional(),
  vehicleImage: z.string().optional(),
  catalogStatus: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  featured: z.boolean().optional(),
  registrationNumber: z.string().min(1),
  capacity: z.number().int().positive(),
  rcExpiry: z.coerce.date().nullable().optional(),
  insuranceExpiry: z.coerce.date().nullable().optional(),
  permitExpiry: z.coerce.date().nullable().optional(),
  fitnessExpiry: z.coerce.date().nullable().optional(),
  pucExpiry: z.coerce.date().nullable().optional(),
  taxExpiry: z.coerce.date().nullable().optional(),
  currentOdometer: z.number().int().nonnegative().optional(),
  fuelType: z.string().optional(),
  chassisNumber: z.string().optional(),
  engineNumber: z.string().optional(),
  fastagTagNumber: z.string().optional(),
  operationalStatus: z.enum(["AVAILABLE", "ON_TRIP", "MAINTENANCE", "GROUNDED"]).optional(),
  lastServiceDate: z.coerce.date().nullable().optional(),
  nextServiceDueKm: z.number().int().nonnegative().nullable().optional(),
  nextServiceDueDate: z.coerce.date().nullable().optional(),
  assignedDriverId: z.string().nullable().optional(),
});

// -----------------------------------------------------------------------------
// POST / (Create new vehicle)
// -----------------------------------------------------------------------------
vehiclesRouter.post("/", requirePermission("vehicles", "add"), async (req, res, next) => {
  try {
    const input = vehicleSchema.parse(req.body);

    const duplicate = await prisma.vehicle.findFirst({
      where: { clientId: req.clientId!, registrationNumber: input.registrationNumber },
    });
    if (duplicate) return fail(res, 400, "A vehicle with this registration number already exists", "DUPLICATE_REGISTRATION");

    const { assignedDriverId, ...restInput } = input;
    const vehicle = await prisma.vehicle.create({
      data: {
        clientId: req.clientId!,
        ...restInput,
        assignedDriverId: assignedDriverId || null,
      },
    });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "CREATE_VEHICLE",
      target: vehicle.id,
      metadata: { registrationNumber: vehicle.registrationNumber },
    });

    return ok(res, vehicle, "Vehicle added to fleet");
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// PATCH /:id (Update vehicle specifications & compliance)
// -----------------------------------------------------------------------------
vehiclesRouter.patch("/:id", requirePermission("vehicles", "edit"), async (req, res, next) => {
  try {
    const input = vehicleSchema.partial().extend({ isAvailable: z.boolean().optional() }).parse(req.body);
    const existing = await prisma.vehicle.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Vehicle not found", "NOT_FOUND");

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        ...input,
        assignedDriverId: input.assignedDriverId !== undefined ? (input.assignedDriverId || null) : undefined,
      },
    });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "UPDATE_VEHICLE",
      target: vehicle.id,
    });

    return ok(res, vehicle, "Vehicle updated");
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// DELETE /:id (Remove vehicle)
// -----------------------------------------------------------------------------
vehiclesRouter.delete("/:id", requirePermission("vehicles", "delete"), async (req, res, next) => {
  try {
    const existing = await prisma.vehicle.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Vehicle not found", "NOT_FOUND");

    const activeTrip = await prisma.trip.findFirst({
      where: { vehicleId: req.params.id, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
    });
    if (activeTrip) return fail(res, 400, "This vehicle has an active or upcoming trip and cannot be removed", "VEHICLE_HAS_ACTIVE_TRIP");

    await prisma.vehicle.delete({ where: { id: req.params.id } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "DELETE_VEHICLE", target: req.params.id });
    return ok(res, {}, "Vehicle removed from fleet");
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /:id/schedule (Vehicle availability calendar)
// -----------------------------------------------------------------------------
vehiclesRouter.get("/:id/schedule", requirePermission("vehicles", "view"), async (req, res, next) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { vehicleId: req.params.id, clientId: req.clientId!, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
      include: { booking: { include: { customer: true } } },
      orderBy: { startDate: "asc" },
    });
    return ok(res, trips);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// MAINTENANCE LOGS
// -----------------------------------------------------------------------------
const maintenanceSchema = z.object({
  serviceType: z.string().min(1),
  serviceDate: z.coerce.date(),
  odometerAtService: z.number().int().nonnegative().optional(),
  garageWorkshopName: z.string().optional(),
  garagePhone: z.string().optional(),
  costInPaise: z.number().int().nonnegative().default(0),
  invoiceBillUrl: z.string().optional(),
  notes: z.string().optional(),
  nextServiceDueKm: z.number().int().nonnegative().optional(),
  nextServiceDueDate: z.coerce.date().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED"]).default("COMPLETED"),
});

// GET /:id/maintenance
vehiclesRouter.get("/:id/maintenance", requirePermission("vehicles", "view"), async (req, res, next) => {
  try {
    const logs = await prisma.vehicleMaintenance.findMany({
      where: { vehicleId: req.params.id, clientId: req.clientId! },
      orderBy: { serviceDate: "desc" },
    });
    return ok(res, logs);
  } catch (err) {
    next(err);
  }
});

// POST /:id/maintenance (Record new maintenance service)
vehiclesRouter.post("/:id/maintenance", requirePermission("vehicles", "edit"), async (req, res, next) => {
  try {
    const input = maintenanceSchema.parse(req.body);
    const vehicle = await prisma.vehicle.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!vehicle) return fail(res, 404, "Vehicle not found", "NOT_FOUND");

    const log = await prisma.vehicleMaintenance.create({
      data: {
        clientId: req.clientId!,
        vehicleId: vehicle.id,
        serviceType: input.serviceType,
        serviceDate: input.serviceDate,
        odometerAtService: input.odometerAtService,
        garageWorkshopName: input.garageWorkshopName,
        garagePhone: input.garagePhone,
        costInPaise: input.costInPaise,
        invoiceBillUrl: input.invoiceBillUrl,
        notes: input.notes,
        nextServiceDueKm: input.nextServiceDueKm,
        nextServiceDueDate: input.nextServiceDueDate,
        status: input.status,
      },
    });

    // Update vehicle's latest service date and current odometer if higher
    const updateData: any = {
      lastServiceDate: input.serviceDate,
    };
    if (input.odometerAtService && input.odometerAtService > (vehicle.currentOdometer || 0)) {
      updateData.currentOdometer = input.odometerAtService;
    }
    if (input.nextServiceDueKm) {
      updateData.nextServiceDueKm = input.nextServiceDueKm;
    }
    if (input.nextServiceDueDate) {
      updateData.nextServiceDueDate = input.nextServiceDueDate;
    }

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: updateData,
    });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "LOG_VEHICLE_MAINTENANCE",
      target: log.id,
      metadata: { vehicleNumber: vehicle.registrationNumber, serviceType: input.serviceType, costInPaise: input.costInPaise },
    });

    return ok(res, log, "Maintenance record saved");
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/maintenance/:maintenanceId
vehiclesRouter.delete("/:id/maintenance/:maintenanceId", requirePermission("vehicles", "edit"), async (req, res, next) => {
  try {
    const existing = await prisma.vehicleMaintenance.findFirst({
      where: { id: req.params.maintenanceId, vehicleId: req.params.id, clientId: req.clientId! },
    });
    if (!existing) return fail(res, 404, "Maintenance record not found", "NOT_FOUND");

    await prisma.vehicleMaintenance.delete({ where: { id: req.params.maintenanceId } });
    return ok(res, {}, "Maintenance record deleted");
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// VEHICLE DOCUMENTS VAULT
// -----------------------------------------------------------------------------
const documentSchema = z.object({
  type: z.string().min(1),
  fileUrl: z.string().min(1),
  fileKey: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  expiryDate: z.coerce.date().optional(),
});

vehiclesRouter.post("/:id/documents", requirePermission("vehicles", "edit"), async (req, res, next) => {
  try {
    const input = documentSchema.parse(req.body);
    const vehicle = await prisma.vehicle.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!vehicle) return fail(res, 404, "Vehicle not found", "NOT_FOUND");

    const document = await prisma.document.create({
      data: {
        clientId: req.clientId!,
        vehicleId: vehicle.id,
        type: input.type,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey || input.type,
        fileSize: input.fileSize || 0,
        expiryDate: input.expiryDate,
        uploadedBy: req.auth!.sub,
      },
    });

    // If an expiry date was specified and corresponds to a statutory doc, also sync on Vehicle
    const typeUpper = input.type.toUpperCase();
    const updateSync: any = {};
    if (input.expiryDate) {
      if (typeUpper.includes("RC") || typeUpper.includes("REGISTRATION")) updateSync.rcExpiry = input.expiryDate;
      else if (typeUpper.includes("INSURANCE")) updateSync.insuranceExpiry = input.expiryDate;
      else if (typeUpper.includes("PERMIT")) updateSync.permitExpiry = input.expiryDate;
      else if (typeUpper.includes("FITNESS")) updateSync.fitnessExpiry = input.expiryDate;
      else if (typeUpper.includes("PUC") || typeUpper.includes("POLLUTION")) updateSync.pucExpiry = input.expiryDate;
      else if (typeUpper.includes("TAX")) updateSync.taxExpiry = input.expiryDate;
    }

    if (Object.keys(updateSync).length > 0) {
      await prisma.vehicle.update({ where: { id: vehicle.id }, data: updateSync });
    }

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "ADD_VEHICLE_DOCUMENT",
      target: document.id,
      metadata: { vehicleNumber: vehicle.registrationNumber, type: input.type },
    });

    return ok(res, document, "Vehicle document uploaded");
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/documents/:docId
vehiclesRouter.delete("/:id/documents/:docId", requirePermission("vehicles", "edit"), async (req, res, next) => {
  try {
    const existing = await prisma.document.findFirst({
      where: { id: req.params.docId, vehicleId: req.params.id, clientId: req.clientId! },
    });
    if (!existing) return fail(res, 404, "Document not found", "NOT_FOUND");

    await prisma.document.delete({ where: { id: req.params.docId } });
    return ok(res, {}, "Document removed");
  } catch (err) {
    next(err);
  }
});
