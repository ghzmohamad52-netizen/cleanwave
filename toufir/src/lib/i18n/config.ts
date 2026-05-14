export const locales = ["ar", "fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
};

export const localeNames: Record<Locale, string> = {
  ar: "العربية",
  fr: "Français",
  en: "English",
};
