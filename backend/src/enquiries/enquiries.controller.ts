import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement, enforceUsageLimit } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";
import { triggerAutoWelcome } from "../whatsapp/whatsapp.service";
import { emitWorkflowEvent } from "../automation/automation.service";

export const enquiriesRouter = Router();

enquiriesRouter.use(authenticate, scopeTenant(), requireEntitlement("enquiry_crm"));

const PIPELINE_STAGES = ["NEW", "CONTACTED", "QUOTED", "NEGOTIATION", "WON", "LOST"] as const;

// --- List / filter ------------------------------------------------------------
enquiriesRouter.get("/", requirePermission("enquiries", "view"), async (req, res, next) => {
  try {
    const { status, assignedToId, source } = req.query as Record<string, string | undefined>;
    const enquiries = await prisma.enquiry.findMany({
      where: {
        clientId: req.clientId!,
        ...(status ? { status: status as any } : {}),
        ...(assignedToId ? { assignedToId } : {}),
        ...(source ? { source } : {}),
      },
      include: { customer: true, assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return ok(res, enquiries);
  } catch (err) {
    next(err);
  }
});

// --- Pipeline (Kanban) view: enquiries grouped by stage ----------------------
enquiriesRouter.get("/pipeline", requirePermission("enquiries", "view"), async (req, res, next) => {
  try {
    const enquiries = await prisma.enquiry.findMany({
      where: { clientId: req.clientId! },
      include: { customer: true, assignedTo: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const grouped: Record<string, typeof enquiries> = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, []]));
    for (const enquiry of enquiries) {
      grouped[enquiry.status].push(enquiry);
    }
    return ok(res, grouped);
  } catch (err) {
    next(err);
  }
});

enquiriesRouter.get("/:id", requirePermission("enquiries", "view"), async (req, res, next) => {
  try {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: {
        customer: true,
        assignedTo: { select: { id: true, name: true } },
        followUps: { orderBy: { createdAt: "desc" }, include: { loggedBy: { select: { id: true, name: true } } } },
        quotations: { orderBy: { version: "desc" } },
      },
    });
    if (!enquiry) return fail(res, 404, "Enquiry not found", "NOT_FOUND");
    return ok(res, enquiry);
  } catch (err) {
    next(err);
  }
});

// --- Create -------------------------------------------------------------------
const createEnquirySchema = z.object({
  customerId: z.string().optional(),
  newCustomer: z.object({ name: z.string().min(1), phone: z.string().min(1), email: z.string().email().optional().or(z.literal("")) }).optional(),
  source: z.string().optional(),
  pickupLocation: z.string().optional(),
  destination: z.string().optional(),
  travelDate: z.coerce.date().optional(),
  vehicleService: z.string().optional(),
  notes: z.string().optional(),
  followUpDate: z.coerce.date().optional(),
  assignTo: z.enum(["MANUAL", "ROUND_ROBIN", "NONE"]).default("NONE"),
  assignedToId: z.string().optional(),
  branchId: z.string().optional(),
}).refine((v) => v.customerId || v.newCustomer, { message: "customerId or newCustomer is required" });

enquiriesRouter.post("/", requirePermission("enquiries", "add"), async (req, res, next) => {
  try {
    const input = createEnquirySchema.parse(req.body);

    // Enforce max_enquiries_per_month if the plan sets one (SRS section 5/9).
    const plan = (req.client as any).plan;
    if (plan?.maxEnquiriesPerMonth !== null && plan?.maxEnquiriesPerMonth !== undefined) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const usedThisMonth = await prisma.enquiry.count({ where: { clientId: req.clientId!, createdAt: { gte: startOfMonth } } });
      if (!enforceUsageLimit(plan.maxEnquiriesPerMonth, usedThisMonth)) {
        return fail(res, 403, "You've reached your plan's enquiry limit for this month. Upgrade to add more.", "USAGE_LIMIT_REACHED");
      }
    }

    let customerId = input.customerId;
    if (!customerId && input.newCustomer) {
      const customer = await prisma.customer.create({ data: { clientId: req.clientId!, ...input.newCustomer } });
      customerId = customer.id;
    }

    let assignedToId: string | undefined;
    if (input.assignTo === "MANUAL") {
      assignedToId = input.assignedToId;
    } else if (input.assignTo === "ROUND_ROBIN") {
      assignedToId = await pickRoundRobinAssignee(req.clientId!);
    }

    // Default to the creating user's own branch if none given explicitly —
    // otherwise every enquiry lands in "unassigned" and the multi-branch
    // rollup dashboard never has anything to show (Enterprise/multi_branch
    // clients only; branchId stays null for everyone else, which is fine
    // since non-Enterprise plans never see branch UI anyway).
    const creator = await prisma.user.findUnique({ where: { id: req.auth!.sub }, select: { branchId: true } });

    const enquiry = await prisma.enquiry.create({
      data: {
        clientId: req.clientId!,
        customerId: customerId!,
        source: input.source,
        pickupLocation: input.pickupLocation ?? input.source,
        destination: input.destination,
        travelDate: input.travelDate,
        vehicleService: input.vehicleService,
        notes: input.notes,
        followUpDate: input.followUpDate,
        assignedToId,
        branchId: input.branchId ?? creator?.branchId ?? null,
      },
    });

    if (assignedToId) {
      await prisma.followUp.create({
        data: { clientId: req.clientId!, enquiryId: enquiry.id, loggedById: req.auth!.sub, activityType: "ASSIGNMENT_CHANGE", description: `Assigned on creation` },
      });
    }

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_ENQUIRY", target: enquiry.id });

    // Trigger auto-welcome WhatsApp message asynchronously if enabled
    triggerAutoWelcome(req.clientId!, enquiry.id).catch((err) => {
      console.error("[enquiry:auto-welcome-error]", err);
    });

    // Zero-Touch Workflow Automation Engine Trigger
    emitWorkflowEvent({
      clientId: req.clientId!,
      eventType: "NEW_LEAD_CREATED",
      targetType: "ENQUIRY",
      targetId: enquiry.id,
    }).catch((err) => {
      console.error("[workflow:NEW_LEAD_CREATED]", err);
    });

    return ok(res, enquiry, "Enquiry created");
  } catch (err) {
    next(err);
  }
});

// --- Bulk CSV Import ---------------------------------------------------------
const bulkEnquiryRowSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Customer phone is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  pickupLocation: z.string().optional(),
  destination: z.string().optional(),
  travelDate: z.coerce.date().optional().nullable(),
  vehicleService: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(PIPELINE_STAGES).optional(),
  followUpDate: z.coerce.date().optional().nullable(),
});

const bulkImportEnquirySchema = z.object({
  rows: z.array(bulkEnquiryRowSchema).min(1).max(1000),
  assignTo: z.enum(["NONE", "MANUAL", "ROUND_ROBIN"]).default("NONE"),
  assignedToId: z.string().optional(),
  branchId: z.string().optional(),
});

enquiriesRouter.post("/import", requirePermission("enquiries", "add"), async (req, res, next) => {
  try {
    const input = bulkImportEnquirySchema.parse(req.body);
    const { rows } = input;

    // Enforce monthly plan enquiry quota if specified
    const plan = (req.client as any).plan;
    if (plan?.maxEnquiriesPerMonth !== null && plan?.maxEnquiriesPerMonth !== undefined) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const usedThisMonth = await prisma.enquiry.count({
        where: { clientId: req.clientId!, createdAt: { gte: startOfMonth } },
      });
      if (!enforceUsageLimit(plan.maxEnquiriesPerMonth, usedThisMonth + rows.length)) {
        return fail(
          res,
          403,
          `Importing ${rows.length} leads would exceed your plan limit of ${plan.maxEnquiriesPerMonth} enquiries/month (${usedThisMonth} already used).`,
          "USAGE_LIMIT_REACHED"
        );
      }
    }

    const creator = await prisma.user.findUnique({ where: { id: req.auth!.sub }, select: { branchId: true } });
    const targetBranchId = input.branchId ?? creator?.branchId ?? null;

    // Deduplicate/find existing customers by phone under tenant
    const uniquePhones = Array.from(new Set(rows.map((r) => r.customerPhone.trim()))).filter(Boolean);
    const existingCustomers = await prisma.customer.findMany({
      where: { clientId: req.clientId!, phone: { in: uniquePhones } },
    });
    const customerMap = new Map<string, string>();
    existingCustomers.forEach((c) => customerMap.set(c.phone.trim(), c.id));

    let createdCustomersCount = 0;
    for (const row of rows) {
      const phone = row.customerPhone.trim();
      if (!customerMap.has(phone)) {
        const newCust = await prisma.customer.create({
          data: {
            clientId: req.clientId!,
            name: row.customerName.trim(),
            phone,
            email: row.customerEmail?.trim() || null,
            branchId: targetBranchId,
          },
        });
        customerMap.set(phone, newCust.id);
        createdCustomersCount++;
      }
    }

    // Prepare staff assignment strategy
    let manualAssigneeId: string | undefined;
    if (input.assignTo === "MANUAL" && input.assignedToId) {
      const staffMember = await prisma.user.findFirst({
        where: { id: input.assignedToId, clientId: req.clientId!, isActive: true },
      });
      if (staffMember) manualAssigneeId = staffMember.id;
    }

    const activeStaff =
      input.assignTo === "ROUND_ROBIN"
        ? await prisma.user.findMany({ where: { clientId: req.clientId!, isActive: true }, select: { id: true } })
        : [];
    let rrIndex = 0;

    let createdLeadsCount = 0;
    for (const row of rows) {
      const customerId = customerMap.get(row.customerPhone.trim());
      if (!customerId) continue;

      let assignedToId: string | undefined;
      if (input.assignTo === "MANUAL") {
        assignedToId = manualAssigneeId;
      } else if (input.assignTo === "ROUND_ROBIN" && activeStaff.length > 0) {
        assignedToId = activeStaff[rrIndex % activeStaff.length].id;
        rrIndex++;
      }

      const enquiry = await prisma.enquiry.create({
        data: {
          clientId: req.clientId!,
          customerId,
          source: row.source || row.pickupLocation || "CSV Import",
          pickupLocation: row.pickupLocation ?? row.source ?? null,
          destination: row.destination ?? null,
          travelDate: row.travelDate ?? null,
          vehicleService: row.vehicleService ?? null,
          notes: row.notes ?? null,
          followUpDate: row.followUpDate ?? null,
          status: row.status && (PIPELINE_STAGES as readonly string[]).includes(row.status) ? row.status : "NEW",
          assignedToId: assignedToId ?? null,
          branchId: targetBranchId,
        },
      });

      if (assignedToId) {
        await prisma.followUp.create({
          data: {
            clientId: req.clientId!,
            enquiryId: enquiry.id,
            loggedById: req.auth!.sub,
            activityType: "ASSIGNMENT_CHANGE",
            description: "Assigned via CSV bulk import",
          },
        });
      }

      createdLeadsCount++;

      emitWorkflowEvent({
        clientId: req.clientId!,
        eventType: "NEW_LEAD_CREATED",
        targetType: "ENQUIRY",
        targetId: enquiry.id,
      }).catch((err) => {
        console.error("[workflow:NEW_LEAD_CREATED:csv]", err);
      });
    }

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "IMPORT_ENQUIRIES",
      metadata: { count: createdLeadsCount, newCustomers: createdCustomersCount },
    });

    return ok(
      res,
      { imported: createdLeadsCount, newCustomers: createdCustomersCount },
      `Successfully imported ${createdLeadsCount} leads (${createdCustomersCount} new customers created)`
    );
  } catch (err) {
    next(err);
  }
});


// Simplest fair round-robin: pick the active staff user (any role) with
// the fewest currently-assigned open enquiries. Good enough for Phase 4;
// a fairness/rotation-order guarantee can be revisited later if needed.
async function pickRoundRobinAssignee(clientId: string): Promise<string | undefined> {
  const staff = await prisma.user.findMany({ where: { clientId, isActive: true } });
  if (staff.length === 0) return undefined;

  const counts = await Promise.all(
    staff.map(async (u) => ({
      userId: u.id,
      count: await prisma.enquiry.count({ where: { clientId, assignedToId: u.id, status: { notIn: ["WON", "LOST"] } } }),
    }))
  );
  counts.sort((a, b) => a.count - b.count);
  return counts[0]?.userId;
}

// --- Update status (pipeline drag / manual change) ---------------------------
const updateStatusSchema = z.object({ status: z.enum(PIPELINE_STAGES) });

enquiriesRouter.patch("/:id/status", requirePermission("enquiries", "edit"), async (req, res, next) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const existing = await prisma.enquiry.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Enquiry not found", "NOT_FOUND");

    const enquiry = await prisma.enquiry.update({ where: { id: req.params.id }, data: { status } });
    await prisma.followUp.create({
      data: {
        clientId: req.clientId!, enquiryId: enquiry.id, loggedById: req.auth!.sub,
        activityType: "STATUS_CHANGE", description: `${existing.status} → ${status}`,
      },
    });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_ENQUIRY_STATUS", target: enquiry.id, metadata: { from: existing.status, to: status } });
    return ok(res, enquiry, "Status updated");
  } catch (err) {
    next(err);
  }
});

// --- Assign / reassign ---------------------------------------------------------
const assignSchema = z.object({ assignedToId: z.string().nullable() });

enquiriesRouter.patch("/:id/assign", requirePermission("enquiries", "edit"), async (req, res, next) => {
  try {
    const { assignedToId } = assignSchema.parse(req.body);
    const existing = await prisma.enquiry.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Enquiry not found", "NOT_FOUND");

    if (assignedToId) {
      const staffExists = await prisma.user.findFirst({ where: { id: assignedToId, clientId: req.clientId! } });
      if (!staffExists) return fail(res, 400, "Staff member not found", "BAD_REQUEST");
    }

    const enquiry = await prisma.enquiry.update({ where: { id: req.params.id }, data: { assignedToId } });
    await prisma.followUp.create({
      data: { clientId: req.clientId!, enquiryId: enquiry.id, loggedById: req.auth!.sub, activityType: "ASSIGNMENT_CHANGE", description: assignedToId ? `Reassigned` : "Unassigned" },
    });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "REASSIGN_ENQUIRY", target: enquiry.id });
    return ok(res, enquiry, "Enquiry reassigned");
  } catch (err) {
    next(err);
  }
});

// --- Delete -------------------------------------------------------------------
enquiriesRouter.delete("/:id", requirePermission("enquiries", "delete"), async (req, res, next) => {
  try {
    const existing = await prisma.enquiry.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: { quotations: { select: { id: true } } },
    });
    if (!existing) return fail(res, 404, "Lead not found", "NOT_FOUND");
    if (existing.quotations.length > 0) {
      return fail(res, 409, "This lead has quotations and cannot be deleted. Delete its quotations first.", "LEAD_HAS_QUOTATIONS");
    }

    await prisma.$transaction(async (tx) => {
      await tx.followUp.deleteMany({ where: { enquiryId: existing.id, clientId: req.clientId! } });
      await tx.enquiry.delete({ where: { id: existing.id } });
    });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "DELETE_ENQUIRY", target: existing.id });
    return ok(res, { id: existing.id }, "Lead deleted");
  } catch (err) {
    next(err);
  }
});

// --- Convert lead directly to booking ----------------------------------------
const convertToBookingSchema = z.object({
  travelStart: z.coerce.date().optional(),
  travelEnd: z.coerce.date().optional(),
  pickup: z.string().min(1),
  drop: z.string().min(1),
  vehicleType: z.string().optional(),
  distance: z.string().optional(),
  duration: z.string().optional(),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  fareInPaise: z.number().int().nonnegative(),
  bookingStatus: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("CONFIRMED"),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).default("UNPAID"),
  notes: z.string().optional(),
});

enquiriesRouter.post("/:id/convert-to-booking", requireEntitlement("bookings"), requirePermission("bookings", "add"), async (req, res, next) => {
  try {
    const input = convertToBookingSchema.parse(req.body);
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: { customer: true, branch: true },
    });
    if (!enquiry) return fail(res, 404, "Lead not found", "NOT_FOUND");

    if (input.driverId) {
      const driver = await prisma.driver.findFirst({ where: { id: input.driverId, clientId: req.clientId! } });
      if (!driver) return fail(res, 400, "Driver not found", "DRIVER_NOT_FOUND");
    }
    if (input.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: input.vehicleId, clientId: req.clientId! } });
      if (!vehicle) return fail(res, 400, "Vehicle not found", "VEHICLE_NOT_FOUND");
    }

    const booking = await prisma.$transaction(async (tx) => {
      const version = (await tx.quotation.count({ where: { enquiryId: enquiry.id, clientId: req.clientId! } })) + 1;
      const quotation = await tx.quotation.create({
        data: {
          clientId: req.clientId!, enquiryId: enquiry.id, customerId: enquiry.customerId,
          version, itineraryJson: [{ pickup: input.pickup, drop: input.drop, vehicleType: input.vehicleType, distance: input.distance, duration: input.duration }],
          totalInPaise: input.fareInPaise, status: "ACCEPTED", termsAndConditions: input.notes,
        },
      });
      const created = await tx.booking.create({
        data: {
          clientId: req.clientId!, quotationId: quotation.id, customerId: enquiry.customerId,
          travelStart: input.travelStart, travelEnd: input.travelEnd, amountInPaise: input.fareInPaise,
          status: input.bookingStatus, branchId: enquiry.branchId, driverId: input.driverId, vehicleId: input.vehicleId,
        },
      });
      await tx.trip.create({
        data: {
          clientId: req.clientId!, bookingId: created.id, startDate: input.travelStart, endDate: input.travelEnd,
          pickup: input.pickup, drop: input.drop, itineraryNotes: [input.vehicleType, input.distance && `Distance: ${input.distance}`, input.duration && `Duration: ${input.duration}`, input.notes].filter(Boolean).join("\n") || null,
          driverId: input.driverId, vehicleId: input.vehicleId,
        },
      });
      if (input.paymentStatus === "PAID" && input.fareInPaise > 0) {
        await tx.payment.create({
          data: { clientId: req.clientId!, bookingId: created.id, customerId: enquiry.customerId, amountInPaise: input.fareInPaise, mode: "MANUAL", paymentDate: new Date(), recordedById: req.auth!.sub, notes: "Recorded during lead conversion" },
        });
      }
      await tx.enquiry.update({ where: { id: enquiry.id }, data: { status: "WON" } });
      return created;
    });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_BOOKING", target: booking.id, metadata: { enquiryId: enquiry.id } });

    if (booking.status === "CONFIRMED") {
      emitWorkflowEvent({
        clientId: req.clientId!,
        eventType: "BOOKING_CONFIRMED",
        targetType: "BOOKING",
        targetId: booking.id,
      }).catch((err) => {
        console.error("[workflow:BOOKING_CONFIRMED:convert]", err);
      });
    }

    return ok(res, booking, "Lead converted to booking");
  } catch (err) {
    next(err);
  }
});

// --- Follow-ups (activity timeline) -------------------------------------------
const followUpSchema = z.object({
  activityType: z.enum(["CALL", "NOTE", "FOLLOW_UP", "STATUS_CHANGE", "ASSIGNMENT_CHANGE"]),
  description: z.string().optional(),
});

enquiriesRouter.post("/:id/follow-ups", requirePermission("enquiries", "edit"), async (req, res, next) => {
  try {
    const input = followUpSchema.parse(req.body);
    const enquiry = await prisma.enquiry.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!enquiry) return fail(res, 404, "Enquiry not found", "NOT_FOUND");

    const followUp = await prisma.followUp.create({
      data: { clientId: req.clientId!, enquiryId: enquiry.id, loggedById: req.auth!.sub, ...input },
    });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "ADD_FOLLOWUP", target: followUp.id });
    return ok(res, followUp, "Follow-up logged");
  } catch (err) {
    next(err);
  }
});
