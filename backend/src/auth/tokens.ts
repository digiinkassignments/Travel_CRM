import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;        // user id (within tenant DB) or super-admin id
  clientId?: string;  // absent for Super Admin tokens
  role: "SUPER_ADMIN" | "CLIENT_USER";
  roleId?: string;    // tenant Role.id, for RBAC guard
  isClientAdmin?: boolean;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn as any });
}

export interface OtpPendingPayload {
  sub: string;      // userId
  clientId: string;
  purpose: "LOGIN_OTP";
}

// Short-lived token that only proves "this person already gave the right
// password" — it carries no access rights and cannot be used against any
// authenticate() guard. /auth/verify-otp exchanges it for real tokens once
// the emailed code is confirmed.
export function signOtpPendingToken(payload: Omit<OtpPendingPayload, "purpose">): string {
  return jwt.sign({ ...payload, purpose: "LOGIN_OTP" }, env.jwt.accessSecret, { expiresIn: "10m" });
}

export function verifyOtpPendingToken(token: string): OtpPendingPayload {
  const decoded = jwt.verify(token, env.jwt.accessSecret) as OtpPendingPayload;
  if (decoded.purpose !== "LOGIN_OTP") {
    throw new Error("Invalid token purpose");
  }
  return decoded;
}

export function signRefreshToken(payload: Pick<AccessTokenPayload, "sub" | "clientId" | "role">): string {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn as any });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): Pick<AccessTokenPayload, "sub" | "clientId" | "role"> {
  return jwt.verify(token, env.jwt.refreshSecret) as Pick<AccessTokenPayload, "sub" | "clientId" | "role">;
}
