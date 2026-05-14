import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/lib/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { formatMAD } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const t = await getTranslations("order");
  const tNav = await getTranslations("nav");
  const locale = (await getLocale()) as Locale;

  const [orders, txns] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      include: { deal: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.walletTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <>
      <Nav />
      <main className="container py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{tNav("wallet")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold text-primary">
                {formatMAD(Number(user.walletBalance))}
              </div>
              <ul className="space-y-2 text-sm">
                {txns.map((tx) => (
                  <li key={tx.id} className="flex justify-between">
                    <span className="text-muted-foreground">{tx.description}</span>
                    <span
                      className={Number(tx.amount) >= 0 ? "text-emerald-600" : "text-destructive"}
                    >
                      {Number(tx.amount) >= 0 ? "+" : ""}
                      {formatMAD(Number(tx.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{tNav("orders")}</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">—</p>
              ) : (
                <ul className="divide-y">
                  {orders.map((o) => {
                    const name =
                      locale === "ar"
                        ? o.deal.product.nameAr
                        : o.deal.product.nameFr;
                    return (
                      <li key={o.id} className="py-3">
                        <Link
                          href={`/orders/${o.id}`}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium">{name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat(locale, {
                                dateStyle: "medium",
                              }).format(o.createdAt)}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="font-medium">
                              {formatMAD(Number(o.totalAmount))}
                            </div>
                            <Badge
                              variant={
                                o.isPickedUp
                                  ? "success"
                                  : o.paymentStatus === "REFUNDED"
                                  ? "destructive"
                                  : "warning"
                              }
                            >
                              {o.isPickedUp
                                ? t("status_fulfilled")
                                : t(`status_${o.paymentStatus === "REFUNDED" ? "cancelled" : "pending"}`)}
                            </Badge>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
