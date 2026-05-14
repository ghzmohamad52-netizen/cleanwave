import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseCmiCallback, verifyCmiCallback } from "@/lib/payments/cmi";
import { holdInEscrow } from "@/lib/payments/escrow";
import { PaymentStatus } from "@prisma/client";

async function handle(req: Request) {
  const form = await req.formData();
  const raw: Record<string, string> = {};
  form.forEach((v, k) => (raw[k] = String(v)));

  if (!verifyCmiCallback(raw)) {
    return NextResponse.redirect(new URL("/payment-error?reason=signature", req.url), 303);
  }
  const parsed = parseCmiCallback(raw);
  const order = await prisma.order.findUnique({ where: { id: parsed.orderId } });
  if (!order) {
    return NextResponse.redirect(new URL("/payment-error?reason=not_found", req.url), 303);
  }

  if (parsed.status === "approved") {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentRef: parsed.authCode },
    });
    await holdInEscrow(order.id);
    return NextResponse.redirect(new URL(`/orders/${order.id}`, req.url), 303);
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: PaymentStatus.FAILED, paymentRef: parsed.procReturnCode },
  });
  return NextResponse.redirect(
    new URL(`/payment-error?reason=${parsed.status}`, req.url),
    303
  );
}

export const POST = handle;
export const GET = handle;
