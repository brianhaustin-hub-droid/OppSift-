import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { noticeLanguage, splitForTranslation, translateNoticeText } from "./noticeTranslation";

const portuguese =
  "Aquisição de jogos pedagógicos e materiais de apoio à educação infantil para o município";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("language short-circuits", () => {
  it("detects the notice language", () => {
    expect(noticeLanguage(portuguese)).toBe("pt");
    expect(noticeLanguage("Supply of services and works for the contract")).toBe("en");
    expect(noticeLanguage("12345")).toBeNull();
  });

  it("does not translate text already in the target language", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(translateNoticeText(portuguese, "pt")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null for empty text", async () => {
    await expect(translateNoticeText("   ", "en")).resolves.toBeNull();
  });
});

describe("chunking long notices", () => {
  it("keeps short text in one chunk", () => {
    expect(splitForTranslation("Short notice.")).toEqual(["Short notice."]);
  });

  it("splits on sentence boundaries within the provider limit", () => {
    const sentence = "A".repeat(300) + ".";
    const chunks = splitForTranslation(`${sentence} ${sentence} ${sentence}`, 420);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 420)).toBe(true);
  });

  it("hard-splits a single over-long sentence", () => {
    const chunks = splitForTranslation("B".repeat(1000), 420);
    expect(chunks).toHaveLength(3);
    expect(chunks.every((chunk) => chunk.length <= 420)).toBe(true);
  });
});

describe("provider calls", () => {
  it("translates through the public provider and caches the result", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        responseStatus: 200,
        responseData: { translatedText: "Procurement of educational games for the municipality" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateNoticeText(portuguese, "en");
    expect(result).toEqual({
      text: "Procurement of educational games for the municipality",
      provider: "mymemory",
    });

    const requested = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requested.searchParams.get("langpair")).toBe("pt|en");

    const cached = await translateNoticeText(portuguese, "en");
    expect(cached?.text).toBe(result?.text);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats the provider's in-body quota warning as a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          responseStatus: 200,
          responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" },
        }),
      ),
    );
    await expect(translateNoticeText(portuguese, "en")).resolves.toBeNull();
  });

  it("returns null when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")));
    await expect(translateNoticeText(portuguese, "en")).resolves.toBeNull();
  });
});
