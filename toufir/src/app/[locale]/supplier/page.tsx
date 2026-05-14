import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMAD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SupplierDashboard() {
  const user = await requireRole("SUPPLIER");

  // Match supplier record by phone (configured during onboarding).
  const supplier = await prisma.supplier.findFirst({
    where: { contactPhone: user.phone },
    include: {
      products: true,
      deals: {
        include: { orders: true, product: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!supplier) {
    return (
      <>
        <Nav />
        <main className="container py-10">
          <Card>
            <CardContent className="p-10 text-center">
              <p className="mb-4 text-muted-foreground">
                Your supplier account is awaiting approval.
              </p>
              <Button asChild>
                <Link href="/become-supplier">Complete application</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const totalGmv = supplier.deals
    .flatMap((d) => d.orders)
    .reduce((s, o) => s + Number(o.totalAmount), 0);
  const activeDeals = supplier.deals.filter((d) => d.status === "OPEN" || d.status === "ACTIVATED");

  return (
    <>
      <Nav />
      <main className="container py-10">
        <h1 className="mb-2 text-3xl font-bold">{supplier.businessName}</h1>
        <p className="mb-6 text-muted-foreground">ICE: {supplier.ice}</p>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="text-2xl font-bold">{supplier.products.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Active deals</p>
              <p className="text-2xl font-bold">{activeDeals.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Total GMV</p>
              <p className="text-2xl font-bold text-primary">{formatMAD(totalGmv)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Commission</p>
              <p className="text-2xl font-bold">{supplier.commissionPct}%</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent deals</CardTitle>
            <Button asChild size="sm">
              <Link href="/supplier/deals/new">+ New deal</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {supplier.deals.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{d.product.nameFr}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.currentCount}/{d.minParticipants} participants ·{" "}
                      {formatMAD(Number(d.groupPrice))}
                    </div>
                  </div>
                  <Badge
                    variant={
                      d.status === "ACTIVATED"
                        ? "success"
                        : d.status === "EXPIRED" || d.status === "CANCELLED"
                        ? "destructive"
                        : "warning"
                    }
                  >
                    {d.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
