import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DealStatus } from "@prisma/client";
import { refundExpiredDeal } from "@/lib/payments/escrow";

// Vercel cron: 0 * * * *
export async function GET(req: Request) {
  const token = req.headers.get("authorization");
  if (token !== `Bearer ${process.env.CRON_SECRET ?? process.env.JWT_SECRET}`) {
    return new Response("Forbidden", { status: 403 });
  }

  const expiredDeals = await prisma.deal.findMany({
    where: {
      status: DealStatus.OPEN,
      closesAt: { lt: new Date() },
    },
    select: { id: true, currentCount: true, minParticipants: true },
  });

  let refunded = 0;
  let activated = 0;
  for (const d of expiredDeals) {
    if (d.currentCount < d.minParticipants) {
      await refundExpiredDeal(d.id);
      refunded++;
    } else {
      await prisma.deal.update({
        where: { id: d.id },
        data: { status: DealStatus.ACTIVATED },
      });
      activated++;
    }
  }
  return NextResponse.json({ refunded, activated });
}
