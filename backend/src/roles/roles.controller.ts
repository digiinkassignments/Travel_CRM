import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";

export const rolesRouter = Router();

rolesRouter.use(authenticate, scopeTenant());

const MODULES = [
  "dashboard", "customers", "enquiries", "quotations", "bookings",
  "trips", "drivers", "vehicles", "payments", "invoices", "reports",
  "staff", "settings",
];

rolesRouter.get("/", requirePermission("staff", "view"), async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({ where: { clientId: req.clientId! }, orderBy: { createdAt: "asc" } });
    return ok(res, roles);
  } catch (err) {
    next(err);
  }
});

const permissionGridSchema = z.record(
  z.object({ view: z.boolean(), add: z.boolean(), edit: z.boolean(), delete: z.boolean(), export: z.boolean() })
);

const createRoleSchema = z.object({
  name: z.string().min(1),
  permissionsJson: permissionGridSchema,
});

// No-code Role Builder (SRS section 26/FR-10) — the Client Admin defines
// unlimited custom roles here, each a module x action grid. RBAC guards
// elsewhere read exactly this JSON at request time.
rolesRouter.post("/", requirePermission("staff", "add"), async (req, res, next) => {
  try {
    const input = createRoleSchema.parse(req.body);
    const role = await prisma.role.create({ data: { clientId: req.clientId!, name: input.name, permissionsJson: input.permissionsJson } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_ROLE", target: role.id });
    return ok(res, role, "Role created");
  } catch (err) {
    next(err);
  }
});

rolesRouter.patch("/:id", requirePermission("staff", "edit"), async (req, res, next) => {
  try {
    const input = createRoleSchema.partial().parse(req.body);
    const existing = await prisma.role.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Role not found", "NOT_FOUND");
    if (existing.isSystemRole) return fail(res, 400, "The built-in Client Admin role cannot be edited", "SYSTEM_ROLE_LOCKED");

    const role = await prisma.role.update({ where: { id: req.params.id }, data: input });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_ROLE", target: role.id });
    return ok(res, role, "Role updated");
  } catch (err) {
    next(err);
  }
});

rolesRouter.delete("/:id", requirePermission("staff", "delete"), async (req, res, next) => {
  try {
    const existing = await prisma.role.findFirst({ where: { id: req.params.id, clientId: req.clientId! }, include: { users: { select: { id: true } } } });
    if (!existing) return fail(res, 404, "Role not found", "NOT_FOUND");
    if (existing.isSystemRole) return fail(res, 400, "The built-in Client Admin role cannot be deleted", "SYSTEM_ROLE_LOCKED");
    if (existing.users.length > 0) return fail(res, 409, "Reassign team members before deleting this role", "ROLE_HAS_USERS");

    await prisma.role.delete({ where: { id: existing.id } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "DELETE_ROLE", target: existing.id });
    return ok(res, {}, "Role deleted");
  } catch (err) {
    next(err);
  }
});

rolesRouter.get("/modules", requirePermission("staff", "view"), (_req, res) => ok(res, MODULES));
