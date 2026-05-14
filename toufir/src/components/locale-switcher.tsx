"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/routing";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { Globe } from "lucide-react";

export function LocaleSwitcher() {
  const current = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="relative">
      <select
        aria-label="Language"
        value={current}
        onChange={(e) => router.replace(pathname, { locale: e.target.value as Locale })}
        className="appearance-none rounded-md border bg-background py-1.5 ps-8 pe-2 text-sm"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
      <Globe className="pointer-events-none absolute start-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
