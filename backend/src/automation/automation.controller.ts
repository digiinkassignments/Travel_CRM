import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";
import {
  WORKFLOW_TRIGGER_CATALOG,
  WORKFLOW_ACTION_CATALOG,
  DEFAULT_TRAVEL_RECIPES,
  AVAILABLE_PLACEHOLDERS,
  seedDefaultRecipes,
  executeRuleAction,
} from "./automation.service";

export const automationRouter = Router();

// Workflow Automation is Business+ only (SRS section 6/FR-11).
automationRouter.use(authenticate, scopeTenant(), requireEntitlement("workflow_automation"));

// --- Catalogs & Options ------------------------------------------------------
automationRouter.get("/options", requirePermission("settings", "view"), (_req, res) => {
  return ok(res, {
    triggerTypes: WORKFLOW_TRIGGER_CATALOG,
    actionTypes: WORKFLOW_ACTION_CATALOG,
    defaultRecipes: DEFAULT_TRAVEL_RECIPES,
    placeholders: AVAILABLE_PLACEHOLDERS,
  });
});

// --- List Active / Inactive Rules -------------------------------------------
automationRouter.get("/rules", requirePermission("settings", "view"), async (req, res, next) => {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { clientId: req.clientId! },
      orderBy: { createdAt: "desc" },
    });
    return ok(res, rules);
  } catch (err) {
    next(err);
  }
});

// --- 1-Click Install Essential Travel Recipes -------------------------------
automationRouter.post("/rules/seed-recipes", requirePermission("settings", "add"), async (req, res, next) => {
  try {
    const rules = await seedDefaultRecipes(req.clientId!);
    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "SEED_DEFAULT_AUTOMATION_RECIPES",
      metadata: { count: rules.length },
    });
    return ok(res, rules, "Travel automation recipes installed successfully!");
  } catch (err) {
    next(err);
  }
});

// --- Rule Creation & Edit Schemas --------------------------------------------
const ruleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  triggerType: z.string().min(1, "Trigger type is required"),
  triggerConfig: z.record(z.any()).default({}),
  actionType: z.string().min(1, "Action type is required"),
  actionConfig: z.record(z.any()).default({}),
  isActive: z.boolean().optional(),
});

automationRouter.post("/rules", requirePermission("settings", "add"), async (req, res, next) => {
  try {
    const input = ruleSchema.parse(req.body);
    const rule = await prisma.automationRule.create({
      data: {
        clientId: req.clientId!,
        name: input.name,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig,
        actionType: input.actionType,
        actionConfig: input.actionConfig,
        isActive: input.isActive ?? true,
      },
    });
    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "CREATE_AUTOMATION_RULE",
      target: rule.id,
    });
    return ok(res, rule, "Workflow automation rule created");
  } catch (err) {
    next(err);
  }
});

automationRouter.patch("/rules/:id", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const input = ruleSchema.partial().parse(req.body);
    const existing = await prisma.automationRule.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
    });
    if (!existing) return fail(res, 404, "Rule not found", "NOT_FOUND");

    const rule = await prisma.automationRule.update({
      where: { id: req.params.id },
      data: input,
    });
    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "UPDATE_AUTOMATION_RULE",
      target: rule.id,
    });
    return ok(res, rule, "Rule updated");
  } catch (err) {
    next(err);
  }
});

automationRouter.delete("/rules/:id", requirePermission("settings", "delete"), async (req, res, next) => {
  try {
    const existing = await prisma.automationRule.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
    });
    if (!existing) return fail(res, 404, "Rule not found", "NOT_FOUND");

    await prisma.automationRule.delete({ where: { id: req.params.id } });
    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "DELETE_AUTOMATION_RULE",
      target: req.params.id,
    });
    return ok(res, {}, "Rule deleted");
  } catch (err) {
    next(err);
  }
});

// --- Test Fire an Automation Rule -------------------------------------------
const testRuleSchema = z.object({
  targetId: z.string().optional(),
  testPhone: z.string().optional(),
  testEmail: z.string().email().optional().or(z.literal("")),
});

automationRouter.post("/rules/:id/test", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const rule = await prisma.automationRule.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
    });
    if (!rule) return fail(res, 404, "Rule not found", "NOT_FOUND");

    const input = testRuleSchema.parse(req.body || {});

    // Determine target type and find a suitable candidate if not provided
    let targetType: "ENQUIRY" | "BOOKING" | "PAYMENT" | "TRIP" | "QUOTATION" | "VEHICLE" = "ENQUIRY";
    let targetId = input.targetId;

    if (
      rule.triggerType.startsWith("BOOKING") ||
      rule.triggerType === "PRE_DEPARTURE_REMINDER" ||
      rule.triggerType === "POST_TRIP_FEEDBACK" ||
      rule.triggerType === "PAYMENT_DUE_REMINDER"
    ) {
      targetType = "BOOKING";
      if (!targetId) {
        const sampleBooking = await prisma.booking.findFirst({
          where: { clientId: req.clientId! },
          orderBy: { createdAt: "desc" },
        });
        targetId = sampleBooking?.id;
      }
    } else if (rule.triggerType === "PAYMENT_RECEIVED") {
      targetType = "PAYMENT";
      if (!targetId) {
        const samplePayment = await prisma.payment.findFirst({
          where: { clientId: req.clientId! },
          orderBy: { createdAt: "desc" },
        });
        targetId = samplePayment?.id;
      }
    } else if (rule.triggerType === "DUTY_SLIP_DISPATCHED") {
      targetType = "TRIP";
      if (!targetId) {
        const sampleTrip = await prisma.trip.findFirst({
          where: { clientId: req.clientId! },
          orderBy: { createdAt: "desc" },
        });
        targetId = sampleTrip?.id;
      }
    } else if (rule.triggerType === "VEHICLE_DOCUMENT_EXPIRING") {
      targetType = "VEHICLE";
      if (!targetId) {
        const sampleVehicle = await prisma.vehicle.findFirst({
          where: { clientId: req.clientId! },
          orderBy: { createdAt: "desc" },
        });
        targetId = sampleVehicle?.id;
      }
    } else {
      targetType = "ENQUIRY";
      if (!targetId) {
        const sampleEnquiry = await prisma.enquiry.findFirst({
          where: { clientId: req.clientId! },
          orderBy: { createdAt: "desc" },
        });
        targetId = sampleEnquiry?.id;
      }
    }

    if (!targetId) {
      return fail(
        res,
        400,
        `No existing ${targetType.toLowerCase()} records found in your CRM to run a preview test. Please create at least one record first.`,
        "NO_SAMPLE_DATA"
      );
    }

    await executeRuleAction(
      rule,
      targetType,
      targetId,
      {
        test_phone: input.testPhone,
        test_email: input.testEmail,
      },
      true // isTest = true
    );

    return ok(res, { targetType, targetId }, `Test execution dispatched successfully for "${rule.name}"`);
  } catch (err) {
    next(err);
  }
});

// --- Execution Logs Explorer -------------------------------------------------
automationRouter.get("/logs", requirePermission("settings", "view"), async (req, res, next) => {
  try {
    const { ruleId, channel, status, search, limit = "100" } = req.query as Record<string, string | undefined>;
    const take = Math.min(Math.max(parseInt(limit || "100", 10), 1), 300);

    const logs = await prisma.automationLog.findMany({
      where: {
        clientId: req.clientId!,
        ...(ruleId ? { ruleId } : {}),
        ...(channel ? { channel } : {}),
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { recipient: { contains: search } },
                { message: { contains: search } },
                { targetId: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        rule: {
          select: {
            name: true,
            triggerType: true,
            actionType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    return ok(res, logs);
  } catch (err) {
    next(err);
  }
});
