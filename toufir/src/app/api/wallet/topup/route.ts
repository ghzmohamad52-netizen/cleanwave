import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { buildCmiForm } from "@/lib/payments/cmi";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({ amount: z.number().int().min(50).max(10000) });

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  // Pending top-up tracked as a wallet transaction in TOPUP type after CMI callback.
  // We reuse the CMI flow but the "orderId" is a synthetic reference.
  const ref = `topup_${user.id}_${Date.now()}`;
  await prisma.walletTransaction.create({
    data: {
      userId: user.id,
      amount: 0, // Placeholder — credited on callback.
      type: "TOPUP",
      reference: ref,
      description: `Top-up pending (${parsed.data.amount} MAD)`,
    },
  });

  const redirect = buildCmiForm({
    orderId: ref,
    amount: parsed.data.amount,
    email: user.email ?? `${user.id}@phone.toufir.local`,
    phone: user.phone,
    customerName: user.fullName || user.phone,
    lang: (user.language as "ar" | "fr" | "en") ?? "fr",
  });
  return NextResponse.json({ redirect });
}
