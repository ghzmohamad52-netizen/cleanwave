import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/lib/i18n/routing";
import { dealProgress, formatMAD, timeRemaining } from "@/lib/utils";
import { Calendar, Clock, MapPin, Store, Users } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("deals");
  const locale = (await getLocale()) as Locale;

  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: { product: true, supplier: true, agent: true },
  });
  if (!deal) notFound();

  const name =
    locale === "ar"
      ? deal.product.nameAr
      : locale === "fr"
      ? deal.product.nameFr
      : deal.product.nameEn ?? deal.product.nameFr;
  const description =
    locale === "ar" ? deal.product.descriptionAr : deal.product.descriptionFr;

  const remaining = timeRemaining(deal.closesAt);
  const progress = dealProgress(deal.currentCount, deal.minParticipants);
  const savings = Math.round(
    ((Number(deal.product.retailPrice) - Number(deal.groupPrice)) /
      Number(deal.product.retailPrice)) *
      100
  );

  return (
    <>
      <Nav />
      <main className="container py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            {deal.product.images.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`${name} ${i + 1}`}
                className="w-full rounded-xl object-cover"
              />
            ))}
          </div>

          <div className="space-y-6">
            <div>
              <Badge variant="success">-{savings}%</Badge>
              <h1 className="mt-2 text-3xl font-bold">{name}</h1>
              <p className="mt-2 text-muted-foreground">{description}</p>
            </div>

            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-primary">
                    {formatMAD(Number(deal.groupPrice))}
                  </span>
                  <span className="text-base text-muted-foreground line-through">
                    {formatMAD(Number(deal.product.retailPrice))}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {deal.product.unit}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {t("participants", {
                        count: deal.currentCount,
                        min: deal.minParticipants,
                      })}
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {t("pickup_at")}: <strong>{deal.pickupLocation}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {t("pickup_date")}:{" "}
                      <strong>
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                          deal.pickupDate
                        )}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {remaining.expired
                        ? t("expired")
                        : t("closes_in", {
                            time: `${remaining.hours}h ${remaining.minutes}m`,
                          })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span>{deal.supplier.businessName}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button asChild size="lg" className="w-full" disabled={remaining.expired}>
              <Link href={`/checkout/${deal.id}`}>{t("join")}</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
