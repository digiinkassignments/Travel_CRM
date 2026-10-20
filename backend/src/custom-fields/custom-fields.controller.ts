import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";

export const customFieldsRouter = Router();

// Custom Module framework is Enterprise only (SRS section 12/FR-12.3).
// Scoped deliberately to "add custom fields to an existing module" rather
// than an open-ended new-entity builder — see the schema comment on
// CustomFieldDefinition for the reasoning.
customFieldsRouter.use(authenticate, scopeTenant(), requireEntitlement("custom_modules"));

const SUPPORTED_MODULES = ["customers", "enquiries", "bookings"] as const;

customFieldsRouter.get("/definitions", requirePermission("settings", "view"), async (req, res, next) => {
  try {
    const { module } = req.query as Record<string, string | undefined>;
    const definitions = await prisma.customFieldDefinition.findMany({
      where: { clientId: req.clientId!, isActive: true, ...(module ? { module } : {}) },
      orderBy: { createdAt: "asc" },
    });
    return ok(res, definitions);
  } catch (err) {
    next(err);
  }
});

const definitionSchema = z.object({
  module: z.enum(SUPPORTED_MODULES),
  fieldKey: z.string().regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
  label: z.string().min(1),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN"]),
});

customFieldsRouter.post("/definitions", requirePermission("settings", "add"), async (req, res, next) => {
  try {
    const input = definitionSchema.parse(req.body);
    const definition = await prisma.customFieldDefinition.create({ data: { clientId: req.clientId!, ...input } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_CUSTOM_FIELD", target: definition.id });
    return ok(res, definition, "Custom field created");
  } catch (err: any) {
    if (err.code === "P2002") return fail(res, 400, "A field with this key already exists for this module", "DUPLICATE_FIELD_KEY");
    next(err);
  }
});

customFieldsRouter.patch("/definitions/:id", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const input = z.object({ label: z.string().min(1).optional(), isActive: z.boolean().optional() }).parse(req.body);
    const existing = await prisma.customFieldDefinition.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Field not found", "NOT_FOUND");

    const definition = await prisma.customFieldDefinition.update({ where: { id: req.params.id }, data: input });
    return ok(res, definition, "Custom field updated");
  } catch (err) {
    next(err);
  }
});

// --- Values --------------------------------------------------------------------
// Get every custom field + its current value for one record (e.g. one
// customer). Missing values are returned as null rather than omitted, so
// the frontend can render a stable form.
customFieldsRouter.get("/values/:module/:recordId", requirePermission("settings", "view"), async (req, res, next) => {
  try {
    const { module, recordId } = req.params;
    const definitions = await prisma.customFieldDefinition.findMany({ where: { clientId: req.clientId!, module, isActive: true } });
    const values = await prisma.customFieldValue.findMany({
      where: { clientId: req.clientId!, recordId, definitionId: { in: definitions.map((d) => d.id) } },
    });
    const valueByDefinition = new Map(values.map((v) => [v.definitionId, v.value]));

    return ok(res, definitions.map((d) => ({
      definitionId: d.id, fieldKey: d.fieldKey, label: d.label, fieldType: d.fieldType,
      value: valueByDefinition.get(d.id) ?? null,
    })));
  } catch (err) {
    next(err);
  }
});

const setValueSchema = z.object({ definitionId: z.string(), recordId: z.string(), value: z.any() });

customFieldsRouter.post("/values", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const input = setValueSchema.parse(req.body);
    const definition = await prisma.customFieldDefinition.findFirst({ where: { id: input.definitionId, clientId: req.clientId! } });
    if (!definition) return fail(res, 404, "Field definition not found", "NOT_FOUND");

    const value = await prisma.customFieldValue.upsert({
      where: { definitionId_recordId: { definitionId: input.definitionId, recordId: input.recordId } },
      update: { value: input.value },
      create: { clientId: req.clientId!, definitionId: input.definitionId, recordId: input.recordId, value: input.value },
    });
    return ok(res, value, "Value saved");
  } catch (err) {
    next(err);
  }
});
