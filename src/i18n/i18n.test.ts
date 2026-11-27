import { describe, expect, it } from "vitest";
import { detectLanguage, detectedLocale, translateDataValue } from "./detect";
import { isLocaleCode, localeDefinition, matchLocale } from "./locales";
import { localeCoverage, messageKeys, translate } from "./messages";

describe("locale matching", () => {
  it("maps regional tags onto supported UI locales", () => {
    expect(matchLocale("pt-BR")).toBe("pt");
    expect(matchLocale("es-419")).toBe("es");
    expect(matchLocale("fr-CA")).toBe("fr");
    expect(matchLocale("ar-EG")).toBe("ar");
    expect(matchLocale("en-GB")).toBe("en");
  });

  it("returns null for languages OppSift does not translate", () => {
    expect(matchLocale("zh-Hans")).toBeNull();
    expect(matchLocale("")).toBeNull();
    expect(matchLocale(null)).toBeNull();
  });

  it("marks Arabic as right-to-left", () => {
    expect(localeDefinition("ar").dir).toBe("rtl");
    expect(localeDefinition("en").dir).toBe("ltr");
    expect(isLocaleCode("de")).toBe(false);
  });
});

describe("notice language detection", () => {
  it("detects Portuguese procurement notices", () => {
    const result = detectLanguage(
      "Aquisição de jogos pedagógicos e materiais de apoio à educação infantil para o município",
    );
    expect(result.code).toBe("pt");
    expect(result.confidence).toBeGreaterThan(0.4);
    expect(detectedLocale("Aquisição de materiais para a prestação de serviços do município")).toBe("pt");
  });

  it("detects Spanish, French and English notices", () => {
    expect(detectLanguage("Adquisición de servicios de suministro para el municipio").code).toBe("es");
    expect(detectLanguage("Marché de services de fourniture pour les travaux de la ville").code).toBe("fr");
    expect(detectLanguage("Supply of services and works for the contract procurement").code).toBe("en");
  });

  it("detects Arabic script", () => {
    expect(detectLanguage("توريد خدمات الصيانة للمباني الحكومية").code).toBe("ar");
  });

  it("reports undetermined text instead of guessing", () => {
    expect(detectLanguage("ACME-4471/XZ").code).toBe("und");
    expect(detectLanguage("").confidence).toBe(0);
    expect(detectedLocale("12345")).toBeNull();
  });
});

describe("structured value translation", () => {
  it("translates controlled database values per locale", () => {
    expect(translateDataValue("status", "Open", "pt")).toBe("Aberto");
    expect(translateDataValue("status", "Closing Soon", "es")).toBe("Cierra pronto");
    expect(translateDataValue("category", "government", "fr")).toBe("Public");
    expect(translateDataValue("sourceAvailability", "Unavailable", "en")).toBe("Catalogue only");
    expect(translateDataValue("coverage", "active", "ar")).toBe("نشط");
  });

  it("leaves unknown values untouched rather than mislabelling them", () => {
    expect(translateDataValue("status", "under appeal", "pt")).toBe("under appeal");
  });
});

describe("message catalogues", () => {
  it("falls back to English for a missing key", () => {
    expect(translate("en", "nav.sources")).toBe("Sources");
    expect(translate("pt", "nav.sources")).toBe("Fontes");
  });

  it("covers every interface key in each shipped locale", () => {
    for (const locale of ["en", "pt", "es", "fr", "ar"] as const) {
      expect(localeCoverage(locale)).toBe(1);
    }
    expect(messageKeys().length).toBeGreaterThan(20);
  });
});
