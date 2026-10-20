import crypto from "crypto";
import { prisma } from "../db/prisma";
import { sendMail } from "../email/email.service";

const OTP_TTL_MINUTES = 10;

function generateSixDigitCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Phase 1 email-only OTP (SRS section 4.3 / FR). Generates a 6-digit code,
 * stores only its hash (never the plain code), and emails it via
 * EmailService. Any previously-unconsumed OTPs for this user are left in
 * place but will simply fail the expiry/consumed check later — no need to
 * invalidate them explicitly.
 */
export async function issueLoginOtp(userId: string, email: string): Promise<void> {
  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.loginOtp.create({
    data: { userId, codeHash: hashCode(code), expiresAt },
  });

  await sendMail(email, "Your Digiink login code", `Your one-time login code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`);
}

export async function verifyLoginOtp(userId: string, code: string): Promise<boolean> {
  const codeHash = hashCode(code);

  const otp = await prisma.loginOtp.findFirst({
    where: { userId, codeHash, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return false;

  await prisma.loginOtp.update({ where: { id: otp.id }, data: { consumed: true } });
  return true;
}
