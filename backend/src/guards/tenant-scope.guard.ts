import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";
import { fail } from "../common/response";
import { computeEffectiveStatus } from "../subscriptions/subscription-state";
import { getEffectiveEntitlements } from "./entitlement.guard";

/**
 * Replaces the old tenant-DB-resolution guard now that there is a single
 * shared database. This step still does real work though:
 *   1. Loads the Client row (with its Plan) for req.auth.clientId
 *   2. Re-derives the subscription status from dates (never trusts a
 *      possibly-stale cached status column) and checks it against
 *      allowedStatuses
 *   3. Attaches req.client (with plan) so requireEntitlement/requirePermission
 *      can read it, and req.clientId as the mandatory scope for every query
 *      that follows
 *
 * Every controller downstream must filter its Prisma queries by
 * req.clientId. There is no database-level wall anymore — this is the
 * wall, so it must run before every tenant-facing route.
 */
export function scopeTenant(allowedStatuses: string[] = ["ACTIVE", "EXPIRING_SOON", "GRACE"]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.auth?.role !== "CLIENT_USER" || !req.auth.clientId) {
      return fail(res, 403, "Client context required", "FORBIDDEN");
    }

    const client = await prisma.client.findUnique({
      where: { id: req.auth.clientId },
      include: { plan: true },
    });

    if (!client) {
      return fail(res, 404, "Client account not found", "CLIENT_NOT_FOUND");
    }

    const { status } = computeEffectiveStatus({
      subscriptionExpiry: client.subscriptionExpiry,
      currentStatus: client.subscriptionStatus,
      lockedAt: client.lockedAt,
      graceEndsAt: client.graceEndsAt,
    });

    if (!allowedStatuses.includes(status)) {
      return fail(
        res,
        423,
        "Your account is currently locked or deactivated. Please contact support or renew your subscription to restore access.",
        "SUBSCRIPTION_LOCKED"
      );
    }

    (client as any).effectiveEntitlements = getEffectiveEntitlements(client);
    req.client = client;
    req.clientId = client.id;
    return next();
  };
}
