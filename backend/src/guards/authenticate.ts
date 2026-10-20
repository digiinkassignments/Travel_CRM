import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/tokens";
import { fail } from "../common/response";

/**
 * Step 1 of the chain: verifies the JWT and attaches the decoded payload
 * to req.auth. Every other guard below depends on this having run first.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return fail(res, 401, "Authentication required", "UNAUTHORIZED");
  }

  try {
    const token = header.slice("Bearer ".length);
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return fail(res, 401, "Invalid or expired token", "UNAUTHORIZED");
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role !== "SUPER_ADMIN") {
    return fail(res, 403, "Super Admin access required", "FORBIDDEN");
  }
  return next();
}
