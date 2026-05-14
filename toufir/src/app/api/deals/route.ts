import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DealStatus } from "@prisma/client";
import { apiLimiter, checkLimit } from "@/lib/redis";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { success } = await checkLimit(apiLimiter, `api:deals:${ip}`);
  if (!success) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const url = new URL(req.url);
  const city = url.searchParams.get("city");
  const category = url.searchParams.get("category");
  const take = Math.min(60, parseInt(url.searchParams.get("take") ?? "30", 10));

  const deals = await prisma.deal.findMany({
    where: {
      status: DealStatus.OPEN,
      closesAt: { gt: new Date() },
      ...(category && { product: { category } }),
      ...(city && { OR: [{ pickupLocation: { contains: city, mode: "insensitive" } }] }),
    },
    include: { product: { select: { nameAr: true, nameFr: true, images: true, retailPrice: true, category: true, unit: true } } },
    orderBy: { closesAt: "asc" },
    take,
  });
  return NextResponse.json({ deals });
}
