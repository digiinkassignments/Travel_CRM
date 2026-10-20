import crypto from "crypto";
import { prisma } from "../db/prisma";
import { sendMail } from "../email/email.service";

const RESET_OTP_TTL_MINUTES = 10;

function generateSixDigitCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Creates and stores a password reset OTP in the database and returns the plain 6-digit code.
 */
export async function createPasswordResetOtp(userId: string, ttlMinutes: number = RESET_OTP_TTL_MINUTES): Promise<string> {
  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.passwordResetOtp.create({
    data: { userId, codeHash: hashCode(code), expiresAt },
  });

  return code;
}

/**
 * Issues a password-reset code for either account type (SuperAdminUser or
 * tenant User) — the caller has already resolved `userId` from whichever
 * table matched the submitted email. Stores only the hash, same as login
 * OTP, and emails the plain code.
 */
export async function issuePasswordResetOtp(userId: string, email: string): Promise<void> {
  const code = await createPasswordResetOtp(userId, RESET_OTP_TTL_MINUTES);

  await sendMail(
    email,
    "Your Digiink password reset code",
    `Your password reset code is ${code}. It expires in ${RESET_OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.`
  );
}

export async function verifyPasswordResetOtp(userId: string, code: string): Promise<boolean> {
  const codeHash = hashCode(code);

  const otp = await prisma.passwordResetOtp.findFirst({
    where: { userId, codeHash, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return false;

  await prisma.passwordResetOtp.update({ where: { id: otp.id }, data: { consumed: true } });
  return true;
}
