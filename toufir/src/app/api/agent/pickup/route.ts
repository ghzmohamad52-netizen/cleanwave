import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { releaseEscrow } from "@/lib/payments/escrow";
import { DealStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

const schema = z.object({ pickupCode: z.string().min(4).max(12) });

export async function POST(req: Request) {
  const agent = await requireRole("AGENT");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { pickupCode: parsed.data.pickupCode.toUpperCase() },
    include: { deal: true, user: true },
  });
  if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  if (order.deal.agentId !== agent.id) {
    return NextResponse.json({ error: "WRONG_AGENT" }, { status: 403 });
  }
  if (order.isPickedUp) {
    return NextResponse.json({ error: "ALREADY_PICKED_UP" }, { status: 409 });
  }
  if (order.deal.status !== DealStatus.ACTIVATED && order.deal.status !== DealStatus.FULFILLED) {
    return NextResponse.json({ error: "DEAL_NOT_READY" }, { status: 400 });
  }

  // For COD, settle now: customer paid in cash to agent — credit supplier wallet.
  if (
    order.paymentMethod === PaymentMethod.COD &&
    order.paymentStatus === PaymentStatus.PENDING
  ) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.HELD_IN_ESCROW },
    });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { isPickedUp: true, pickedUpAt: new Date() },
  });
  await releaseEscrow(order.id);

  // Mark deal fulfilled if all orders picked up.
  const remaining = await prisma.order.count({
    where: { dealId: order.dealId, isPickedUp: false },
  });
  if (remaining === 0) {
    await prisma.deal.update({
      where: { id: order.dealId },
      data: { status: DealStatus.FULFILLED },
    });
  }

  return NextResponse.json({ ok: true, customer: order.user.fullName });
}
