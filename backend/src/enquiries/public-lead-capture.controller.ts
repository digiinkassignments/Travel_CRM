import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { enforceUsageLimit } from "../guards/entitlement.guard";
import { triggerAutoWelcome } from "../whatsapp/whatsapp.service";
import { logTenantAction } from "../audit/audit.service";
import { emitWorkflowEvent } from "../automation/automation.service";

export const publicLeadCaptureRouter = Router({ mergeParams: true });

// -----------------------------------------------------------------------------
// GET /api/public/lead-capture/:clientCode
// Returns agency branding and profile metadata for the public embed form
// -----------------------------------------------------------------------------
publicLeadCaptureRouter.get("/:clientCode", async (req, res, next) => {
  try {
    const { clientCode } = req.params;
    const client = await prisma.client.findUnique({
      where: { clientCode },
      include: {
        companyProfile: true,
      },
    });

    if (!client || client.subscriptionStatus === "DELETED" || client.subscriptionStatus === "LOCKED") {
      return fail(res, 404, "Travel agency not found or currently inactive.", "CLIENT_NOT_FOUND");
    }

    return ok(res, {
      clientCode: client.clientCode,
      businessName: client.companyProfile?.companyName || client.businessName,
      logoUrl: client.companyProfile?.logoUrl || null,
      primaryColor: client.companyProfile?.primaryColor || "#0284c7",
      secondaryColor: client.companyProfile?.secondaryColor || "#0369a1",
      phone: client.companyProfile?.phone || client.phone,
      email: client.companyProfile?.email || client.email,
      address: client.companyProfile?.address || null,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// POST /api/public/lead-capture/:clientCode
// Inbound submission from website embed or shareable form
// -----------------------------------------------------------------------------
const publicLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(5, "Phone number is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  pickupLocation: z.string().trim().optional(),
  pickup: z.string().trim().optional(),
  destination: z.string().trim().optional(),
  travelDate: z.coerce.date().optional().nullable(),
  vehicleService: z.string().trim().optional(),
  vehicleType: z.string().trim().optional(),
  passengers: z.union([z.number(), z.string()]).optional().nullable(),
  notes: z.string().trim().optional(),
  source: z.string().trim().optional(),
});

publicLeadCaptureRouter.post("/:clientCode", async (req, res, next) => {
  try {
    const { clientCode } = req.params;
    const input = publicLeadSchema.parse(req.body);

    const client = await prisma.client.findUnique({
      where: { clientCode },
      include: {
        plan: true,
      },
    });

    if (!client || client.subscriptionStatus === "DELETED" || client.subscriptionStatus === "LOCKED") {
      return fail(res, 404, "Travel agency not found or currently inactive.", "CLIENT_NOT_FOUND");
    }

    // Check monthly plan quota
    if (client.plan?.maxEnquiriesPerMonth !== null && client.plan?.maxEnquiriesPerMonth !== undefined) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const usedThisMonth = await prisma.enquiry.count({
        where: { clientId: client.id, createdAt: { gte: startOfMonth } },
      });
      if (!enforceUsageLimit(client.plan.maxEnquiriesPerMonth, usedThisMonth + 1)) {
        return fail(res, 403, "This travel agency cannot accept new inquiries at this moment.", "QUOTA_EXCEEDED");
      }
    }

    // Match or create customer by phone
    const trimmedPhone = input.phone.trim();
    let customer = await prisma.customer.findFirst({
      where: { clientId: client.id, phone: trimmedPhone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          clientId: client.id,
          name: input.name.trim(),
          phone: trimmedPhone,
          email: input.email?.trim() || null,
        },
      });
    }

    // Auto-assign via Round Robin across active staff
    const activeStaff = await prisma.user.findMany({
      where: { clientId: client.id, isActive: true },
      select: { id: true },
    });

    let assignedToId: string | undefined;
    if (activeStaff.length > 0) {
      const staffCounts = await Promise.all(
        activeStaff.map(async (u) => ({
          userId: u.id,
          count: await prisma.enquiry.count({
            where: { clientId: client.id, assignedToId: u.id, status: { notIn: ["WON", "LOST"] } },
          }),
        }))
      );
      staffCounts.sort((a, b) => a.count - b.count);
      assignedToId = staffCounts[0]?.userId;
    }

    const pickupLocation = input.pickupLocation || input.pickup || null;
    const vehicleService = input.vehicleService || input.vehicleType || null;
    let combinedNotes = input.notes || "";
    if (input.passengers) {
      combinedNotes = combinedNotes
        ? `${combinedNotes} | Passengers: ${input.passengers}`
        : `Passengers: ${input.passengers}`;
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        clientId: client.id,
        customerId: customer.id,
        source: input.source || "Website Form",
        pickupLocation,
        destination: input.destination || null,
        travelDate: input.travelDate || null,
        vehicleService,
        notes: combinedNotes || null,
        status: "NEW",
        assignedToId,
      },
    });

    if (assignedToId) {
      await prisma.followUp.create({
        data: {
          clientId: client.id,
          enquiryId: enquiry.id,
          loggedById: assignedToId,
          activityType: "ASSIGNMENT_CHANGE",
          description: "Auto-assigned from Website Lead Capture Form",
        },
      });
    }

    // Trigger WhatsApp auto-welcome message asynchronously if configured
    triggerAutoWelcome(client.id, enquiry.id).catch((err) => {
      console.error("[public-lead-capture:auto-welcome-error]", err);
    });

    // Zero-Touch Workflow Automation Engine Trigger
    emitWorkflowEvent({
      clientId: client.id,
      eventType: "NEW_LEAD_CREATED",
      targetType: "ENQUIRY",
      targetId: enquiry.id,
    }).catch((err) => {
      console.error("[workflow:NEW_LEAD_CREATED:public]", err);
    });

    await logTenantAction({
      clientId: client.id,
      userId: assignedToId || "website-visitor",
      action: "INBOUND_WEB_LEAD",
      target: enquiry.id,
      metadata: { customerName: input.name, source: input.source || "Website Form" },
    });

    return ok(
      res,
      { enquiryId: enquiry.id },
      "Your travel inquiry has been received! Our specialist will contact you shortly."
    );
  } catch (err) {
    next(err);
  }
});
