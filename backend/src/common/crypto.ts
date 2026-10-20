import crypto from "crypto";

// Symmetric encryption for secrets stored in the database (currently just
// WhatsApp Business API access tokens — see whatsapp/whatsapp.controller.ts).
// In production, ENCRYPTION_KEY must be a real secret from a secrets
// manager, not the dev fallback below.
const ALGORITHM = "aes-256-gcm";
const KEY = crypto.createHash("sha256").update(process.env.ENCRYPTION_KEY ?? "dev-only-insecure-key").digest();

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buffer = Buffer.from(payload, "base64");
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
