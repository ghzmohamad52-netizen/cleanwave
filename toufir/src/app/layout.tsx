import type { Metadata, Viewport } from "next";
import { Inter, Tajawal } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { localeDirection, type Locale } from "@/lib/i18n/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Toufir — توفير", template: "%s · Toufir" },
  description: "Group-buying for Morocco. Wholesale prices in your neighborhood.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Toufir" },
};

export const viewport: Viewport = {
  themeColor: "#006233",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = localeDirection[locale] ?? "ltr";

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${tajawal.variable}`}>
      <body className="min-h-screen bg-background font-sans">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
