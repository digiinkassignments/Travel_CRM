import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requirePermission } from "../guards/rbac.guard";
import { encryptSecret } from "../common/crypto";
import { logTenantAction } from "../audit/audit.service";
import {
  sendWhatsAppMessage,
  recordInboundWhatsAppMessage,
  getOrSeedTemplates,
  resetDefaultTemplates,
} from "./whatsapp.service";

export const whatsappRouter = Router();

// Multi-tenant WhatsApp Suite: Accessible to all authenticated CRM tenant staff
whatsappRouter.use(authenticate, scopeTenant());

// --- Config Endpoints ---
whatsappRouter.get("/config", requirePermission("settings", "view"), async (req, res, next) => {
  try {
    const config = await prisma.whatsAppConfig.findUnique({ where: { clientId: req.clientId! } });
    if (!config) {
      return ok(res, {
        provider: "QUICK_LINK",
        phoneNumberId: "",
        businessAccountId: "",
        webhookVerifyToken: "",
        autoWelcomeEnabled: false,
        autoItineraryShare: false,
        autoCabDispatch: false,
        isActive: false,
        hasAccessToken: false,
      });
    }
    const { accessTokenEncrypted, ...safe } = config;
    return ok(res, { ...safe, hasAccessToken: !!accessTokenEncrypted });
  } catch (err) {
    next(err);
  }
});

const configSchema = z.object({
  provider: z.enum(["QUICK_LINK", "META_CLOUD", "SIMULATED"]).optional(),
  phoneNumberId: z.string().optional().nullable(),
  businessAccountId: z.string().optional().nullable(),
  accessToken: z.string().optional(),
  webhookVerifyToken: z.string().optional().nullable(),
  autoWelcomeEnabled: z.boolean().optional(),
  autoItineraryShare: z.boolean().optional(),
  autoCabDispatch: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

whatsappRouter.post("/config", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const input = configSchema.parse(req.body);
    const { accessToken, ...rest } = input;

    const config = await prisma.whatsAppConfig.upsert({
      where: { clientId: req.clientId! },
      update: {
        ...rest,
        ...(accessToken ? { accessTokenEncrypted: encryptSecret(accessToken) } : {}),
      },
      create: {
        clientId: req.clientId!,
        ...rest,
        accessTokenEncrypted: accessToken ? encryptSecret(accessToken) : null,
      },
    });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "UPDATE_WHATSAPP_CONFIG",
    });

    const { accessTokenEncrypted, ...safe } = config;
    return ok(res, { ...safe, hasAccessToken: !!accessTokenEncrypted }, "WhatsApp settings saved successfully");
  } catch (err) {
    next(err);
  }
});

// --- Template Endpoints ---
whatsappRouter.get("/templates", requirePermission("enquiries", "view"), async (req, res, next) => {
  try {
    const templates = await getOrSeedTemplates(req.clientId!);
    return ok(res, templates);
  } catch (err) {
    next(err);
  }
});

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  category: z.string().min(1, "Category is required"),
  body: z.string().min(1, "Message body is required"),
  isActive: z.boolean().optional(),
});

whatsappRouter.post("/templates", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const input = templateSchema.parse(req.body);
    const template = await prisma.whatsAppTemplate.create({
      data: {
        clientId: req.clientId!,
        name: input.name,
        category: input.category,
        body: input.body,
        isActive: input.isActive ?? true,
        isDefault: false,
      },
    });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "CREATE_WHATSAPP_TEMPLATE",
      target: template.id,
    });

    return ok(res, template, "Template created successfully");
  } catch (err) {
    next(err);
  }
});

whatsappRouter.put("/templates/:id", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const input = templateSchema.partial().parse(req.body);
    const existing = await prisma.whatsAppTemplate.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
    });

    if (!existing) {
      return fail(res, 404, "Template not found", "NOT_FOUND");
    }

    const updated = await prisma.whatsAppTemplate.update({
      where: { id: req.params.id },
      data: input,
    });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "UPDATE_WHATSAPP_TEMPLATE",
      target: updated.id,
    });

    return ok(res, updated, "Template updated successfully");
  } catch (err) {
    next(err);
  }
});

whatsappRouter.delete("/templates/:id", requirePermission("settings", "delete"), async (req, res, next) => {
  try {
    const existing = await prisma.whatsAppTemplate.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
    });

    if (!existing) {
      return fail(res, 404, "Template not found", "NOT_FOUND");
    }

    await prisma.whatsAppTemplate.delete({ where: { id: req.params.id } });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "DELETE_WHATSAPP_TEMPLATE",
      target: req.params.id,
    });

    return ok(res, { id: req.params.id }, "Template deleted");
  } catch (err) {
    next(err);
  }
});

whatsappRouter.post("/templates/reset-defaults", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const templates = await resetDefaultTemplates(req.clientId!);
    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "RESET_WHATSAPP_TEMPLATES",
    });
    return ok(res, templates, "Reset to standard travel templates");
  } catch (err) {
    next(err);
  }
});

// --- Message & Dispatch Endpoints ---
whatsappRouter.get("/messages", requirePermission("enquiries", "view"), async (req, res, next) => {
  try {
    const { enquiryId, page, limit } = req.query as Record<string, string | undefined>;
    const take = Math.min(Number(limit) || 100, 200);
    const skip = ((Number(page) || 1) - 1) * take;

    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where: {
          clientId: req.clientId!,
          ...(enquiryId ? { enquiryId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.whatsAppMessage.count({
        where: {
          clientId: req.clientId!,
          ...(enquiryId ? { enquiryId } : {}),
        },
      }),
    ]);

    return ok(res, { messages, total, page: Number(page) || 1, limit: take });
  } catch (err) {
    next(err);
  }
});

const sendSchema = z.object({
  toNumber: z.string().min(1, "Phone number is required"),
  body: z.string().min(1, "Message text is required"),
  enquiryId: z.string().optional(),
  mode: z.enum(["QUICK_LINK", "META_CLOUD", "AUTO"]).optional(),
});

whatsappRouter.post("/send", requirePermission("enquiries", "edit"), async (req, res, next) => {
  try {
    const input = sendSchema.parse(req.body);
    const result = await sendWhatsAppMessage({
      clientId: req.clientId!,
      toNumber: input.toNumber,
      body: input.body,
      enquiryId: input.enquiryId,
      mode: input.mode,
    });

    if (result.status === "FAILED") {
      return fail(res, 400, result.error || "Failed to dispatch message via Cloud API.", "WHATSAPP_SEND_FAILED");
    }

    const message = result.waUrl
      ? "Ready to send via WhatsApp Web / App"
      : "Message sent successfully via Meta Cloud API";

    return ok(res, result, message);
  } catch (err) {
    next(err);
  }
});

// --- Public Webhook for Meta Cloud API ---
export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get("/:clientId", async (req, res) => {
  const config = await prisma.whatsAppConfig.findUnique({ where: { clientId: req.params.clientId } });
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && config?.webhookVerifyToken && token === config.webhookVerifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

const webhookPayloadSchema = z.object({
  from: z.string(),
  to: z.string().optional(),
  body: z.string(),
});

whatsappWebhookRouter.post("/:clientId", async (req, res, next) => {
  try {
    const input = webhookPayloadSchema.parse(req.body);
    await recordInboundWhatsAppMessage({
      clientId: req.params.clientId,
      fromNumber: input.from,
      toNumber: input.to ?? "unknown",
      body: input.body,
    });
    return res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});
