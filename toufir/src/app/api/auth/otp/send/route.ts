import { NextResponse } from "next/server";
import { z } from "zod";
import { formatPhoneMA, isValidMoroccanPhone } from "@/lib/utils";
import { issueOtp } from "@/lib/auth/otp";
import { sendOtpSms } from "@/lib/sms/twilio";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import { checkLimit, otpLimiter } from "@/lib/redis";

const schema = z.object({ phone: z.string().min(8) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const phone = formatPhoneMA(parsed.data.phone);
  if (!isValidMoroccanPhone(phone)) {
    return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const { success } = await checkLimit(otpLimiter, `otp:${phone}`);
  if (!success) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const code = await issueOtp(phone);
  const body_text = `Toufir: ${code}\nصالح 5 دقائق · valable 5 min`;

  // Try WhatsApp first, fall back to SMS.
  try {
    await sendWhatsAppText(phone, body_text);
  } catch {
    await sendOtpSms(phone, code);
  }

  return NextResponse.json({ ok: true });
}
