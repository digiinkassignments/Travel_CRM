import { Router } from "express";
import { authRouter } from "../auth/auth.controller";
import { authenticate, requireSuperAdmin } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement, getEffectiveEntitlements } from "../guards/entitlement.guard";
import { computeEffectiveStatus } from "../subscriptions/subscription-state";
import { ok } from "../common/response";
import { superAdminRouter } from "../super-admin/super-admin.controller";
import { onboardingRouter } from "../onboarding/onboarding.controller";
import { customersRouter } from "../customers/customers.controller";
import { enquiriesRouter } from "../enquiries/enquiries.controller";
import { usersRouter } from "../users/users.controller";
import { rolesRouter } from "../roles/roles.controller";
import { quotationsRouter } from "../quotations/quotations.controller";
import { bookingsRouter } from "../bookings/bookings.controller";
import { driversRouter } from "../drivers/drivers.controller";
import { vehiclesRouter } from "../vehicles/vehicles.controller";
import { tripsRouter } from "../trips/trips.controller";
import { paymentsRouter } from "../payments/payments.controller";
import { invoicesRouter } from "../invoices/invoices.controller";
import { receivablesRouter } from "../receivables/receivables.controller";
import { reportsRouter } from "../reports/reports.controller";
import { automationRouter } from "../automation/automation.controller";
import { branchesRouter } from "../branches/branches.controller";
import { whatsappRouter, whatsappWebhookRouter } from "../whatsapp/whatsapp.controller";
import { customFieldsRouter } from "../custom-fields/custom-fields.controller";
import { itinerariesRouter } from "../itineraries/itineraries.controller";
import { publicItineraryRouter } from "../itineraries/public-itinerary.controller";
import { suppliersRouter } from "../suppliers/suppliers.controller";
import { costingRouter, supplierPaymentsRouter } from "../suppliers/costing.controller";
import { voucherRouter, standaloneVoucherRouter } from "../suppliers/voucher.controller";
import { dutySlipsRouter } from "../trips/duty-slips.controller";
import { publicDutySlipRouter } from "../trips/public-duty-slip.controller";
import { bookingVaultRouter } from "../documents/booking-vault.controller";
import { publicVaultRouter } from "../documents/public-vault.controller";
import { publicLeadCaptureRouter } from "../enquiries/public-lead-capture.controller";
import { notificationsRouter } from "../notifications/notifications.controller";
import { prisma } from "../db/prisma";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fail } from "../common/response";
import { logTenantAction } from "../audit/audit.service";
import { requirePermission } from "../guards/rbac.guard";

export const apiRouter = Router();

const avatarDirectory = path.resolve(__dirname, "../../uploads/avatars");
fs.mkdirSync(avatarDirectory, { recursive: true });
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: avatarDirectory,
    filename: (req, _file, callback) => {
      callback(null, `${req.auth?.sub}-${Date.now()}${path.extname(_file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

apiRouter.use("/auth", authRouter);

apiRouter.use("/super-admin", authenticate, requireSuperAdmin, superAdminRouter);

apiRouter.use("/onboarding", onboardingRouter);
apiRouter.use("/customers", customersRouter);
apiRouter.use("/enquiries", enquiriesRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/roles", rolesRouter);
apiRouter.use("/quotations", quotationsRouter);
apiRouter.use("/bookings", bookingsRouter);
apiRouter.use("/drivers", driversRouter);
apiRouter.use("/vehicles", vehiclesRouter);
apiRouter.use("/trips", tripsRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/invoices", invoicesRouter);
apiRouter.use("/receivables", receivablesRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/automation", automationRouter);
apiRouter.use("/branches", branchesRouter);
// Public — no authenticate/scopeTenant. Meta's webhook servers call this
// directly with no login session; verification happens per-client via
// each client's own webhookVerifyToken inside the router itself.
// Deliberately mounted at a path that does NOT share a prefix with
// "/whatsapp" — whatsappRouter applies authenticate/scopeTenant via its
// own router-level .use(), which would otherwise run for ANY request
// under "/whatsapp/*" (including this one) before Express ever reaches
// this separate router, silently 401-ing Meta's callbacks.
apiRouter.use("/whatsapp-webhook", whatsappWebhookRouter);
apiRouter.use("/whatsapp", whatsappRouter);
apiRouter.use("/custom-fields", customFieldsRouter);
apiRouter.use("/itineraries", itinerariesRouter);
apiRouter.use("/public/itinerary", publicItineraryRouter);
apiRouter.use("/suppliers/payments", supplierPaymentsRouter);
apiRouter.use("/suppliers", suppliersRouter);
apiRouter.use("/bookings", costingRouter);
apiRouter.use("/bookings", voucherRouter);
apiRouter.use("/vouchers", standaloneVoucherRouter);
apiRouter.use("/trips", dutySlipsRouter);
apiRouter.use("/public/duty-slip", publicDutySlipRouter);
apiRouter.use("/bookings", bookingVaultRouter);
apiRouter.use("/public/vault", publicVaultRouter);
apiRouter.use("/public/lead-capture", publicLeadCaptureRouter);
apiRouter.use("/notifications", notificationsRouter);

apiRouter.get("/client/profile", authenticate, scopeTenant(), async (req, res, next) => {
  try {
    const companyProfile = await prisma.companyProfile.findUnique({ where: { clientId: req.clientId! } });
    return ok(res, { ...req.client, companyProfile });
  } catch (err) {
    next(err);
  }
});

const companyProfileUpdateSchema = z.object({
  companyName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional(),
  address: z.string().trim().max(500).optional(),
  gstNumber: z.string().trim().max(30).optional(),
  primaryColor: z.string().trim().regex(/^#([0-9a-fA-F]{3}){1,2}$/, "Invalid hex color").optional(),
  secondaryColor: z.string().trim().regex(/^#([0-9a-fA-F]{3}){1,2}$/, "Invalid hex color").optional(),
  whatsappNumber: z.string().trim().max(30).optional(),
  websiteUrl: z.string().trim().url().optional().or(z.literal("")),
  itineraryFooterNotes: z.string().trim().max(2000).optional(),
});

apiRouter.put("/client/company-profile", authenticate, scopeTenant(), requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const parsed = companyProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Invalid profile data");
    }
    const updated = await prisma.companyProfile.upsert({
      where: { clientId: req.clientId! },
      update: parsed.data,
      create: { clientId: req.clientId!, ...parsed.data },
    });
    return ok(res, updated, "Company branding updated successfully");
  } catch (err) {
    next(err);
  }
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
});

apiRouter.get("/client/me", authenticate, scopeTenant(["ACTIVE", "EXPIRING_SOON", "GRACE", "LOCKED"]), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirstOrThrow({
      where: { id: req.auth!.sub, clientId: req.clientId! },
      select: {
        id: true, name: true, email: true, avatarUrl: true, isClientAdmin: true,
        lastLoginAt: true, createdAt: true,
        role: { select: { name: true, permissionsJson: true } }, branch: { select: { name: true } },
        client: {
          select: {
            businessName: true, clientCode: true, ownerName: true, email: true, phone: true,
            subscriptionStatus: true, subscriptionExpiry: true, graceEndsAt: true, lockedAt: true,
            customEntitlements: true,
            plan: { select: { id: true, name: true, priceInPaise: true, entitlements: true, maxUsers: true, maxEnquiriesPerMonth: true, maxBranches: true } },
            companyProfile: { select: { companyName: true, logoUrl: true, address: true, gstNumber: true, phone: true, email: true, businessType: true, currency: true, primaryColor: true, secondaryColor: true, whatsappNumber: true, websiteUrl: true, itineraryFooterNotes: true } },
          },
        },
      },
    });

    const { status } = computeEffectiveStatus({
      subscriptionExpiry: user.client.subscriptionExpiry,
      graceEndsAt: user.client.graceEndsAt,
      currentStatus: user.client.subscriptionStatus,
      lockedAt: user.client.lockedAt,
    });

    return ok(res, {
      id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl,
      isClientAdmin: user.isClientAdmin, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt,
      role: user.role, branch: user.branch, permissions: user.role.permissionsJson, businessName: user.client.businessName,
      clientCode: user.client.clientCode, ownerName: user.client.ownerName,
      phone: user.client.phone, companyEmail: user.client.email, companyProfile: user.client.companyProfile,
      subscriptionStatus: status,
      plan: {
        ...user.client.plan,
        entitlements: getEffectiveEntitlements(user.client),
        baseEntitlements: user.client.plan?.entitlements,
        customEntitlements: user.client.customEntitlements,
      },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/client/plans", authenticate, scopeTenant(["ACTIVE", "EXPIRING_SOON", "GRACE", "LOCKED"]), async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, priceInPaise: true, entitlements: true, maxUsers: true, maxEnquiriesPerMonth: true, maxBranches: true },
      orderBy: { priceInPaise: "asc" },
    });
    return ok(res, plans);
  } catch (err) {
    next(err);
  }
});

apiRouter.put("/client/me", authenticate, scopeTenant(["ACTIVE", "EXPIRING_SOON", "GRACE", "LOCKED"]), async (req, res, next) => {
  try {
    const input = profileUpdateSchema.parse(req.body);
    const existing = await prisma.user.findFirstOrThrow({ where: { id: req.auth!.sub, clientId: req.clientId! } });
    const user = await prisma.user.update({
      where: { id: existing.id }, data: input,
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    await logTenantAction({ clientId: req.clientId!, userId: existing.id, action: "UPDATE_PROFILE" });
    return ok(res, user, "Profile updated");
  } catch (err: any) {
    if (err?.code === "P2002") return fail(res, 409, "That email address is already in use", "EMAIL_IN_USE");
    next(err);
  }
});

apiRouter.post("/client/me/avatar", authenticate, scopeTenant(["ACTIVE", "EXPIRING_SOON", "GRACE", "LOCKED"]), avatarUpload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 400, "Please upload a JPG, PNG or WEBP image", "INVALID_AVATAR");
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await prisma.user.update({ where: { id: req.auth!.sub }, data: { avatarUrl }, select: { avatarUrl: true } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_PROFILE_AVATAR" });
    return ok(res, user, "Profile picture updated");
  } catch (err) {
    next(err);
  }
});

// Dashboard metrics (SRS section 40). Starter tier only for now — the
// Professional+/Business+ tiers add booking revenue, outstanding
// payments, and advanced analytics, which land in Phases 5/7/8 once
// Booking/Payment data actually exists to aggregate.
apiRouter.get("/client/dashboard", authenticate, scopeTenant(), requireEntitlement("enquiry_crm"), requirePermission("dashboard", "view"), async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalEnquiries, newEnquiries, recentActivities] = await Promise.all([
      prisma.enquiry.count({ where: { clientId } }),
      prisma.enquiry.count({ where: { clientId, createdAt: { gte: startOfMonth } } }),
      prisma.followUp.findMany({
        where: { clientId },
        include: { loggedBy: { select: { name: true } }, enquiry: { select: { id: true, destination: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const metrics: Record<string, unknown> = { totalEnquiries, newEnquiries, recentActivities };

    // Professional+ adds booking/revenue/outstanding metrics now that
    // Bookings and Payments exist (SRS section 40).
    const entitlements = getEffectiveEntitlements(req.client);
    if (entitlements.bookings) {
      const [activeBookings, revenueAgg] = await Promise.all([
        prisma.booking.count({ where: { clientId, status: { in: ["CONFIRMED", "IN_PROGRESS"] } } }),
        prisma.booking.aggregate({ where: { clientId }, _sum: { amountInPaise: true } }),
      ]);
      metrics.activeBookings = activeBookings;
      metrics.totalBookingRevenueInPaise = revenueAgg._sum.amountInPaise ?? 0;
    }
    if (entitlements.payments) {
      const bookings = await prisma.booking.findMany({
        where: { clientId, status: { not: "CANCELLED" } },
        select: { amountInPaise: true, payments: { select: { amountInPaise: true } } },
      });
      const outstandingInPaise = bookings.reduce((sum, b) => {
        const paid = b.payments.reduce((s, p) => s + p.amountInPaise, 0);
        return sum + Math.max(b.amountInPaise - paid, 0);
      }, 0);
      metrics.outstandingPaymentsInPaise = outstandingInPaise;
    }

    return ok(res, metrics);
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/payment-renewal", authenticate, async (req, res, next) => {
  try {
    if (req.auth?.role !== "CLIENT_USER" || !req.auth.clientId) {
      return ok(res, null);
    }
    const client = await prisma.client.findUnique({ where: { id: req.auth.clientId } });
    if (!client) {
      return fail(res, 404, "Client not found", "CLIENT_NOT_FOUND");
    }
    const { status } = computeEffectiveStatus({
      subscriptionExpiry: client.subscriptionExpiry,
      graceEndsAt: client.graceEndsAt,
      currentStatus: client.subscriptionStatus,
      lockedAt: client.lockedAt,
    });
    return ok(res, {
      subscriptionStatus: status,
      subscriptionExpiry: client.subscriptionExpiry,
      graceEndsAt: client.graceEndsAt,
      lockedAt: client.lockedAt,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post("/payment-renewal/notify", authenticate, async (req, res, next) => {
  try {
    if (req.auth?.role !== "CLIENT_USER" || !req.auth.clientId) {
      return ok(res, null);
    }
    const planId = typeof req.body?.planId === "string" ? req.body.planId : undefined;
    let message = req.body?.message as string | undefined;
    if (planId) {
      const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true }, select: { name: true } });
      if (!plan) return fail(res, 400, "Selected plan is unavailable", "PLAN_NOT_AVAILABLE");
      message = `Plan change requested: ${plan.name}${message ? ` - ${message}` : ""}`;
    }
    const notice = await prisma.paymentNotice.create({
      data: { clientId: req.auth.clientId, message },
    });
    return ok(res, notice, "Payment notice sent to Super Admin");
  } catch (err) {
    next(err);
  }
});
