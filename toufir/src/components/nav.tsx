import { Link } from "@/lib/i18n/routing";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "./locale-switcher";
import { getSession } from "@/lib/auth/session";
import { Button } from "./ui/button";

export async function Nav() {
  const t = await getTranslations("nav");
  const tApp = await getTranslations("app");
  const user = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-primary">{tApp("name")}</span>
        </Link>

        <nav className="hidden gap-6 md:flex">
          <Link href="/deals" className="text-sm font-medium hover:text-primary">
            {t("deals")}
          </Link>
          <Link href="/pickup-points" className="text-sm font-medium hover:text-primary">
            {t("pickup")}
          </Link>
          <Link href="/become-agent" className="text-sm font-medium hover:text-primary">
            {t("agents")}
          </Link>
          <Link href="/become-supplier" className="text-sm font-medium hover:text-primary">
            {t("suppliers")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          {user ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/account">{user.fullName.split(" ")[0]}</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">{t("login")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
