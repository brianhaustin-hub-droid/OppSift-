import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "./_lib/http";

/**
 * Same-origin translation proxy.
 *
 * The browser never holds a translation provider key. When `DEEPL_API_KEY` is
 * configured the request goes to DeepL; otherwise it falls back to MyMemory's
 * public endpoint, which needs no key and is rate limited per IP.
 *
 * Only notice text is translated: titles and descriptions from public
 * procurement portals. No account data passes through this endpoint.
 */

const MAX_TEXT_LENGTH = 2_000;
const LANGUAGE_NAMES: Record<string, string> = {
  en: "EN",
  pt: "PT",
  es: "ES",
  fr: "FR",
  ar: "AR",
};

type TranslateBody = { q?: unknown; from?: unknown; to?: unknown };

function normaliseLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const base = value.trim().toLowerCase().split(/[-_]/u)[0];
  return base in LANGUAGE_NAMES ? base : null;
}

async function translateWithDeepL(
  apiKey: string,
  text: string,
  from: string,
  to: string,
): Promise<string | null> {
  const body = new URLSearchParams({
    text,
    target_lang: LANGUAGE_NAMES[to],
    source_lang: LANGUAGE_NAMES[from],
  });
  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { translations?: { text?: unknown }[] };
  const translated = payload.translations?.[0]?.text;
  return typeof translated === "string" && translated.trim() ? translated : null;
}

async function translateWithMyMemory(text: string, from: string, to: string): Promise<string | null> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${from}|${to}`);
  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    responseStatus?: number | string;
    responseData?: { translatedText?: unknown };
  };
  const translated = payload.responseData?.translatedText;
  if (typeof translated !== "string" || !translated.trim()) return null;
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR/iu.test(translated)) return null;
  return translated;
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const body = await readJsonBody<TranslateBody>(context.request);
  const text = typeof body?.q === "string" ? body.q.trim() : "";
  const from = normaliseLanguage(body?.from);
  const to = normaliseLanguage(body?.to);

  if (!text) return errorResponse(400, "A non-empty q value is required.");
  if (text.length > MAX_TEXT_LENGTH) return errorResponse(413, "Text is too long to translate.");
  if (!from || !to) return errorResponse(400, "Unsupported language pair.");
  if (from === to) return json({ ok: true, translation: text, provider: "none" });

  const deepLApiKey = typeof context.env.DEEPL_API_KEY === "string" ? context.env.DEEPL_API_KEY : "";
  const deepL = deepLApiKey ? await translateWithDeepL(deepLApiKey, text, from, to) : null;
  if (deepL) return json({ ok: true, translation: deepL, provider: "deepl" });

  const fallback = await translateWithMyMemory(text, from, to);
  if (!fallback) {
    return errorResponse(502, "No translation provider returned a translation.");
  }
  return json({ ok: true, translation: fallback, provider: "mymemory" });
}

export function onRequest(): Response {
  return methodNotAllowed(["POST"]);
}
