import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMAD } from "@/lib/utils";
import { ScanForm } from "./scan-form";

export const dynamic = "force-dynamic";

export default async function AgentDashboard() {
  const user = await requireRole("AGENT");
  if (!user.isVerified) redirect("/");

  const [deals, todaysPickups] = await Promise.all([
    prisma.deal.findMany({
      where: { agentId: user.id, status: { in: ["OPEN", "ACTIVATED"] } },
      include: { product: true, orders: true },
      orderBy: { pickupDate: "asc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: {
        deal: {
          agentId: user.id,
          pickupDate: { gte: new Date(new Date().toDateString()) },
        },
        isPickedUp: false,
      },
      include: { user: true, deal: { include: { product: true } } },
      take: 50,
    }),
  ]);

  const totalRevenue = deals
    .flatMap((d) => d.orders)
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <>
      <Nav />
      <main className="container py-10">
        <h1 className="mb-6 text-3xl font-bold">Agent dashboard</h1>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Active deals</p>
              <p className="text-3xl font-bold">{deals.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Pending pickups</p>
              <p className="text-3xl font-bold">{todaysPickups.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-3xl font-bold text-primary">{formatMAD(totalRevenue)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Scan pickup code</CardTitle>
            </CardHeader>
            <CardContent>
              <ScanForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending pickups</CardTitle>
            </CardHeader>
            <CardContent>
              {todaysPickups.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No pickups today</p>
              ) : (
                <ul className="divide-y">
                  {todaysPickups.map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-medium">{o.user.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.deal.product.nameFr} × {o.quantity}
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {o.pickupCode}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
