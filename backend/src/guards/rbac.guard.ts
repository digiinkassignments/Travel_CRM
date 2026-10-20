import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";
import { fail } from "../common/response";

type Action = "view" | "add" | "edit" | "delete" | "export";

/**
 * Enforces the per-role module x action permission grid. Requires
 * scopeTenant to have already run (req.clientId set) and req.auth.roleId
 * to identify the caller's Role. The role lookup is scoped by clientId so
 * a role id can never be reused to reach across into another client's data.
 */
export function requirePermission(module: string, action: Action) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.clientId || !req.auth?.roleId) {
      return fail(res, 403, "Role context unavailable", "FORBIDDEN");
    }

    if (req.auth.isClientAdmin) {
      return next();
    }

    const role = await prisma.role.findFirst({ where: { id: req.auth.roleId, clientId: req.clientId } });
    const permissions = (role?.permissionsJson as Record<string, Record<Action, boolean>>) ?? {};
    const modulePermissions = permissions[module];

    if (!modulePermissions?.[action]) {
      return fail(res, 403, `You do not have ${action} access to ${module}`, "PERMISSION_DENIED");
    }

    return next();
  };
}

export function assertNotSelfDeletion(requesterUserId: string, targetUserId: string) {
  if (requesterUserId === targetUserId) {
    throw Object.assign(new Error("You cannot delete your own account"), {
      statusCode: 400,
      code: "SELF_DELETE_FORBIDDEN",
    });
  }
}
