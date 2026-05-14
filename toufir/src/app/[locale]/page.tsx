import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/nav";
import { ShoppingBasket, Users, Shield, MessageCircle, MapPin, CheckCircle2 } from "lucide-react";

export default async function HomePage() {
  const t = await getTranslations("landing");

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container py-20 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
                {t("hero.title")}
              </h1>
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                {t("hero.subtitle")}
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link href="/deals">
                    <ShoppingBasket className="h-5 w-5" />
                    {t("hero.cta_browse")}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a
                    href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "212600000000"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {t("hero.cta_whatsapp")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container py-20">
          <h2 className="text-center text-3xl font-bold md:text-4xl">{t("how.title")}</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              { icon: ShoppingBasket, key: "step1" },
              { icon: Users, key: "step2" },
              { icon: CheckCircle2, key: "step3" },
              { icon: MapPin, key: "step4" },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="rounded-xl border bg-card p-6 text-center">
                <Icon className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 font-semibold">{t(`how.${key}_title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`how.${key}_desc`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section className="bg-muted/40 py-20">
          <div className="container">
            <h2 className="text-center text-3xl font-bold md:text-4xl">{t("trust.title")}</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { icon: Shield, key: "escrow" },
                { icon: MapPin, key: "local" },
                { icon: MessageCircle, key: "darija" },
              ].map(({ icon: Icon, key }) => (
                <div key={key} className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-base">{t(`trust.${key}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t py-10 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Toufir · Made in Morocco 🇲🇦
        </footer>
      </main>
    </>
  );
}
