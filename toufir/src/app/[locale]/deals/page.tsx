import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { DealCard } from "@/components/deal-card";
import { Nav } from "@/components/nav";
import { DealStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { city?: string; category?: string };
}) {
  const t = await getTranslations("deals");

  const deals = await prisma.deal.findMany({
    where: {
      status: DealStatus.OPEN,
      closesAt: { gt: new Date() },
      ...(searchParams.category && { product: { category: searchParams.category } }),
    },
    include: { product: true },
    orderBy: [{ closesAt: "asc" }],
    take: 60,
  });

  return (
    <>
      <Nav />
      <main className="container py-10">
        <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>

        {deals.length === 0 ? (
          <p className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            {t("expired")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={{
                  id: deal.id,
                  productName: {
                    ar: deal.product.nameAr,
                    fr: deal.product.nameFr,
                    en: deal.product.nameEn,
                  },
                  image: deal.product.images[0] ?? null,
                  retailPrice: Number(deal.product.retailPrice),
                  groupPrice: Number(deal.groupPrice),
                  currentCount: deal.currentCount,
                  minParticipants: deal.minParticipants,
                  closesAt: deal.closesAt,
                  pickupLocation: deal.pickupLocation,
                }}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
