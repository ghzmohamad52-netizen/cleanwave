import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { Nav } from "@/components/nav";
import { CheckoutForm } from "./checkout-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMAD } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: { dealId: string } }) {
  const user = await requireUser();
  const t = await getTranslations("checkout");
  const locale = (await getLocale()) as Locale;

  const deal = await prisma.deal.findUnique({
    where: { id: params.dealId },
    include: { product: true },
  });
  if (!deal) notFound();

  const name =
    locale === "ar"
      ? deal.product.nameAr
      : locale === "fr"
      ? deal.product.nameFr
      : deal.product.nameEn ?? deal.product.nameFr;

  return (
    <>
      <Nav />
      <main className="container max-w-2xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <p className="text-muted-foreground">
              {name} — {formatMAD(Number(deal.groupPrice))} / {deal.product.unit}
            </p>
          </CardHeader>
          <CardContent>
            <CheckoutForm
              dealId={deal.id}
              unitPrice={Number(deal.groupPrice)}
              walletBalance={Number(user.walletBalance)}
              labels={{
                quantity: t("quantity"),
                total: t("total"),
                paymentMethod: t("payment_method"),
                methodCard: t("method_card"),
                methodWallet: t("method_wallet"),
                methodCod: t("method_cod"),
                walletBalance: t("wallet_balance", {
                  amount: formatMAD(Number(user.walletBalance)),
                }),
                confirm: t("confirm"),
                terms: t("terms"),
              }}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
