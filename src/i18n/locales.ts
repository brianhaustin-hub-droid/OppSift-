export type LocaleDirection = "ltr" | "rtl";

export type LocaleDefinition = {
  code: string;
  label: string;
  nativeLabel: string;
  dir: LocaleDirection;
};

/**
 * Languages OppSift ships interface translations for. `label` is the English
 * name used in ARIA text, `nativeLabel` is what the picker shows so a reader
 * recognises their own language immediately.
 */
export const locales: readonly LocaleDefinition[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", dir: "ltr" },
  { code: "es", label: "Spanish", nativeLabel: "Español", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
] as const;

export type LocaleCode = (typeof locales)[number]["code"];

export const defaultLocale: LocaleCode = "en";

export function isLocaleCode(value: string | null | undefined): value is LocaleCode {
  return locales.some((locale) => locale.code === value);
}

export function localeDefinition(code: LocaleCode): LocaleDefinition {
  return locales.find((locale) => locale.code === code) ?? locales[0];
}

/**
 * Maps a BCP 47 tag ("pt-BR", "es-419", "zh-Hans") onto a supported UI locale.
 * Unsupported languages intentionally fall back to English rather than
 * pretending to translate.
 */
export function matchLocale(tag: string | null | undefined): LocaleCode | null {
  if (!tag) return null;
  const base = tag.trim().toLowerCase().split(/[-_]/u)[0];
  return isLocaleCode(base) ? base : null;
}
