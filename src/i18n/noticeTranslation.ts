import { detectLanguage } from "./detect";
import { matchLocale, type LocaleCode } from "./locales";

/**
 * Translates free-text notice content (titles, descriptions).
 *
 * Two providers, in order:
 *  1. A same-origin proxy (`VITE_TRANSLATE_PROXY`, e.g. "/api/translate") that
 *     keeps a commercial provider key server-side. The repository ships
 *     `functions/api/translate.ts` for this.
 *  2. MyMemory, a public machine-translation API that requires no key. It is
 *     rate limited per IP and documented as free for low-volume use, so the
 *     client caches aggressively and never retries in a loop.
 *
 * A failed or unavailable translation returns `null`: the caller then shows the
 * original wording rather than an error page or invented text.
 */

const CACHE_KEY = "oppsift.notice-translations.v1";
const MAX_CACHE_ENTRIES = 400;
// MyMemory rejects long queries; chunk on sentence boundaries well below its
// documented limit so a long description still translates.
const MAX_CHUNK_LENGTH = 420;
const REQUEST_TIMEOUT_MS = 12_000;

type CacheEntry = { text: string; provider: string; storedAt: number };
type CacheShape = Record<string, CacheEntry>;

function readCache(): CacheShape {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CacheShape) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: CacheShape) {
  try {
    const entries = Object.entries(cache)
      .sort((a, b) => b[1].storedAt - a[1].storedAt)
      .slice(0, MAX_CACHE_ENTRIES);
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Storage full or blocked: translations still work for this session.
  }
}

function cacheKey(text: string, from: string, to: string): string {
  // FNV-1a over the text keeps keys short; collisions only cost a re-translation.
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${from}>${to}:${hash.toString(16)}:${text.length}`;
}

export function splitForTranslation(text: string, maxLength = MAX_CHUNK_LENGTH): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLength) return [trimmed];

  const chunks: string[] = [];
  const sentences = trimmed.match(/[^.!?;\n]+[.!?;\n]*/gu) ?? [trimmed];
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > maxLength) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      for (let index = 0; index < sentence.length; index += maxLength) {
        chunks.push(sentence.slice(index, index + maxLength).trim());
      }
      continue;
    }
    if ((current + sentence).length > maxLength) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

async function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await work(controller.signal);
  } finally {
    window.clearTimeout(timer);
  }
}

async function translateWithProxy(
  proxyUrl: string,
  text: string,
  from: string,
  to: string,
): Promise<string | null> {
  try {
    return await withTimeout(async (signal) => {
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, from, to }),
        signal,
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { translation?: unknown };
      return typeof payload.translation === "string" && payload.translation.trim()
        ? payload.translation
        : null;
    });
  } catch {
    return null;
  }
}

async function translateWithMyMemory(
  text: string,
  from: string,
  to: string,
): Promise<string | null> {
  try {
    return await withTimeout(async (signal) => {
      const url = new URL("https://api.mymemory.translated.net/get");
      url.searchParams.set("q", text);
      url.searchParams.set("langpair", `${from}|${to}`);
      const response = await fetch(url.toString(), { signal });
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        responseStatus?: number | string;
        responseData?: { translatedText?: unknown };
      };
      const status = Number(payload.responseStatus ?? 0);
      if (Number.isFinite(status) && status >= 400) return null;
      const translated = payload.responseData?.translatedText;
      if (typeof translated !== "string" || !translated.trim()) return null;
      // MyMemory answers quota and error conditions inside a 200 response.
      if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR/iu.test(translated)) return null;
      return translated;
    });
  } catch {
    return null;
  }
}

export type NoticeTranslation = {
  text: string;
  provider: "proxy" | "mymemory";
};

export function noticeLanguage(text: string | null | undefined): LocaleCode | null {
  const detected = detectLanguage(text);
  if (detected.code === "und") return null;
  return matchLocale(detected.code);
}

/**
 * Translates notice text into `target`. Returns null when the text is already
 * in the target language, when the language cannot be detected, or when no
 * provider succeeds.
 */
export async function translateNoticeText(
  text: string | null | undefined,
  target: LocaleCode,
): Promise<NoticeTranslation | null> {
  const value = (text ?? "").trim();
  if (!value) return null;
  const source = noticeLanguage(value);
  if (!source || source === target) return null;

  const key = cacheKey(value, source, target);
  const cache = readCache();
  const cached = cache[key];
  if (cached) return { text: cached.text, provider: cached.provider as NoticeTranslation["provider"] };

  const proxyUrl = (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env?.VITE_TRANSLATE_PROXY;
  const chunks = splitForTranslation(value);
  const translatedChunks: string[] = [];
  const provider: NoticeTranslation["provider"] = proxyUrl ? "proxy" : "mymemory";

  for (const chunk of chunks) {
    const translated = proxyUrl
      ? await translateWithProxy(proxyUrl, chunk, source, target)
      : await translateWithMyMemory(chunk, source, target);
    if (!translated) return null;
    translatedChunks.push(translated.trim());
  }

  if (translatedChunks.length === 0) return null;
  const joined = translatedChunks.join(" ");
  writeCache({ ...cache, [key]: { text: joined, provider, storedAt: Date.now() } });
  return { text: joined, provider };
}
