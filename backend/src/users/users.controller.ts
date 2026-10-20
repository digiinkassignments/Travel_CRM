import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requirePermission, assertNotSelfDeletion } from "../guards/rbac.guard";
import { hashPassword, generateTemporaryPassword } from "../auth/password";
import { logTenantAction } from "../audit/audit.service";
import { enforceUsageLimit } from "../guards/entitlement.guard";

export const usersRouter = Router();

usersRouter.use(authenticate, scopeTenant());

// Lightweight roster used everywhere a staff-assignment dropdown is
// needed (enquiry assignment, driver/trip assignment later). Deliberately
// has a looser permission bar than the full Staff Management screen —
// any active user can see who their colleagues are to assign work to them.
usersRouter.get("/", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { clientId: req.clientId!, isActive: true },
      select: { id: true, name: true, email: true, isClientAdmin: true, roleId: true, branchId: true },
      orderBy: { name: "asc" },
    });
    return ok(res, users);
  } catch (err) {
    next(err);
  }
});

// --- Full Staff Management (SRS section 28) -----------------------------------
usersRouter.get("/staff", requirePermission("staff", "view"), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { clientId: req.clientId!, deletedAt: null },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    });
    return ok(res, users.map(({ passwordHash, ...safe }) => safe));
  } catch (err) {
    next(err);
  }
});

const createStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  roleId: z.string(),
});

usersRouter.post("/staff", requirePermission("staff", "add"), async (req, res, next) => {
  try {
    const input = createStaffSchema.parse(req.body);

    const plan = (req.client as any).plan;
    if (plan?.maxUsers !== null && plan?.maxUsers !== undefined) {
      const currentCount = await prisma.user.count({ where: { clientId: req.clientId!, isActive: true } });
      if (!enforceUsageLimit(plan.maxUsers, currentCount)) {
        return fail(res, 403, "You've reached your plan's user limit. Upgrade to add more staff.", "USAGE_LIMIT_REACHED");
      }
    }

    const role = await prisma.role.findFirst({ where: { id: input.roleId, clientId: req.clientId! } });
    if (!role) return fail(res, 400, "Role not found", "BAD_REQUEST");

    const temporaryPassword = generateTemporaryPassword();
    const user = await prisma.user.create({
      data: {
        clientId: req.clientId!,
        name: input.name,
        email: input.email,
        roleId: input.roleId,
        passwordHash: await hashPassword(temporaryPassword),
        mustChangePassword: true,
      },
    });

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_USER", target: user.id });
    return ok(res, { user: { ...user, passwordHash: undefined }, temporaryPassword }, "Staff member created");
  } catch (err) {
    next(err);
  }
});

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
});

usersRouter.patch("/staff/:id", requirePermission("staff", "edit"), async (req, res, next) => {
  try {
    const input = updateStaffSchema.parse(req.body);
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Staff member not found", "NOT_FOUND");

    // Deactivating a staff account must not deactivate the client itself,
    // and never deactivates the Client Admin through this generic route —
    // that requires the dedicated (nonexistent-by-design) transfer flow.
    if (input.isActive === false && existing.isClientAdmin) {
      return fail(res, 400, "The Client Admin account cannot be deactivated", "CANNOT_DEACTIVATE_ADMIN");
    }

    const user = await prisma.user.update({ where: { id: req.params.id }, data: input });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_USER", target: user.id });
    return ok(res, { ...user, passwordHash: undefined }, "Staff member updated");
  } catch (err) {
    next(err);
  }
});

// Hard-blocked at the API layer regardless of what the frontend shows,
// per SRS section 27/FR-10.3 — Client Admin can never delete themselves.
usersRouter.delete("/staff/:id", requirePermission("staff", "delete"), async (req, res, next) => {
  try {
    assertNotSelfDeletion(req.auth!.sub, req.params.id);

    const existing = await prisma.user.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Staff member not found", "NOT_FOUND");
    if (existing.isClientAdmin) return fail(res, 400, "The Client Admin account cannot be deleted", "CANNOT_DELETE_ADMIN");

    await prisma.$transaction(async (tx) => {
      // 1. Unassign any enquiries assigned to this staff member
      await tx.enquiry.updateMany({
        where: { assignedToId: existing.id },
        data: { assignedToId: null },
      });

      // 2. Reassign follow-ups to the Client Admin so notes/interactions are preserved
      const clientAdmin = await tx.user.findFirst({
        where: { clientId: req.clientId!, isClientAdmin: true },
      });
      if (clientAdmin && clientAdmin.id !== existing.id) {
        await tx.followUp.updateMany({
          where: { loggedById: existing.id },
          data: { loggedById: clientAdmin.id },
        });
      } else {
        await tx.followUp.deleteMany({
          where: { loggedById: existing.id },
        });
      }

      // 3. Nullify audit log user references
      await tx.auditLog.updateMany({
        where: { userId: existing.id },
        data: { userId: null },
      });

      // 4. Delete login and password reset OTPs
      await tx.loginOtp.deleteMany({ where: { userId: existing.id } });
      await tx.passwordResetOtp.deleteMany({ where: { userId: existing.id } });

      // 5. Hard delete user record from database
      await tx.user.delete({ where: { id: existing.id } });
    });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth!.sub,
      action: "DELETE_USER",
      target: req.params.id,
      metadata: { deletedEmail: existing.email, deletedName: existing.name },
    });

    return ok(res, {}, "Staff member and authentication data permanently deleted");
  } catch (err: any) {
    if (err.code === "SELF_DELETE_FORBIDDEN") {
      return fail(res, 400, err.message, err.code);
    }
    next(err);
  }
});
