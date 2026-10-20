import type { Request, Response, NextFunction } from "express";
import type { AccessTokenPayload } from "../auth/tokens";
import type { Client } from "../generated/client";

// Augment Express's Request with everything the guard chain progressively
// attaches: auth -> tenant scope (clientId) -> entitlements -> RBAC.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
      client?: Client & { plan?: unknown };
      clientId?: string;
    }
  }
}

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  console.log(`${req.method} ${req.path}`);
  next();
}
