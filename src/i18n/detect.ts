import { defaultLocale, matchLocale, type LocaleCode } from "./locales";
import { translate, type MessageKey } from "./messages";

export type DetectedLanguage = {
  /** ISO 639-1 code when detected, otherwise "und" (undetermined). */
  code: string;
  confidence: number;
};

// Short, high-signal function words. Detecting procurement titles does not need
// a statistical model: notices are short and language signals are dense, and a
// small deterministic list is explainable and testable.
const stopwords: Record<Exclude<LocaleCode, "ar">, readonly string[]> = {
  en: [
    "the", "and", "for", "with", "supply", "of", "to", "services", "contract",
    "procurement", "invitation", "request", "works",
  ],
  pt: [
    "de", "da", "do", "para", "e", "aquisição", "contratação", "serviços",
    "prestação", "município", "registro", "preços", "com", "dos", "das", "pregão",
  ],
  es: [
    "de", "la", "el", "para", "y", "adquisición", "contratación", "servicios",
    "suministro", "municipio", "con", "los", "las", "licitación", "obra",
  ],
  fr: [
    "de", "la", "le", "les", "pour", "et", "marché", "services", "fourniture",
    "travaux", "avec", "des", "appel", "offres", "prestation",
  ],
};

const arabicScript = /[\u0600-\u06FF]/u;
const latinScript = /[A-Za-zÀ-ÖØ-öø-ÿ]/u;

function normaliseWords(text: string): string[] {
  return text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/u)
    .filter((word) => word.length > 0);
}

export function detectLanguage(text: string | null | undefined): DetectedLanguage {
  const value = (text ?? "").trim();
  if (!value) return { code: "und", confidence: 0 };

  const arabicMatches = value.match(new RegExp(arabicScript, "gu"))?.length ?? 0;
  if (arabicMatches / value.length > 0.25) {
    return { code: "ar", confidence: Math.min(1, arabicMatches / value.length * 2) };
  }
  if (!latinScript.test(value)) return { code: "und", confidence: 0 };

  const words = normaliseWords(value);
  if (words.length === 0) return { code: "und", confidence: 0 };

  let best: { code: LocaleCode; matches: number } = { code: defaultLocale, matches: 0 };
  for (const [code, list] of Object.entries(stopwords) as [Exclude<LocaleCode, "ar">, readonly string[]][]) {
    const set = new Set(list);
    const matches = words.filter((word) => set.has(word)).length;
    if (matches > best.matches) best = { code, matches };
  }

  if (best.matches === 0) return { code: "und", confidence: 0 };
  return {
    code: best.code,
    confidence: Math.min(1, best.matches / Math.min(words.length, 8)),
  };
}

export function detectedLocale(text: string | null | undefined): LocaleCode | null {
  const detected = detectLanguage(text);
  return detected.confidence >= 0.4 ? matchLocale(detected.code) : null;
}

export type DataValueKind =
  | "status"
  | "category"
  | "sourceAvailability"
  | "coverage";

const dataValueKeys: Record<DataValueKind, Record<string, MessageKey>> = {
  status: {
    open: "status.open",
    "closing soon": "status.closingSoon",
    amended: "status.amended",
    closed: "status.closed",
    awarded: "status.awarded",
  },
  category: {
    government: "category.government",
    grants: "category.grants",
    commercial: "category.commercial",
  },
  sourceAvailability: {
    connected: "source.connected",
    scheduled: "source.scheduled",
    unavailable: "source.unavailable",
  },
  coverage: {
    active: "coverage.active",
    partial: "coverage.partial",
    planned: "coverage.planned",
  },
};

/**
 * Translates a controlled value read from the database (status, category,
 * availability, coverage state). Free text is never rewritten here: unknown
 * values are returned verbatim so a notice keeps its original wording and a new
 * database value is never silently mislabelled.
 */
export function translateDataValue(
  kind: DataValueKind,
  value: string,
  locale: LocaleCode,
): string {
  const key = dataValueKeys[kind][value.trim().toLowerCase()];
  return key ? translate(locale, key) : value;
}
