import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMAD } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import { DealStatus, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const t = await getTranslations("order");
  const locale = (await getLocale()) as Locale;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { deal: { include: { product: true } } },
  });
  if (!order) notFound();
  if (order.userId !== user.id) redirect("/deals");

  const name =
    locale === "ar"
      ? order.deal.product.nameAr
      : locale === "fr"
      ? order.deal.product.nameFr
      : order.deal.product.nameEn ?? order.deal.product.nameFr;

  const qrSvg = await QRCode.toString(order.pickupCode, { type: "svg", width: 240, margin: 1 });

  const statusKey =
    order.paymentStatus === PaymentStatus.REFUNDED
      ? "cancelled"
      : order.deal.status === DealStatus.FULFILLED || order.isPickedUp
      ? "fulfilled"
      : order.deal.status === DealStatus.ACTIVATED
      ? "activated"
      : "pending";

  return (
    <>
      <Nav />
      <main className="container max-w-2xl py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">{t("thank_you")}</CardTitle>
            <p className="text-center text-muted-foreground">{name}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <Badge
              variant={
                statusKey === "fulfilled"
                  ? "success"
                  : statusKey === "cancelled"
                  ? "destructive"
                  : "warning"
              }
              className="text-sm"
            >
              {t(`status_${statusKey}`)}
            </Badge>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("pickup_code")}</p>
              <div
                className="mx-auto inline-block rounded-lg bg-white p-4"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="font-mono text-2xl font-bold tracking-widest">
                {order.pickupCode}
              </p>
              <p className="text-xs text-muted-foreground">{t("show_qr")}</p>
            </div>

            <div className="border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span>{order.deal.pickupLocation}</span>
                <span>
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                    order.deal.pickupDate
                  )}
                </span>
              </div>
              <div className="mt-2 flex justify-between font-medium">
                <span>Total</span>
                <span>{formatMAD(Number(order.totalAmount))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
