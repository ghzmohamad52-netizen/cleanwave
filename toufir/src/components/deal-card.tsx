import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import { formatMAD, dealProgress, timeRemaining } from "@/lib/utils";
import { Clock, MapPin, Users } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/config";

export interface DealCardData {
  id: string;
  productName: { ar: string; fr: string; en?: string | null };
  image?: string | null;
  retailPrice: number;
  groupPrice: number;
  currentCount: number;
  minParticipants: number;
  closesAt: string | Date;
  pickupLocation: string;
}

export async function DealCard({ deal }: { deal: DealCardData }) {
  const t = await getTranslations("deals");
  const locale = (await getLocale()) as Locale;
  const progress = dealProgress(deal.currentCount, deal.minParticipants);
  const remaining = timeRemaining(deal.closesAt);
  const name =
    locale === "ar"
      ? deal.productName.ar
      : locale === "fr"
      ? deal.productName.fr
      : deal.productName.en ?? deal.productName.fr;
  const savingsPct = Math.round(
    ((deal.retailPrice - deal.groupPrice) / deal.retailPrice) * 100
  );

  return (
    <Card className="overflow-hidden transition hover:shadow-lg">
      {deal.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={deal.image} alt={name} className="h-44 w-full object-cover" />
      )}
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold leading-snug">{name}</h3>
          <Badge variant="success">-{savingsPct}%</Badge>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">{formatMAD(deal.groupPrice)}</span>
          <span className="text-sm text-muted-foreground line-through">
            {formatMAD(deal.retailPrice)}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {t("participants", { count: deal.currentCount, min: deal.minParticipants })}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {deal.pickupLocation}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {remaining.expired
              ? t("expired")
              : t("closes_in", { time: `${remaining.hours}h ${remaining.minutes}m` })}
          </span>
        </div>

        <Button asChild className="w-full" disabled={remaining.expired}>
          <Link href={`/deals/${deal.id}`}>{remaining.expired ? t("expired") : t("join")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
