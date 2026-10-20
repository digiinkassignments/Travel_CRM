import { env } from "../config/env";
import type { SubscriptionStatus } from "../generated/client";

/**
 * Pure function that derives the "effective" subscription status from
 * dates, independent of whatever is currently persisted. The cron job in
 * jobs/subscription-lifecycle.job.ts calls this to decide when to transition
 * a client between states; API guards call it to double-check on every
 * request so a stale cached status never grants access it shouldn't.
 */
export function computeEffectiveStatus(params: {
  subscriptionExpiry: Date;
  currentStatus?: SubscriptionStatus | string;
  lockedAt?: Date | null;
  graceEndsAt?: Date | null;
  now?: Date;
}): { status: SubscriptionStatus; graceEndsAt: Date; deleteAt: Date } {
  const now = params.now ?? new Date();
  const expiry = params.subscriptionExpiry;

  const graceEndsAt = params.graceEndsAt ?? addDays(expiry, env.subscription.graceDays);
  const deleteAt = addDays(expiry, env.subscription.deleteAfterDays);
  const expiringSoonFrom = addDays(expiry, -env.subscription.expiringSoonDays);

  let status: SubscriptionStatus;

  // 1. If explicitly DELETED, status is DELETED
  if (params.currentStatus === "DELETED") {
    return { status: "DELETED", graceEndsAt, deleteAt };
  }

  // 2. If manually deactivated/locked by Admin, or past grace period
  if (params.currentStatus === "LOCKED" || params.lockedAt) {
    return { status: "LOCKED", graceEndsAt, deleteAt };
  }

  // 3. Normal time-based derivation
  if (now < expiringSoonFrom) {
    status = "ACTIVE";
  } else if (now < expiry) {
    status = "EXPIRING_SOON";
  } else if (now < graceEndsAt) {
    status = "GRACE";
  } else {
    status = "LOCKED";
  }

  return { status, graceEndsAt, deleteAt };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
