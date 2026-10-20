import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { Prisma } from "../generated/client";
import { ok, fail } from "../common/response";
import { provisionNewClient } from "../provisioning/provisioning.service";
import { logSuperAdminAction } from "../audit/audit.service";
import { getEffectiveEntitlements } from "../guards/entitlement.guard";
import { env } from "../config/env";
import { createPasswordResetOtp } from "../auth/password-reset.service";
import { sendClientWelcomeEmail } from "../email/email.service";
import { purgeClientData } from "../provisioning/client-purge.service";
import { collectSystemTelemetry } from "../telemetry/telemetry.service";

export const superAdminRouter = Router();

// --- System Health & Server Telemetry ---------------------------------------
superAdminRouter.get("/system-health", async (_req, res, next) => {
  try {
    const telemetry = await collectSystemTelemetry();
    return ok(res, telemetry);
  } catch (err) {
    next(err);
  }
});

// --- Dashboard summary -----------------------------------------------------
superAdminRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [total, active, expiringSoon, grace, locked, deleted, pendingPayments] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { subscriptionStatus: "ACTIVE" } }),
      prisma.client.count({ where: { subscriptionStatus: "EXPIRING_SOON" } }),
      prisma.client.count({ where: { subscriptionStatus: "GRACE" } }),
      prisma.client.count({ where: { subscriptionStatus: "LOCKED" } }),
      prisma.client.count({ where: { subscriptionStatus: "DELETED" } }),
      prisma.paymentNotice.count({ where: { status: "PENDING" } }),
    ]);

    return ok(res, { total, active, expiringSoon, grace, locked, deleted, pendingPayments });
  } catch (err) {
    next(err);
  }
});

// --- Clients ----------------------------------------------------------------
superAdminRouter.get("/clients", async (_req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { subscriptionStatus: { not: "DELETED" } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return ok(res, clients);
  } catch (err) {
    next(err);
  }
});

superAdminRouter.get("/clients/:id", async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { plan: true, paymentLogs: { orderBy: { date: "desc" } }, paymentNotices: { orderBy: { createdAt: "desc" } } },
    });
    if (!client) return fail(res, 404, "Client not found", "NOT_FOUND");
    const effectiveEntitlements = getEffectiveEntitlements(client);
    return ok(res, { ...client, effectiveEntitlements });
  } catch (err) {
    next(err);
  }
});

const updateEntitlementsSchema = z.object({
  entitlements: z.record(z.boolean().nullable()),
});

superAdminRouter.patch("/clients/:id/entitlements", async (req, res, next) => {
  try {
    const { entitlements } = updateEntitlementsSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: req.params.id }, include: { plan: true } });
    if (!client) return fail(res, 404, "Client not found", "NOT_FOUND");

    const currentOverrides: Record<string, boolean> =
      client.customEntitlements && typeof client.customEntitlements === "object"
        ? (client.customEntitlements as Record<string, boolean>)
        : {};

    const updatedOverrides: Record<string, boolean> = { ...currentOverrides };
    for (const [key, val] of Object.entries(entitlements)) {
      if (val === null) {
        delete updatedOverrides[key];
      } else if (typeof val === "boolean") {
        updatedOverrides[key] = val;
      }
    }

    const cleanedOverrides = Object.keys(updatedOverrides).length > 0 ? updatedOverrides : null;

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: { customEntitlements: cleanedOverrides ? cleanedOverrides : Prisma.DbNull },
      include: { plan: true },
    });

    const effectiveEntitlements = getEffectiveEntitlements(updated);

    await logSuperAdminAction({
      actorId: req.auth!.sub,
      actorEmail: "super-admin",
      action: "UPDATE_CLIENT_ENTITLEMENT_OVERRIDES",
      targetClientId: client.id,
      metadata: {
        previousOverrides: client.customEntitlements,
        newOverrides: cleanedOverrides,
        effectiveEntitlements,
      },
    });

    return ok(res, { client: updated, effectiveEntitlements }, "Client feature overrides updated");
  } catch (err) {
    next(err);
  }
});

superAdminRouter.post("/clients/:id/entitlements/reset", async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({ where: { id: req.params.id }, include: { plan: true } });
    if (!client) return fail(res, 404, "Client not found", "NOT_FOUND");

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: { customEntitlements: Prisma.DbNull },
      include: { plan: true },
    });

    const effectiveEntitlements = getEffectiveEntitlements(updated);

    await logSuperAdminAction({
      actorId: req.auth!.sub,
      actorEmail: "super-admin",
      action: "RESET_CLIENT_ENTITLEMENT_OVERRIDES",
      targetClientId: client.id,
      metadata: {
        previousOverrides: client.customEntitlements,
        effectiveEntitlements,
      },
    });

    return ok(res, { client: updated, effectiveEntitlements }, "Client feature overrides reset to plan defaults");
  } catch (err) {
    next(err);
  }
});

superAdminRouter.get("/plans", async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceInPaise: "asc" } });
    return ok(res, plans);
  } catch (err) {
    next(err);
  }
});

superAdminRouter.patch("/clients/:id/plan", async (req, res, next) => {
  try {
    const { planId } = z.object({ planId: z.string().min(1) }).parse(req.body);
    const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) return fail(res, 400, "Plan not found or inactive", "PLAN_NOT_AVAILABLE");
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) return fail(res, 404, "Client not found", "NOT_FOUND");
    const updated = await prisma.client.update({ where: { id: client.id }, data: { planId }, include: { plan: true } });
    await logSuperAdminAction({ actorId: req.auth!.sub, actorEmail: "super-admin", action: "CHANGE_CLIENT_PLAN", targetClientId: client.id, metadata: { fromPlanId: client.planId, toPlanId: plan.id } });
    return ok(res, updated, "Client plan updated");
  } catch (err) {
    next(err);
  }
});

const createClientSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  planId: z.string(),
  subscriptionStart: z.coerce.date(),
  subscriptionExpiry: z.coerce.date(),
});

superAdminRouter.post("/clients", async (req, res, next) => {
  try {
    const input = createClientSchema.parse(req.body);
    const { client, adminUser, temporaryPassword } = await provisionNewClient({
      ...input,
      actorId: req.auth!.sub,
      actorEmail: "super-admin",
    });

    // Resolve plan name for the email template
    const plan = await prisma.plan.findUnique({ where: { id: input.planId } });

    // Generate a 24-hour onboarding reset OTP code
    const resetOtpCode = await createPasswordResetOtp(adminUser.id, 24 * 60);

    // Client's dedicated subdomain URL
    const clientBaseUrl = client.subdomain
      ? `https://${client.subdomain}.digiinksolutions.com`
      : env.appUrl;

    const resetUrl = `${clientBaseUrl}/reset-password?email=${encodeURIComponent(client.email)}&otp=${resetOtpCode}`;
    const loginUrl = `${clientBaseUrl}/login?email=${encodeURIComponent(client.email)}`;

    // Dispatch welcome email (safe in dev mode: logs and returns simulated=true)
    let emailResult: { success: boolean; simulated?: boolean; error?: string } = { success: false };
    try {
      emailResult = await sendClientWelcomeEmail({
        to: client.email,
        ownerName: client.ownerName,
        businessName: client.businessName,
        clientCode: client.clientCode,
        planName: plan?.name ?? "Standard Plan",
        subscriptionExpiry: client.subscriptionExpiry,
        temporaryPassword,
        resetOtpCode,
        resetUrl,
        loginUrl,
      });
    } catch (emailErr: any) {
      console.error("[super-admin:client-welcome-email:error]", emailErr);
      emailResult = { success: false, error: emailErr.message };
    }

    await logSuperAdminAction({
      actorId: req.auth!.sub,
      actorEmail: "super-admin",
      action: "SEND_CLIENT_WELCOME_EMAIL",
      targetClientId: client.id,
      metadata: {
        email: client.email,
        emailResult,
        resetUrl,
        loginUrl,
      },
    });

    return ok(res, {
      client,
      temporaryPassword,
      resetOtpCode,
      resetUrl,
      loginUrl,
      emailSent: emailResult.success,
      emailSimulated: emailResult.simulated ?? false,
    }, "Client created and welcome email dispatched");
  } catch (err) {
    next(err);
  }
});

superAdminRouter.post("/clients/:id/activate", async (req, res, next) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { subscriptionStatus: "ACTIVE", lockedAt: null },
    });
    await logSuperAdminAction({ actorId: req.auth!.sub, actorEmail: "super-admin", action: "ACTIVATE_CLIENT", targetClientId: client.id });
    return ok(res, client);
  } catch (err) {
    next(err);
  }
});

superAdminRouter.post("/clients/:id/deactivate", async (req, res, next) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { subscriptionStatus: "LOCKED", lockedAt: new Date() },
    });
    await logSuperAdminAction({ actorId: req.auth!.sub, actorEmail: "super-admin", action: "DEACTIVATE_CLIENT", targetClientId: client.id });
    return ok(res, client);
  } catch (err) {
    next(err);
  }
});

superAdminRouter.post("/clients/:id/extend-grace", async (req, res, next) => {
  try {
    const { days } = z.object({ days: z.number().int().positive() }).parse(req.body);
    const client = await prisma.client.findUniqueOrThrow({ where: { id: req.params.id } });
    const base = client.graceEndsAt ?? new Date();
    const newGraceEndsAt = new Date(base);
    newGraceEndsAt.setDate(newGraceEndsAt.getDate() + days);

    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: { graceEndsAt: newGraceEndsAt, subscriptionStatus: "GRACE", lockedAt: null },
    });
    await logSuperAdminAction({ actorId: req.auth!.sub, actorEmail: "super-admin", action: "EXTEND_GRACE", targetClientId: client.id, metadata: { days } });
    return ok(res, updated, "Grace period extended");
  } catch (err) {
    next(err);
  }
});

// Completely purge all client data from database and remove client
superAdminRouter.post("/clients/:id/delete", async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) return fail(res, 404, "Client not found", "NOT_FOUND");

    await purgeClientData(client.id);

    await logSuperAdminAction({
      actorId: req.auth!.sub,
      actorEmail: "super-admin",
      action: "PURGE_DELETE_CLIENT",
      targetClientId: undefined,
      metadata: {
        deletedClientId: client.id,
        deletedClientCode: client.clientCode,
        deletedBusinessName: client.businessName,
        deletedEmail: client.email,
      },
    });

    return ok(res, { id: client.id, clientCode: client.clientCode }, "Client and all associated database records permanently deleted");
  } catch (err) {
    next(err);
  }
});

// Delete a user belonging to a client and completely wipe their authentication and references
superAdminRouter.delete("/clients/:id/users/:userId", async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.userId, clientId: req.params.id },
    });
    if (!user) return fail(res, 404, "User not found under this client", "NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      // 1. Unassign any enquiries assigned to this staff
      await tx.enquiry.updateMany({
        where: { assignedToId: user.id },
        data: { assignedToId: null },
      });

      // 2. Reassign follow-ups to client admin or delete if none
      const fallbackAdmin = await tx.user.findFirst({
        where: { clientId: req.params.id, isClientAdmin: true, id: { not: user.id } },
      });
      if (fallbackAdmin) {
        await tx.followUp.updateMany({
          where: { loggedById: user.id },
          data: { loggedById: fallbackAdmin.id },
        });
      } else {
        await tx.followUp.deleteMany({
          where: { loggedById: user.id },
        });
      }

      // 3. Nullify audit log user references
      await tx.auditLog.updateMany({
        where: { userId: user.id },
        data: { userId: null },
      });

      // 4. Delete login and password reset OTPs
      await tx.loginOtp.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetOtp.deleteMany({ where: { userId: user.id } });

      // 5. Hard delete user record
      await tx.user.delete({ where: { id: user.id } });
    });

    await logSuperAdminAction({
      actorId: req.auth!.sub,
      actorEmail: "super-admin",
      action: "DELETE_CLIENT_USER",
      targetClientId: req.params.id,
      metadata: { deletedUserId: user.id, email: user.email, name: user.name },
    });

    return ok(res, {}, "User permanently deleted from database and client");
  } catch (err) {
    next(err);
  }
});

const confirmPaymentSchema = z.object({
  amountInPaise: z.number().int().positive(),
  date: z.coerce.date(),
  mode: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"]),
  reference: z.string().optional(),
  note: z.string().optional(),
  newSubscriptionExpiry: z.coerce.date(),
});

superAdminRouter.post("/clients/:id/confirm-payment", async (req, res, next) => {
  try {
    const input = confirmPaymentSchema.parse(req.body);
    const { newSubscriptionExpiry, ...paymentData } = input;
    const clientId = req.params.id;

    const [paymentLog, client] = await prisma.$transaction([
      prisma.paymentLog.create({ data: { clientId, ...paymentData, confirmedBy: req.auth!.sub } }),
      prisma.client.update({
        where: { id: clientId },
        data: { subscriptionStatus: "ACTIVE", subscriptionExpiry: newSubscriptionExpiry, graceEndsAt: null, lockedAt: null },
      }),
    ]);

    await prisma.paymentNotice.updateMany({
      where: { clientId, status: "PENDING" },
      data: { status: "CONFIRMED", reviewedAt: new Date(), reviewedBy: req.auth!.sub },
    });

    await logSuperAdminAction({
      actorId: req.auth!.sub, actorEmail: "super-admin", action: "CONFIRM_PAYMENT",
      targetClientId: clientId, metadata: { amountInPaise: input.amountInPaise, mode: input.mode },
    });

    return ok(res, { paymentLog, client }, "Payment confirmed, access restored");
  } catch (err) {
    next(err);
  }
});

// --- Payment notices ----------------------------------------------------------
superAdminRouter.get("/payment-notices", async (req, res, next) => {
  try {
    const status = (req.query.status as string) ?? "PENDING";
    const notices = await prisma.paymentNotice.findMany({
      where: { status },
      include: { client: { select: { businessName: true, email: true, clientCode: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok(res, notices);
  } catch (err) {
    next(err);
  }
});

superAdminRouter.post("/payment-notices/:id/dismiss", async (req, res, next) => {
  try {
    const notice = await prisma.paymentNotice.update({
      where: { id: req.params.id },
      data: { status: "DISMISSED", reviewedAt: new Date(), reviewedBy: req.auth!.sub },
    });
    return ok(res, notice);
  } catch (err) {
    next(err);
  }
});

// --- Usage statistics -----------------------------------------------------------
superAdminRouter.get("/clients/:id/usage", async (req, res, next) => {
  try {
    const clientId = req.params.id;
    const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [userCount, enquiriesThisMonth, plan] = await Promise.all([
      prisma.user.count({ where: { clientId, isActive: true } }),
      prisma.enquiry.count({ where: { clientId, createdAt: { gte: startOfMonth } } }),
      prisma.plan.findUnique({ where: { id: client.planId } }),
    ]);

    return ok(res, {
      users: { used: userCount, limit: plan?.maxUsers ?? null },
      enquiriesThisMonth: { used: enquiriesThisMonth, limit: plan?.maxEnquiriesPerMonth ?? null },
    });
  } catch (err) {
    next(err);
  }
});

// --- Staff (per client, Super Admin support view) --------------------------
superAdminRouter.get("/clients/:id/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { clientId: req.params.id },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    });
    return ok(res, users.map(({ passwordHash, ...safe }) => safe));
  } catch (err) {
    next(err);
  }
});

superAdminRouter.post("/clients/:id/users/:userId/force-password-reset", async (req, res, next) => {
  try {
    const { generateTemporaryPassword, hashPassword } = await import("../auth/password");
    const tempPassword = generateTemporaryPassword();
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
    });
    await logSuperAdminAction({
      actorId: req.auth!.sub, actorEmail: "super-admin", action: "FORCE_PASSWORD_RESET",
      targetClientId: req.params.id, metadata: { userId: user.id },
    });
    return ok(res, { temporaryPassword: tempPassword }, "Password reset — share the temporary password with the user");
  } catch (err) {
    next(err);
  }
});

// --- Plan manager -------------------------------------------------------------
superAdminRouter.get("/plans", async (_req, res, next) => {
  try {
    return ok(res, await prisma.plan.findMany());
  } catch (err) {
    next(err);
  }
});

const upsertPlanSchema = z.object({
  name: z.string(),
  priceInPaise: z.number().int().nonnegative(),
  entitlements: z.record(z.boolean()),
  maxUsers: z.number().int().nullable().optional(),
  maxEnquiriesPerMonth: z.number().int().nullable().optional(),
  maxBranches: z.number().int().nullable().optional(),
});

superAdminRouter.post("/plans", async (req, res, next) => {
  try {
    const input = upsertPlanSchema.parse(req.body);
    const plan = await prisma.plan.create({ data: input });
    await logSuperAdminAction({ actorId: req.auth!.sub, actorEmail: "super-admin", action: "CREATE_PLAN", metadata: { planId: plan.id } });
    return ok(res, plan, "Plan created");
  } catch (err) {
    next(err);
  }
});

superAdminRouter.patch("/plans/:id", async (req, res, next) => {
  try {
    const input = upsertPlanSchema.partial().parse(req.body);
    const plan = await prisma.plan.update({ where: { id: req.params.id }, data: input });
    await logSuperAdminAction({ actorId: req.auth!.sub, actorEmail: "super-admin", action: "CHANGE_PLAN", metadata: { planId: plan.id } });
    return ok(res, plan, "Plan updated — takes effect on clients' next request, no redeploy needed");
  } catch (err) {
    next(err);
  }
});

// --- Audit log ----------------------------------------------------------------
superAdminRouter.get("/audit-logs", async (_req, res, next) => {
  try {
    const logs = await prisma.superAdminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return ok(res, logs);
  } catch (err) {
    next(err);
  }
});
