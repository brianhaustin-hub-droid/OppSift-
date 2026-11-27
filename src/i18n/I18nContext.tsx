import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { detectLanguage, detectedLocale, translateDataValue, type DataValueKind } from "./detect";
import { defaultLocale, isLocaleCode, localeDefinition, matchLocale, type LocaleCode } from "./locales";
import { translate, type MessageKey } from "./messages";

const STORAGE_KEY = "oppsift.locale";

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: MessageKey) => string;
  translateValue: (kind: DataValueKind, value: string) => string;
  formatDate: (value: string | null | undefined) => string;
  formatNumber: (value: number) => string;
  formatCurrency: (value: number | null, currency: string) => string;
  detect: typeof detectLanguage;
  detected: typeof detectedLocale;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): LocaleCode | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocaleCode(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** First supported language the browser advertises, in the user's own order. */
export function detectBrowserLocale(): LocaleCode {
  const languages = typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language];
  for (const language of languages) {
    const matched = matchLocale(language);
    if (matched) return matched;
  }
  return defaultLocale;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => readStoredLocale() ?? detectBrowserLocale());
  const [preference, setPreference] = useState<"detected" | "explicit">(() =>
    readStoredLocale() ? "explicit" : "detected",
  );

  // A notice written in a language the reader chose should render that
  // language; until they choose, follow the browser's own preference.
  useEffect(() => {
    if (preference !== "detected") return;
    const next = detectBrowserLocale();
    setLocaleState((current) => (current === next ? current : next));
  }, [preference]);

  useEffect(() => {
    const definition = localeDefinition(locale);
    document.documentElement.lang = definition.code;
    document.documentElement.dir = definition.dir;
  }, [locale]);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    setPreference("explicit");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for
      // this session, so nothing user-visible breaks.
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: MessageKey) => translate(locale, key);
    const tag = locale === "pt" ? "pt-BR" : locale === "ar" ? "ar" : locale;
    const dateFormatter = new Intl.DateTimeFormat(tag, { dateStyle: "medium" });
    const numberFormatter = new Intl.NumberFormat(tag);
    return {
      locale,
      setLocale,
      t,
      translateValue: (kind, raw) => translateDataValue(kind, raw, locale),
      formatDate: (raw) => {
        if (!raw) return "—";
        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? raw : dateFormatter.format(parsed);
      },
      formatNumber: (input) => numberFormatter.format(input),
      formatCurrency: (input, currency) => {
        if (input === null || !Number.isFinite(input)) return "Not published";
        try {
          return new Intl.NumberFormat(tag, { style: "currency", currency, maximumFractionDigits: 0 }).format(input);
        } catch {
          return `${numberFormatter.format(input)} ${currency}`;
        }
      },
      detect: detectLanguage,
      detected: detectedLocale,
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider.");
  return context;
}
