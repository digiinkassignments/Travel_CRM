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

export const quotationsRouter = Router();

// Quotation Builder is Professional+ only (SRS section 6/FR-4).
quotationsRouter.use(authenticate, scopeTenant(), requireEntitlement("quotation"));

const itineraryItemSchema = z.object({
  description: z.string().min(1),
  amountInPaise: z.number().int().nonnegative(),
});

const quotationInputSchema = z.object({
  enquiryId: z.string(),
  itinerary: z.array(itineraryItemSchema).min(1),
  markupInPaise: z.number().int().default(0),
  discountInPaise: z.number().int().default(0),
  taxInPaise: z.number().int().default(0),
  termsAndConditions: z.string().optional(),
});

function computeTotal(input: z.infer<typeof quotationInputSchema>): number {
  const itemsTotal = input.itinerary.reduce((sum, item) => sum + item.amountInPaise, 0);
  return itemsTotal + input.markupInPaise - input.discountInPaise + input.taxInPaise;
}

// --- List / detail --------------------------------------------------------------
quotationsRouter.get("/", requirePermission("quotations", "view"), async (req, res, next) => {
  try {
    const { status, enquiryId } = req.query as Record<string, string | undefined>;
    const quotations = await prisma.quotation.findMany({
      where: {
        clientId: req.clientId!,
        ...(status ? { status: status as any } : {}),
        ...(enquiryId ? { enquiryId } : {}),
      },
      include: { customer: true, enquiry: { select: { id: true, destination: true } }, booking: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return ok(res, quotations);
  } catch (err) {
    next(err);
  }
});

quotationsRouter.get("/:id", requirePermission("quotations", "view"), async (req, res, next) => {
  try {
    const quotation = await prisma.quotation.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: { customer: true, enquiry: true, booking: true },
    });
    if (!quotation) return fail(res, 404, "Quotation not found", "NOT_FOUND");
    return ok(res, quotation);
  } catch (err) {
    next(err);
  }
});

// --- Create (always starts a fresh version-1 quotation for the enquiry) --------
quotationsRouter.post("/", requirePermission("quotations", "add"), async (req, res, next) => {
  try {
    const input = quotationInputSchema.parse(req.body);

    const enquiry = await prisma.enquiry.findFirst({ where: { id: input.enquiryId, clientId: req.clientId! } });
    if (!enquiry) return fail(res, 404, "Enquiry not found", "NOT_FOUND");

    const existingVersions = await prisma.quotation.count({ where: { enquiryId: enquiry.id, clientId: req.clientId! } });

    const quotation = await prisma.quotation.create({
      data: {
        clientId: req.clientId!,
        enquiryId: enquiry.id,
        customerId: enquiry.customerId,
        version: existingVersions + 1,
        itineraryJson: input.itinerary,
        markupInPaise: input.markupInPaise,
        discountInPaise: input.discountInPaise,
        taxInPaise: input.taxInPaise,
        totalInPaise: computeTotal(input),
        termsAndConditions: input.termsAndConditions,
        status: "DRAFT",
      },
    });

    // Creating a quotation is itself a pipeline-moving event.
    if (enquiry.status === "NEW" || enquiry.status === "CONTACTED") {
      await prisma.enquiry.update({ where: { id: enquiry.id }, data: { status: "QUOTED" } });
    }
    await prisma.followUp.create({
      data: { clientId: req.clientId!, enquiryId: enquiry.id, loggedById: req.auth!.sub, activityType: "STATUS_CHANGE", description: `Quotation v${quotation.version} created` },
    });

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_QUOTATION", target: quotation.id });
    return ok(res, quotation, "Quotation created");
  } catch (err) {
    next(err);
  }
});

// New version of an existing quotation for the same enquiry — SRS FR-4.3
// "support multiple quotation versions". Keeps the old one untouched.
quotationsRouter.post("/:id/new-version", requirePermission("quotations", "add"), async (req, res, next) => {
  try {
    const previous = await prisma.quotation.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!previous) return fail(res, 404, "Quotation not found", "NOT_FOUND");

    const input = quotationInputSchema.partial().parse(req.body);
    const itinerary = input.itinerary ?? (previous.itineraryJson as any);
    const markupInPaise = input.markupInPaise ?? previous.markupInPaise;
    const discountInPaise = input.discountInPaise ?? previous.discountInPaise;
    const taxInPaise = input.taxInPaise ?? previous.taxInPaise;
    const itemsTotal = itinerary.reduce((sum: number, i: any) => sum + i.amountInPaise, 0);

    const nextVersion = (await prisma.quotation.count({ where: { enquiryId: previous.enquiryId, clientId: req.clientId! } })) + 1;

    const quotation = await prisma.quotation.create({
      data: {
        clientId: req.clientId!,
        enquiryId: previous.enquiryId,
        customerId: previous.customerId,
        version: nextVersion,
        itineraryJson: itinerary,
        markupInPaise, discountInPaise, taxInPaise,
        totalInPaise: itemsTotal + markupInPaise - discountInPaise + taxInPaise,
        termsAndConditions: input.termsAndConditions ?? previous.termsAndConditions,
        status: "DRAFT",
      },
    });

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_QUOTATION_VERSION", target: quotation.id, metadata: { previousId: previous.id } });
    return ok(res, quotation, `Version ${nextVersion} created`);
  } catch (err) {
    next(err);
  }
});

// --- Edit (draft only) -----------------------------------------------------------
quotationsRouter.patch("/:id", requirePermission("quotations", "edit"), async (req, res, next) => {
  try {
    const existing = await prisma.quotation.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Quotation not found", "NOT_FOUND");
    if (existing.status !== "DRAFT") return fail(res, 400, "Only draft quotations can be edited", "NOT_EDITABLE");

    const input = quotationInputSchema.partial().omit({ enquiryId: true }).parse(req.body);
    const itinerary = input.itinerary ?? (existing.itineraryJson as any);
    const markupInPaise = input.markupInPaise ?? existing.markupInPaise;
    const discountInPaise = input.discountInPaise ?? existing.discountInPaise;
    const taxInPaise = input.taxInPaise ?? existing.taxInPaise;
    const itemsTotal = itinerary.reduce((sum: number, i: any) => sum + i.amountInPaise, 0);

    const quotation = await prisma.quotation.update({
      where: { id: req.params.id },
      data: {
        itineraryJson: itinerary, markupInPaise, discountInPaise, taxInPaise,
        totalInPaise: itemsTotal + markupInPaise - discountInPaise + taxInPaise,
        termsAndConditions: input.termsAndConditions ?? existing.termsAndConditions,
      },
    });

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_QUOTATION", target: quotation.id });
    return ok(res, quotation, "Quotation updated");
  } catch (err) {
    next(err);
  }
});

// --- Status transitions (Draft -> Sent -> Accepted/Rejected/Expired) -----------
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};

quotationsRouter.patch("/:id/status", requirePermission("quotations", "edit"), async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(["SENT", "ACCEPTED", "REJECTED", "EXPIRED"]) }).parse(req.body);
    const existing = await prisma.quotation.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Quotation not found", "NOT_FOUND");

    if (!VALID_TRANSITIONS[existing.status]?.includes(status)) {
      return fail(res, 400, `Cannot move a ${existing.status} quotation to ${status}`, "INVALID_TRANSITION");
    }

    const quotation = await prisma.quotation.update({ where: { id: req.params.id }, data: { status } });

    if (status === "ACCEPTED") {
      await prisma.enquiry.update({ where: { id: existing.enquiryId }, data: { status: "NEGOTIATION" } });
    }

    await prisma.followUp.create({
      data: { clientId: req.clientId!, enquiryId: existing.enquiryId, loggedById: req.auth!.sub, activityType: "STATUS_CHANGE", description: `Quotation v${existing.version} → ${status}` },
    });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_QUOTATION_STATUS", target: quotation.id, metadata: { from: existing.status, to: status } });

    return ok(res, quotation, "Quotation status updated");
  } catch (err) {
    next(err);
  }
});

// --- Convert to Booking (SRS FR-4.4: only from an ACCEPTED quotation) ----------
quotationsRouter.post("/:id/convert-to-booking", requireEntitlement("bookings"), requirePermission("bookings", "add"), async (req, res, next) => {
  try {
    const quotation = await prisma.quotation.findFirst({ where: { id: req.params.id, clientId: req.clientId! }, include: { enquiry: { select: { branchId: true } } } });
    if (!quotation) return fail(res, 404, "Quotation not found", "NOT_FOUND");
    if (quotation.status !== "ACCEPTED") return fail(res, 400, "Only an accepted quotation can be converted to a booking", "NOT_ACCEPTED");

    const existingBooking = await prisma.booking.findUnique({ where: { quotationId: quotation.id } });
    if (existingBooking) return fail(res, 400, "This quotation already has a booking", "ALREADY_BOOKED");

    const { travelStart, travelEnd } = z.object({
      travelStart: z.coerce.date().optional(),
      travelEnd: z.coerce.date().optional(),
    }).parse(req.body ?? {});

    const booking = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          clientId: req.clientId!,
          quotationId: quotation.id,
          customerId: quotation.customerId,
          amountInPaise: quotation.totalInPaise,
          travelStart, travelEnd,
          status: "CONFIRMED",
          // Inherited from the enquiry so multi-branch revenue rollup
          // (branches.controller.ts) reflects reality without requiring
          // the user to re-pick a branch at booking time.
          branchId: quotation.enquiry.branchId,
        },
      });

      // SRS FR-5.1: every booking gets an associated Trip record. Driver/
      // vehicle assignment is a Phase 6 (Operations) concern — left null here.
      await tx.trip.create({
        data: { clientId: req.clientId!, bookingId: booking.id, startDate: travelStart, endDate: travelEnd, status: "SCHEDULED" },
      });

      await tx.enquiry.update({ where: { id: quotation.enquiryId }, data: { status: "WON" } });

      return booking;
    });

    await prisma.followUp.create({
      data: { clientId: req.clientId!, enquiryId: quotation.enquiryId, loggedById: req.auth!.sub, activityType: "STATUS_CHANGE", description: `Converted to booking` },
    });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_BOOKING", target: booking.id, metadata: { quotationId: quotation.id } });

    emitWorkflowEvent({
      clientId: req.clientId!,
      eventType: "BOOKING_CONFIRMED",
      targetType: "BOOKING",
      targetId: booking.id,
    }).catch((err) => {
      console.error("[workflow:BOOKING_CONFIRMED:quotation]", err);
    });

    return ok(res, booking, "Booking created");
  } catch (err) {
    next(err);
  }
});
