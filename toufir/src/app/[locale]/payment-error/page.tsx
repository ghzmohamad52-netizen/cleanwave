import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function PaymentErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  return (
    <>
      <Nav />
      <main className="container max-w-md py-10">
        <Card>
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle>Paiement échoué</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Reason: <code>{searchParams.reason ?? "unknown"}</code>
            </p>
            <Button asChild>
              <Link href="/deals">Retour aux offres</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
