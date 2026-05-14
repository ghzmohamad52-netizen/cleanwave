import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, PaymentMethod, PaymentStatus, DealStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { generatePickupCode } from "@/lib/utils";
import { holdInEscrow } from "@/lib/payments/escrow";
import { debit, InsufficientFundsError } from "@/lib/payments/wallet";
import { buildCmiForm } from "@/lib/payments/cmi";

const schema = z.object({
  dealId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const { dealId, quantity, paymentMethod } = parsed.data;

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) return NextResponse.json({ error: "DEAL_NOT_FOUND" }, { status: 404 });
  if (deal.status !== DealStatus.OPEN || deal.closesAt < new Date()) {
    return NextResponse.json({ error: "DEAL_CLOSED" }, { status: 400 });
  }
  if (deal.maxParticipants && deal.currentCount + quantity > deal.maxParticipants) {
    return NextResponse.json({ error: "DEAL_FULL" }, { status: 400 });
  }

  const totalAmount = new Prisma.Decimal(Number(deal.groupPrice) * quantity);

  // Create order in PENDING state. Pickup code is generated up-front.
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      dealId,
      quantity,
      totalAmount,
      paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      pickupCode: generatePickupCode(),
    },
  });

  if (paymentMethod === PaymentMethod.WALLET) {
    try {
      await debit(
        user.id,
        Number(totalAmount),
        "PURCHASE",
        `Order ${order.id}`,
        order.id
      );
    } catch (err) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      if (err instanceof InsufficientFundsError) {
        return NextResponse.json({ error: "INSUFFICIENT_FUNDS" }, { status: 402 });
      }
      throw err;
    }
    await holdInEscrow(order.id);
    return NextResponse.json({ orderId: order.id });
  }

  if (paymentMethod === PaymentMethod.COD) {
    // No upfront payment. We still hold the participant slot but mark payment status PENDING.
    await holdInEscrow(order.id);
    return NextResponse.json({ orderId: order.id });
  }

  // CMI_CARD — return a signed redirect to the hosted payment page.
  const redirect = buildCmiForm({
    orderId: order.id,
    amount: Number(totalAmount),
    email: user.email ?? `${user.id}@phone.toufir.local`,
    phone: user.phone,
    customerName: user.fullName || user.phone,
    lang: (user.language as "ar" | "fr" | "en") ?? "fr",
  });

  return NextResponse.json({ orderId: order.id, redirect });
}
