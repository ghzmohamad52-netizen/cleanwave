import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { formatPhoneMA } from "@/lib/utils";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function hashCode(code: string, phone: string): string {
  const salt = process.env.JWT_SECRET ?? "toufir-otp";
  return createHash("sha256").update(`${phone}:${code}:${salt}`).digest("hex");
}

export function generateCode(): string {
  return String(randomInt(100000, 999999));
}

export async function issueOtp(rawPhone: string): Promise<string> {
  const phone = formatPhoneMA(rawPhone);
  const code = generateCode();
  await prisma.otpAttempt.create({
    data: {
      phone,
      codeHash: hashCode(code, phone),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  return code;
}

export async function verifyOtp(rawPhone: string, code: string): Promise<boolean> {
  const phone = formatPhoneMA(rawPhone);
  const record = await prisma.otpAttempt.findFirst({
    where: { phone, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;
  if (record.attempts >= MAX_ATTEMPTS) return false;

  const matches = record.codeHash === hashCode(code, phone);
  await prisma.otpAttempt.update({
    where: { id: record.id },
    data: {
      attempts: { increment: 1 },
      consumed: matches,
    },
  });
  return matches;
}
