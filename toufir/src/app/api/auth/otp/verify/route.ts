import { NextResponse } from "next/server";
import { z } from "zod";
import { formatPhoneMA, isValidMoroccanPhone } from "@/lib/utils";
import { verifyOtp } from "@/lib/auth/otp";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  phone: z.string().min(8),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const phone = formatPhoneMA(parsed.data.phone);
  if (!isValidMoroccanPhone(phone)) {
    return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const ok = await verifyOtp(phone, parsed.data.code);
  if (!ok) return NextResponse.json({ error: "INVALID_CODE" }, { status: 401 });

  let user = await prisma.user.findUnique({ where: { phone } });
  const isNew = !user || !user.fullName || !user.city;
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        fullName: "",
        city: "",
        isVerified: true,
      },
    });
  } else if (!user.isVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });
  }

  const res = NextResponse.json({ ok: true, isNew });
  res.cookies.set("toufir_uid", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
