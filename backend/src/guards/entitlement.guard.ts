import type { Request, Response, NextFunction } from "express";
import { fail } from "../common/response";

export type EntitlementKey =
  | "enquiry_crm" | "bookings" | "quotation" | "drivers" | "vehicles"
  | "payments" | "basic_reports" | "advanced_reports" | "workflow_automation"
  | "enhanced_controls" | "multi_branch" | "integrations" | "custom_modules";

/**
 * Merges baseline plan entitlements with per-client custom overrides (Beta/VIP customization).
 * Overrides take precedence over the plan baseline.
 */
export function getEffectiveEntitlements(client: any): Record<string, boolean> {
  const planEntitlements: Record<string, boolean> =
    client?.plan?.entitlements && typeof client.plan.entitlements === "object"
      ? (client.plan.entitlements as Record<string, boolean>)
      : {};

  let customOverrides: Record<string, boolean> = {};
  if (client?.customEntitlements) {
    if (typeof client.customEntitlements === "string") {
      try {
        customOverrides = JSON.parse(client.customEntitlements);
      } catch {}
    } else if (typeof client.customEntitlements === "object") {
      customOverrides = client.customEntitlements as Record<string, boolean>;
    }
  }

  const effective: Record<string, boolean> = { ...planEntitlements };
  for (const [key, value] of Object.entries(customOverrides)) {
    if (typeof value === "boolean") {
      effective[key] = value;
    }
  }
  return effective;
}

/**
 * Checks the resolved Client's effective entitlements (plan + per-client overrides)
 * for the given feature flag. Runs on the backend for every protected route.
 */
export function requireEntitlement(feature: EntitlementKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const effective = getEffectiveEntitlements(req.client);

    if (effective[feature] !== true) {
      return fail(res, 403, "You do not have access to this feature", "FEATURE_NOT_ENTITLED");
    }

    return next();
  };
}

export function enforceUsageLimit(limit: number | null | undefined, currentUsage: number): boolean {
  if (limit === null || limit === undefined) return true;
  return currentUsage < limit;
}
