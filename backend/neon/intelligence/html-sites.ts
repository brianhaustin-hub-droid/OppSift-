import type { ParsedSourceOpportunity } from "./contracts";
import type { HtmlSiteConfig } from "./html-list-connector";

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolveHref(href: string | null | undefined, baseUrl: string, fallbackPath = "/"): string {
  const raw = (href ?? "").replace(/&amp;/gu, "&").trim();
  try {
    return new URL(raw || fallbackPath, baseUrl).toString();
  } catch {
    try {
      return new URL(fallbackPath, baseUrl).toString();
    } catch {
      return baseUrl;
    }
  }
}

function parseFlexibleDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  const direct = Date.parse(v);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();
  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
    const hour = Number(m[4] ?? "0");
    const minute = Number(m[5] ?? "0");
    const d = new Date(Date.UTC(year, month, day, hour, minute));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function slugifyId(prefix: string, seed: string): string {
  const slug = seed
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return `${prefix}-${slug || "item"}`;
}

function deadlineStatus(deadline: string | null, now: Date): "open" | "closed" | "unknown" {
  if (!deadline) return "unknown";
  const timestamp = Date.parse(deadline);
  if (Number.isNaN(timestamp)) return "unknown";
  return timestamp > now.getTime() ? "open" : "closed";
}

/** Philippines PS-PhilGEPS - Open Opportunities listing. */
export const philippinesSite: HtmlSiteConfig = {
  listUrl: "https://notices.philgeps.gov.ph/",
  selector: "table tbody tr, .tender-item, article, a[href*='BidNotice']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const cells = [...row.querySelectorAll("td")];
    const titleText = text(link?.textContent) ?? text(cells[1]?.textContent) ?? text(row.textContent);
    if (!titleText || titleText.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const referenceNumber = text(cells[0]?.textContent)?.slice(0, 200) ?? null;
    const externalId = `philgeps-${(referenceNumber ?? titleText).toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: titleText.slice(0, 1000), description: null, sourceCategoryTerm: "Bid Notice",
      referenceNumber, countryCode: "PH", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "PS-PhilGEPS - Philippines", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: null,
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title: titleText, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title: titleText, url: sourceUrl } };
  },
};

/** India CPPP - Latest Active Tenders. */
export const indiaSite: HtmlSiteConfig = {
  listUrl: "https://eprocure.gov.in/eprocure/app",
  selector: "table.list_table tbody tr, table#table tbody tr, table tbody tr",
  extract(row, _document, baseUrl) {
    const cells = [...row.querySelectorAll("td")];
    if (cells.length < 2) return null;
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const titleText = text(link?.textContent) ?? text(cells[4]?.textContent) ?? text(cells[1]?.textContent);
    if (!titleText || titleText.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const referenceNumber = text(cells[1]?.textContent)?.slice(0, 200) ?? null;
    const externalId = `in-cppp-${(referenceNumber ?? titleText).toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: titleText.slice(0, 1000), description: null, sourceCategoryTerm: "Tender Notice",
      referenceNumber, countryCode: "IN", region: null, city: null, issuingInstitution: null, procuringOrganization: text(cells[3]?.textContent),
      publisher: "Central Public Procurement Portal (India)", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Asia/Kolkata",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title: titleText, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title: titleText, url: sourceUrl } };
  },
};

/** South Sudan PPDAA - Current Bids. */
export const southSudanSite: HtmlSiteConfig = {
  listUrl: "https://ppdaa.gov.ss/tenders",
  selector: "table tbody tr, article, .tender-item, .views-row",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const titleText = text(link?.textContent) ?? text(row.textContent);
    if (!titleText || titleText.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `ss-${titleText.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: titleText.slice(0, 1000), description: null, sourceCategoryTerm: "Tender Notice",
      referenceNumber: null, countryCode: "SS", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "PPDAA South Sudan", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Africa/Juba",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title: titleText, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title: titleText, url: sourceUrl } };
  },
};

/** Sierra Leone NPPA - Tender Portal bids. */
export const sierraLeoneSite: HtmlSiteConfig = {
  listUrl: "https://nppa.gov.sl/tenders",
  selector: "table tbody tr, article, .tender, .views-row, a[href*='tender']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const titleText = text(link?.textContent) ?? text(row.textContent);
    if (!titleText || titleText.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `sl-${titleText.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: titleText.slice(0, 1000), description: null, sourceCategoryTerm: "Tender Notice",
      referenceNumber: null, countryCode: "SL", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "National Public Procurement Authority (Sierra Leone)", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Africa/Freetown",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title: titleText, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title: titleText, url: sourceUrl } };
  },
};

/** Mauritius PPO - Procurement notices. */
export const mauritiusSite: HtmlSiteConfig = {
  listUrl: "https://publicprocurement.govmu.org/",
  selector: "table tbody tr, article, .tender, .views-row",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const titleText = text(link?.textContent) ?? text(row.textContent);
    if (!titleText || titleText.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `mu-${titleText.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: titleText.slice(0, 1000), description: null, sourceCategoryTerm: "Tender Notice",
      referenceNumber: null, countryCode: "MU", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "Procurement Policy Office Mauritius", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Indian/Mauritius",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title: titleText, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title: titleText, url: sourceUrl } };
  },
};

/** Côte d'Ivoire DGMP - Tender notices (Appels d'offres). */
export const coteIvoireAppelSite: HtmlSiteConfig = {
  listUrl: "https://marchespublics.ci/avis_appel_offre",
  selector: "table#example tbody tr, table tbody tr",
  extract(row, _document, baseUrl) {
    const cells = [...row.querySelectorAll("td")];
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const referenceNumber = text(cells[0]?.textContent);
    const titleText = text(cells[2]?.textContent) ?? text(link?.textContent) ?? text(cells[1]?.textContent);
    if (!titleText || titleText.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `ci-appel-${(referenceNumber ?? titleText).toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: titleText.slice(0, 1000), description: null, sourceCategoryTerm: "Avis d'appel d'offres",
      referenceNumber, countryCode: "CI", region: null, city: null, issuingInstitution: null, procuringOrganization: text(cells[1]?.textContent),
      publisher: "DGMP Côte d'Ivoire", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Africa/Abidjan",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { referenceNumber, title: titleText, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, url: sourceUrl } };
  },
};

/** Côte d'Ivoire DGMP - Résultats des appels d'offres (attributions). */
export const coteIvoireAttributionSite: HtmlSiteConfig = {
  listUrl: "https://marchespublics.ci/avis_attribution",
  selector: "table#example tbody tr, table tbody tr",
  extract(row, _document, baseUrl) {
    const cells = [...row.querySelectorAll("td")];
    if (cells.length < 4) return null;
    const referenceNumber = text(cells[0]?.textContent);
    const title = text(cells[2]?.textContent);
    if (!referenceNumber || !title) return null;
    const authority = text(cells[1]?.textContent);
    const winner = text(cells[3]?.textContent);
    const lot = text(cells[4]?.textContent);
    const judgmentText = text(cells[5]?.textContent);
    const parseIsoDate = (value: string | null): string | null => {
      if (!value) return null;
      const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(value.trim());
      if (!match) return null;
      const [, year, month, day] = match;
      const candidate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString();
    };
    const publishedAt = parseIsoDate(judgmentText);
    const referenceSlug = referenceNumber.toLowerCase().replace(/[^a-z0-9]+/gu, "-");
    const externalId = `ci-attrib-${referenceSlug}-${(lot ?? "0").replace(/[^a-z0-9]+/giu, "")}`.slice(0, 190);
    const sourceUrl = new URL("/avis_attribution", baseUrl).toString();
    const parsed: ParsedSourceOpportunity = {
      externalId, title: title.slice(0, 1000), description: null, sourceCategoryTerm: "Avis d'attribution",
      referenceNumber, countryCode: "CI", region: null, city: null, issuingInstitution: null, procuringOrganization: authority,
      publisher: "DGMP Côte d'Ivoire", publishedAt, sourceDeadlineText: null, closingAt: null, timeZone: publishedAt ? "Africa/Abidjan" : null,
      status: "closed", sourceUrl, canonicalUrl: null, currency: null, amount: null,
      originalValues: { referenceNumber, authority, winner, lot, judgmentText },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title, winner, lot, judgmentText, url: sourceUrl } };
  },
};

/** Benin ARMP - notices / tender listings. */
export const beninSite: HtmlSiteConfig = {
  listUrl: "https://armp.bj/",
  selector: "article, .post, .views-row, table tbody tr, a[href*='avis'], a[href*='marche']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const title = text(link?.textContent) ?? text(row.querySelector("h1, h2, h3")?.textContent) ?? text(row.textContent);
    if (!title || title.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `bj-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: title.slice(0, 1000), description: null, sourceCategoryTerm: "Invitation for Bids",
      referenceNumber: null, countryCode: "BJ", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "ARMP Benin", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Africa/Porto-Novo",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title, url: sourceUrl } };
  },
};

/** Senegal - marchespublics.sn public procurement notices. */
export const senegalSite: HtmlSiteConfig = {
  listUrl: "https://marchespublics.sn/",
  useBrowser: true,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "article, .post, .views-row, table tbody tr, a[href*='avis'], a[href*='marche']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const title = text(link?.textContent) ?? text(row.querySelector("h1, h2, h3")?.textContent) ?? text(row.textContent);
    if (!title || title.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `sn-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: title.slice(0, 1000), description: null, sourceCategoryTerm: "Invitation for Bids",
      referenceNumber: null, countryCode: "SN", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "Direction des Marchés Publics (Senegal)", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Africa/Dakar",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title, url: sourceUrl } };
  },
};

/** Gambia - gppagal.gov.gm public procurement notices. */
export const gambiaSite: HtmlSiteConfig = {
  listUrl: "https://gppagal.gov.gm/tenders",
  useBrowser: true,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "article, .post, .views-row, table tbody tr, a[href*='tender'], a[href*='notice']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const title = text(link?.textContent) ?? text(row.querySelector("h1, h2, h3")?.textContent) ?? text(row.textContent);
    if (!title || title.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `gm-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: title.slice(0, 1000), description: null, sourceCategoryTerm: "Invitation for Bids",
      referenceNumber: null, countryCode: "GM", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "Gambia Public Procurement Authority", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Africa/Banjul",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title, url: sourceUrl } };
  },
};

/** Niger - armp.ne public procurement notices. */
export const nigerSite: HtmlSiteConfig = {
  listUrl: "https://armp.ne/",
  useBrowser: true,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "article, .post, .views-row, table tbody tr, a[href*='avis'], a[href*='marche']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const title = text(link?.textContent) ?? text(row.querySelector("h1, h2, h3")?.textContent) ?? text(row.textContent);
    if (!title || title.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `ne-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: title.slice(0, 1000), description: null, sourceCategoryTerm: "Invitation for Bids",
      referenceNumber: null, countryCode: "NE", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "ARMP Niger", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Africa/Niamey",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title, url: sourceUrl } };
  },
};

/** Burkina Faso - armp.gov.bf public procurement notices. */
export const burkinaFasoSite: HtmlSiteConfig = {
  listUrl: "https://armp.gov.bf/",
  useBrowser: true,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "article, .post, .views-row, table tbody tr, a[href*='avis'], a[href*='marche']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const title = text(link?.textContent) ?? text(row.querySelector("h1, h2, h3")?.textContent) ?? text(row.textContent);
    if (!title || title.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `bf-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: title.slice(0, 1000), description: null, sourceCategoryTerm: "Invitation for Bids",
      referenceNumber: null, countryCode: "BF", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "ARMP Burkina Faso", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Africa/Ouagadougou",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title, url: sourceUrl } };
  },
};

/** Botswana - ppra.co.bw public procurement notices. */
export const botswanaSite: HtmlSiteConfig = {
  listUrl: "https://ppra.co.bw/tenders",
  useBrowser: true,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "article, .post, .views-row, table tbody tr, a[href*='tender'], a[href*='notice']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const title = text(link?.textContent) ?? text(row.querySelector("h1, h2, h3")?.textContent) ?? text(row.textContent);
    if (!title || title.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `bw-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: title.slice(0, 1000), description: null, sourceCategoryTerm: "Invitation for Bids",
      referenceNumber: null, countryCode: "BW", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "Public Procurement Regulatory Authority (Botswana)", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Africa/Gaborone",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title, url: sourceUrl } };
  },
};

/** Namibia - cpbn.com.na public procurement notices. */
export const namibiaSite: HtmlSiteConfig = {
  listUrl: "https://www.cpbn.com.na/procurement-notices",
  headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html,application/xhtml+xml" },
  selector: "article, .post, .views-row, table tbody tr, a[href*='tender'], a[href*='bid']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const title = text(link?.textContent) ?? text(row.querySelector("h1, h2, h3")?.textContent) ?? text(row.textContent);
    if (!title || title.length < 6) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `na-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId, title: title.slice(0, 1000), description: null, sourceCategoryTerm: "Invitation for Bids",
      referenceNumber: null, countryCode: "NA", region: null, city: null, issuingInstitution: null, procuringOrganization: null,
      publisher: "Central Procurement Board of Namibia", publishedAt: null, sourceDeadlineText: null, closingAt: null, timeZone: "Africa/Windhoek",
      status: "unknown", sourceUrl, canonicalUrl: null, currency: null, amount: null, originalValues: { title, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title, url: sourceUrl } };
  },
};

/**
 * Madagascar ARMP - public procurement notices (dynamic listings).
 * Corrected endpoint: armp.mg dynamic portal (previous config pointed to Mali dgcp.gov.ml).
 */
export const madagascarSite: HtmlSiteConfig = {
  listUrl: "http://armp.mg:82/marches_publics",
  useBrowser: true,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "tr, .list-group-item, .card, article, li, .row",
  extract(row, _document, baseUrl) {
    const raw = text(row.textContent) ?? "";
    if (raw.length < 20) return null;
    if (/accueil|connexion|contact|recherche|menu|login|ENTITE\s+OBJET\s+DATE/i.test(raw) && !/Ref\s*:|Mode\s*:|N[°o]/i.test(raw)) return null;

    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const cells = [...row.querySelectorAll("td")];
    const refMatch = raw.match(/Ref\s*:\s*([^\n\r]+)/i);
    const numMatch = raw.match(/N[°o]\s*([^\n\r]+)/i);
    const modeMatch = raw.match(/Mode\s*:\s*([^\n\r]+)/i);
    const referenceNumber = text(refMatch?.[1]) ?? text(numMatch?.[1]) ?? (cells.length ? text(cells[0]?.textContent) : null);

    let titleText = text(link?.textContent);
    if (!titleText) {
      const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      titleText = lines.find((l) => l.length >= 10 && !/^ref\s*:|^mode\s*:|^n[°o]|^du\s*:|^au\s*:|^entite$|^objet$|^date$/i.test(l)) ?? null;
    }
    if (!titleText && cells.length >= 2) titleText = text(cells[1]?.textContent) ?? text(cells[2]?.textContent);
    if (!titleText || titleText.length < 8) return null;
    if (/^source des donn/i.test(titleText)) return null;

    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `mg-${(referenceNumber ?? titleText).toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const closingMatch = raw.match(/Au\s*:\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
    const sourceDeadlineText = text(closingMatch?.[1]);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: text(modeMatch?.[1]) ?? "Avis d'appel d'offres",
      referenceNumber: referenceNumber?.slice(0, 200) ?? null,
      countryCode: "MG",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: null,
      publisher: "Autorité de Régulation des Marchés Publics (ARMP) Madagascar",
      publishedAt: null,
      sourceDeadlineText: sourceDeadlineText?.slice(0, 200) ?? null,
      closingAt: null,
      timeZone: "Indian/Antananarivo",
      status: "unknown",
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { title: titleText, referenceNumber, sourceDeadlineText, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title: titleText, referenceNumber, sourceDeadlineText, url: sourceUrl } };
  },
};

/**
 * Malawi — ppdamlawi.org public procurement notices.
 */
export const malawiSite: HtmlSiteConfig = {
  listUrl: "https://ppda.mw/procurement-notices/",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  useBrowser: true,
  selector: "article, .elementor-post, .post, .views-row, table tbody tr, li, a[href*='notice'], a[href*='tender'], a[href*='procurement']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const title = text(link?.textContent) ?? text(row.querySelector("h1, h2, h3, .elementor-post__title, .entry-title")?.textContent);
    if (!title || title.length < 8) return null;
    if (/^read more$|^home$|^about/i.test(title)) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    if (!/notice|tender|procurement|bid|advert/i.test(`${title} ${sourceUrl}`)) return null;
    const externalId = `mw-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: title.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Procurement Notice",
      referenceNumber: null,
      countryCode: "MW",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: null,
      publisher: "Public Procurement and Disposal of Assets Authority (Malawi)",
      publishedAt: null,
      sourceDeadlineText: null,
      closingAt: null,
      timeZone: "Africa/Blantyre",
      status: "unknown",
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { title, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title, url: sourceUrl } };
  },
};

/**
 * Mozambique — UFSA public procurement notices (concursos).
 */
export const mozambiqueSite: HtmlSiteConfig = {
  listUrl: "https://www.ufsa.gov.mz/concursos_abertos.php",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  useBrowser: true,
  selector: "table tbody tr, .concursos tr, article, .post, li, a[href*='concurso'], a[href*='aviso']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const cells = [...row.querySelectorAll("td")];
    const title = text(link?.textContent) ?? text(cells[1]?.textContent) ?? text(cells[0]?.textContent) ?? text(row.querySelector("h1, h2, h3")?.textContent);
    if (!title || title.length < 8) return null;
    if (/^home$|principal|menu/i.test(title)) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const externalId = `mz-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: title.slice(0, 1000),
      description: cells.length > 2 ? (text(cells[2]?.textContent)?.slice(0, 2000) ?? null) : null,
      sourceCategoryTerm: "Concurso Aberto",
      referenceNumber: cells.length ? (text(cells[0]?.textContent)?.slice(0, 200) ?? null) : null,
      countryCode: "MZ",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: null,
      publisher: "Unidade Funcional de Supervisão das Aquisições (UFSA), Mozambique",
      publishedAt: null,
      sourceDeadlineText: null,
      closingAt: null,
      timeZone: "Africa/Maputo",
      status: "open",
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { title, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title, url: sourceUrl } };
  },
};

export const kenyaKrcSite: HtmlSiteConfig = {
  listUrl: "https://krc.co.ke/tenders/",
  selector: "table.tablepress tbody tr, table#tablepress-1 tbody tr",
  extract(row, _document, baseUrl) {
    const cells = [...row.querySelectorAll("td")];
    if (cells.length < 2) return null;
    const tenderNo = text(cells[0]?.textContent);
    const link = cells[1]?.querySelector("a") ?? cells[4]?.querySelector("a");
    const titleText = text(cells[1]?.textContent) ?? text(link?.textContent);
    if (!titleText) return null;
    const closingText = text(cells[2]?.textContent);
    const statusText = text(cells[3]?.textContent);
    const href = text(link?.getAttribute("href")) ?? text(cells[4]?.querySelector("a")?.getAttribute("href"));
    const sourceUrl = resolveHref(href, baseUrl, "/tenders/");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-krc", tenderNo ?? titleText);
    const now = new Date();
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender Notice",
      referenceNumber: tenderNo,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: "Kenya Railways Corporation",
      publisher: "Kenya Railways Corporation",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: /active|open/i.test(statusText ?? "") ? "open" : deadlineStatus(closingAt, now),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { tenderNo, closingText, statusText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { tenderNo, title: titleText, closingText, statusText, url: sourceUrl } };
  },
};

/** Kenya Power (KPLC) — tender notices/documents listing. */
export const kenyaKplcSite: HtmlSiteConfig = {
  useBrowser: true,
  listUrl: "https://kplc.co.ke/tender-notices",
  selector: "table tbody tr, .tender-list .tender-item, .views-row, .accordion-item, .card, a[href*='/tender/'], a[href*='tender-notice'], .entry-content li",
  extract(row, _document, baseUrl) {
    const cells = [...row.querySelectorAll("td")];
    let titleText: string | null = null;
    let href: string | null = null;
    let referenceNumber: string | null = null;
    let closingText: string | null = null;
    if (cells.length >= 2) {
      const link = row.querySelector("a");
      titleText = text(cells[1]?.textContent) ?? text(link?.textContent) ?? text(row.textContent);
      href = text(link?.getAttribute("href"));
      referenceNumber = text(cells[0]?.textContent);
      closingText = text(cells[2]?.textContent) ?? text(cells[3]?.textContent);
    } else {
      const link = row.querySelector("a");
      titleText = text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.title")?.textContent);
      href = text(link?.getAttribute("href"));
      closingText = text(row.querySelector("time,.date,.closing,.deadline")?.textContent);
      referenceNumber = text(row.querySelector(".reference,.ref,.tender-no")?.textContent);
    }
    if (!titleText || titleText.length < 6) return null;
    const sourceUrl = resolveHref(href, baseUrl, "/tender-notices");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-kplc", referenceNumber ?? `${titleText}-${closingText ?? ""}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender Notice",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: "Kenya Power and Lighting Company",
      publisher: "Kenya Power (KPLC)",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
  },
};

/** KeNHA — tenders pages (consultancy/works/goods/supplies). */
export const kenyaKenhaSite: HtmlSiteConfig = {
  listUrl: "https://kenha.co.ke/worksmaintenance/",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "table tbody tr, .dlp-documents-table tbody tr, article, .entry-content a[href], .wp-block-file a, .wp-block-document-library-pro-download-button a, .dlp-document-title a, a[href*='.pdf']",
  extract(row, _document, baseUrl) {
    const cells = [...row.querySelectorAll("td")];
    const link = row.matches?.("a") ? row : row.querySelector("a[href]") ?? row.closest?.("a[href]") ?? null;
    const href = text((link as Element | null)?.getAttribute?.("href") ?? null);
    let titleText = text((link as Element | null)?.textContent ?? null) ?? text(row.querySelector("h1,h2,h3,h4,.entry-title,.dlp-document-title")?.textContent);
    let referenceNumber: string | null = null;
    let closingText: string | null = null;
    if (cells.length >= 2) {
      titleText = titleText ?? text(cells[1]?.textContent) ?? text(cells[0]?.textContent);
      referenceNumber = text(cells[0]?.textContent);
      closingText = text(cells[2]?.textContent) ?? text(cells[3]?.textContent);
    } else {
      closingText = text(row.querySelector("time,.date,.closing-date,.deadline")?.textContent);
    }
    if (!titleText) titleText = text(row.textContent);
    titleText = titleText?.replace(/\s+/g, " ").trim() ?? null;
    if (!titleText || titleText.length < 8) return null;
    if (/^(home|download|view|read more)$/i.test(titleText)) return null;
    const sourceUrl = resolveHref(href, baseUrl, "/tenders-consultancy-services/");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-kenha", referenceNumber ?? `${titleText}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: "Kenya National Highways Authority",
      publisher: "KeNHA",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
  },
};

/** KeRRA — tenders document category/listing. */
export const kenyaKerraSite: HtmlSiteConfig = {
  listUrl: "https://kerra.go.ke/document-category/tenders",
  selector: "table tbody tr, article, .post, .entry, .tender-item, ul.downloads li",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const titleText = text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.entry-title")?.textContent);
    if (!titleText || titleText.length < 5) return null;
    const cells = [...row.querySelectorAll("td")];
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
    const sourceUrl = resolveHref(href, baseUrl, "/document-category/tenders");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-kerra", referenceNumber ?? `${titleText}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: "Kenya Rural Roads Authority",
      publisher: "KeRRA",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
  },
};

/** KURA — tenders/documents page. */
export const kenyaKuraSite: HtmlSiteConfig = {
  listUrl: "https://kura.go.ke/tender-documents-2",
  useBrowser: true,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
  },
  selector: "table tbody tr, article, .post, .entry, .document-icon-row, .dg-documents a, ul li a, .entry-content a[href]",
  extract(row, _document, baseUrl) {
    const isAnchor = (row as Element).tagName?.toLowerCase() === "a";
    const link = (isAnchor ? (row as Element) : row.querySelector("a[href]")) as Element | null;
    const href = text(link?.getAttribute("href"));
    const cells = [...row.querySelectorAll("td")];
    // KURA tender tables: [No., Tender No.(link), Description, ...]
    const tenderNo = cells.length >= 2 ? (text(cells[1]?.querySelector("a")?.textContent) ?? text(cells[1]?.textContent)) : (text(link?.textContent) ?? null);
    const desc = cells.length >= 3 ? text(cells[2]?.textContent) : null;
    const refCandidate = cells.length >= 2 ? (text(cells[1]?.textContent) ?? null) : null;
    let titleText = desc && desc.length >= 8 ? desc : (tenderNo && tenderNo.length >= 8 ? tenderNo : (text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.title,.entry-title")?.textContent)));
    if (!titleText && cells.length) titleText = cells.map((c) => text(c.textContent)).filter(Boolean).join(" - ") || null;
    if (!titleText) titleText = text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    const titleTrim = titleText.trim();
    if (/^(home|about|contact|news|events|gallery|documents|departments|services|faqs?|jobs?|careers?|expired tenders|video gallery|policy documents|press releases|roads manual|traffic safety park|job opportunities)$/i.test(titleTrim)) return null;
    if (/^download$/i.test(titleTrim)) return null;
    const sourceUrl = resolveHref(href, baseUrl, "/tender-documents-2");
    const hay = `${titleTrim} ${tenderNo ?? ""} ${refCandidate ?? ""} ${sourceUrl}`;
    const looksLikeTender = /KURA\/[A-Z0-9\/-]+/i.test(hay) || /tender|procure|rfq|rfp|bid|quotation|eoi|expression|addendum|clarification|notice|award|\.pdf/i.test(hay);
    if (!looksLikeTender) return null;
    // Skip header/label rows
    if (/^(no\.?|tender no\.?|tender description|length|budget|eligibility|inspection)/i.test(titleTrim)) return null;
    const referenceNumber = (refCandidate && /KURA|REF|NO/i.test(refCandidate)) ? refCandidate.slice(0, 200) : (tenderNo?.slice(0, 200) ?? null);
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 6 ? text(cells[6]?.textContent) : null);
    const closingAt = parseFlexibleDate(closingText);
    const finalTitle = (desc && desc.length >= 8 ? `${tenderNo ? tenderNo + " - " : ""}${desc}` : titleTrim).slice(0, 1000);
    const externalId = slugifyId("ke-kura", referenceNumber ?? `${finalTitle}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: finalTitle,
      description: desc?.slice(0, 2000) ?? null,
      sourceCategoryTerm: /addendum|clarification/i.test(hay) ? "Addendum/Clarification" : "Tender Notice",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: "Kenya Urban Roads Authority",
      publisher: "KURA",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, tenderNo, description: desc, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, tenderNo, title: finalTitle, closingText, url: sourceUrl } };
  },
};

/** KAA — procurement/tenders listing. */
export const kenyaKaaSite: HtmlSiteConfig = {
  listUrl: "https://kaa.go.ke/corporate/procurement/tenders/",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
  selector: "table tbody tr, article, .tender-item, .procurement-item, .entry-content ul li, .views-row, .entry-content a[href], a[href*='tender'], a[href*='.pdf']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const cells = [...row.querySelectorAll("td")];
    let titleText = text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.title")?.textContent);
    if (!titleText && cells.length >= 2) titleText = text(cells[1]?.textContent) ?? text(cells[0]?.textContent);
    if (!titleText) titleText = text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
    const sourceUrl = resolveHref(href, baseUrl, "/corporate/procurement/tenders/");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-kaa", referenceNumber ?? `${titleText}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: "Kenya Airports Authority",
      publisher: "Kenya Airports Authority",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
  },
};

/** MyGov Kenya (GAA) — all tenders listing. */
export const kenyaMygovSite: HtmlSiteConfig = {
  listUrl: "https://www.mygov.go.ke/index.php/all-tenders",
  useBrowser: true,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "table.views-table tbody tr, table tbody tr, .view-content .views-row, article, .views-row, a[href*='tender'], a[href*='Tender']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const cells = [...row.querySelectorAll("td")];
    let titleText = text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.views-field-title")?.textContent);
    if (!titleText && cells.length) titleText = text(cells[cells.length > 1 ? 1 : 0]?.textContent);
    if (!titleText) titleText = text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    if (/^(home|all tenders)$/i.test(titleText.trim())) return null;
    const referenceNumber = cells.length > 1 ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.views-field-field-deadline,.closing")?.textContent) ?? (cells.length > 2 ? text(cells[cells.length - 1]?.textContent) : null);
    const sourceUrl = resolveHref(href, baseUrl, "/index.php/all-tenders");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-mygov", referenceNumber ?? `${titleText}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender Notice",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: null,
      publisher: "Government Advertising Agency (MyGov Kenya)",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
  },
};

/** PPRA Kenya — notices/tenders listing (best-effort). */
export const kenyaPpraSite: HtmlSiteConfig = {
  listUrl: "https://ppra.go.ke/",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "table tbody tr, article, .tender, .procurement-item, .entry-content li, .views-row, a[href*='tender'], a[href*='Tender']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const titleText = text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.title,.entry-title")?.textContent) ?? text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    const cells = [...row.querySelectorAll("td")];
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
    const sourceUrl = resolveHref(href, baseUrl, "/tenders/");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-ppra", referenceNumber ?? `${titleText}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender Notice",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: null,
      publisher: "PPRA Kenya",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
  },
};

/** IFMIS Supplier Portal — public tender/opportunity listings (best-effort). */
export const kenyaIfmisSite: HtmlSiteConfig = {
  listUrl: "https://supplier.treasury.go.ke/",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "table tbody tr, .tender-row, .list-group-item, article, a[href*='tender'], a[href*='Tender'], a[href*='opportun']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const cells = [...row.querySelectorAll("td")];
    let titleText = text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.title")?.textContent);
    if (!titleText && cells.length >= 2) titleText = text(cells[1]?.textContent);
    if (!titleText) titleText = text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[cells.length - 1]?.textContent) : null);
    const sourceUrl = resolveHref(href, baseUrl, "/site/tenders.go");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-ifmis", referenceNumber ?? `${titleText}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: "National Treasury (IFMIS)",
      publisher: "IFMIS Supplier Portal Kenya",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
  },
};

/**
 * Factory for Kenyan county government tender sources (best-effort HTML scraping).
 * All 13 counties below were live-verified on 2026-11-17 via webfetch against their
 * official `.go.ke` domains; see docs/source-catalog/kenya-deep-source-inventory.md.
 */
interface KenyaCountySiteOptions {
  /** Lowercase county slug used in external IDs, e.g. "kajiado". */
  slug: string;
  /** Display county name, e.g. "Kajiado". */
  county: string;
  /** Verified official website URL (list page). */
  listUrl: string;
}

function makeKenyaCountySite(options: KenyaCountySiteOptions): HtmlSiteConfig {
  const { slug, county, listUrl } = options;
  const publisher = `${county} County`;
  const procuringOrganization = `County Government of ${county}`;
  return {
    listUrl,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    selector: "article, .post, .tender-item, .card, table tbody tr, .entry, .views-row, .wp-block-post, a[href*='tender'], a[href*='Tender'], a[href*='.pdf'], a[href*='/download/']",
    extract(row, _document, baseUrl) {
      const isAnchor = (row as Element).tagName?.toLowerCase() === "a";
      const link = (isAnchor ? (row as Element) : (row.querySelector("h1 a[href], h2 a[href], h3 a[href], h4 a[href], a[href*='tender'], a[href*='Tender'], a[href*='.pdf'], a[href*='/download/'], a[href]"))) as Element | null;
      const href = text(link?.getAttribute("href"));
      let titleText = text(row.querySelector("h1,h2,h3,h4,.entry-title,.title,.tender-title")?.textContent)
        ?? text(link?.getAttribute("title"))
        ?? text(link?.textContent)
        ?? text(row.textContent);
      if (!titleText || titleText.length < 8) return null;
      const titleTrim = titleText.trim();
      // Skip obvious navigation/menu items
      if (/^(home|about|contact|news|events|gallery|documents|departments|services|faqs?|jobs?|careers?|downloads?|tenders?|resources|media|staff mail|e-?services|projects?|careers\/job opportunities?|public notices?|press releases?|speeches|galleries)$/i.test(titleTrim)) return null;
      const sourceUrl = resolveHref(href, baseUrl, "/");
      const hay = `${titleTrim} ${sourceUrl}`;
      // Require tender/procurement signal
      if (!/tender|procure|rfq|rfp|bid|quotation|eoi|expression of interest|notice|addendum|request for proposal|invitation|advert/i.test(hay)) return null;
      if (/\/tenders?\/?$/.test(sourceUrl) && !/tender|procure|rfq|rfp|bid|quotation|eoi/i.test(titleTrim)) return null;
      const cells = [...row.querySelectorAll("td")];
      const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
      const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
      const closingAt = parseFlexibleDate(closingText);
      const externalId = slugifyId(`ke-${slug}`, referenceNumber ?? `${titleTrim}-${sourceUrl}`);
      const parsed: ParsedSourceOpportunity = {
        externalId,
        title: titleText.slice(0, 1000),
        description: null,
        sourceCategoryTerm: "Tender Notice",
        referenceNumber,
        countryCode: "KE",
        region: county,
        city: county,
        issuingInstitution: null,
        procuringOrganization,
        publisher,
        publishedAt: null,
        sourceDeadlineText: closingText?.slice(0, 500) ?? null,
        closingAt,
        timeZone: closingAt ? "Africa/Nairobi" : null,
        status: deadlineStatus(closingAt, new Date()),
        sourceUrl,
        canonicalUrl: null,
        currency: null,
        amount: null,
        originalValues: { referenceNumber, closingText, documentLink: href },
      };
      return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
    },
  };
}

/** Kajiado County — live-verified 2026-11-17 (https://kajiado.go.ke/, Tenders > Tender Adverts). */
export const kenyaKajiadoSite = makeKenyaCountySite({ slug: "kajiado", county: "Kajiado", listUrl: "https://kajiado.go.ke/" });

/** Kericho County — live-verified 2026-11-17 (https://kericho.go.ke/, 62 Tender Documents). */
export const kenyaKerichoSite = makeKenyaCountySite({ slug: "kericho", county: "Kericho", listUrl: "https://kericho.go.ke/" });

/** Bomet County — live-verified 2026-11-17 (https://bomet.go.ke/, Tenders under Resource Centre). */
export const kenyaBometSite = makeKenyaCountySite({ slug: "bomet", county: "Bomet", listUrl: "https://bomet.go.ke/" });

/** Kakamega County — live-verified 2026-11-17 (https://kakamega.go.ke/, Tenders in top nav). */
export const kenyaKakamegaSite = makeKenyaCountySite({ slug: "kakamega", county: "Kakamega", listUrl: "https://kakamega.go.ke/" });

/** Vihiga County — live-verified 2026-11-17 (https://vihiga.go.ke/, 26 Water Project Tenders open). */
export const kenyaVihigaSite = makeKenyaCountySite({ slug: "vihiga", county: "Vihiga", listUrl: "https://vihiga.go.ke/" });

/** Bungoma County — live-verified 2026-11-17 (https://bungoma.go.ke/, Tenders + Jobs in header). */
export const kenyaBungomaSite = makeKenyaCountySite({ slug: "bungoma", county: "Bungoma", listUrl: "https://bungoma.go.ke/" });

/** Busia County — live-verified 2026-11-17 (https://www.busiacounty.go.ke/, Tenders under Resources). */
export const kenyaBusiaSite = makeKenyaCountySite({ slug: "busia", county: "Busia", listUrl: "https://www.busiacounty.go.ke/" });

/** Siaya County — live-verified 2026-11-17 (https://siaya.go.ke/, Advertised/Awarded Tenders, eGP link). */
export const kenyaSiayaSite = makeKenyaCountySite({ slug: "siaya", county: "Siaya", listUrl: "https://siaya.go.ke/" });

/** Kisumu County — live-verified 2026-11-17 (https://kisumu.go.ke/, Tenders library + Registered Suppliers). */
export const kenyaKisumuSite = makeKenyaCountySite({ slug: "kisumu", county: "Kisumu", listUrl: "https://kisumu.go.ke/" });

/** Homa Bay County — live-verified 2026-11-17 (https://homabay.go.ke/, Tenders under Resources). */
export const kenyaHomaBaySite = makeKenyaCountySite({ slug: "homabay", county: "Homa Bay", listUrl: "https://homabay.go.ke/" });

/** Migori County — live-verified 2026-11-17 (https://migori.go.ke/, Tenders menu + live tender banner). */
export const kenyaMigoriSite = makeKenyaCountySite({ slug: "migori", county: "Migori", listUrl: "https://migori.go.ke/" });

/** Kisii County — live-verified 2026-11-17 (https://kisii.go.ke/, Tender Notice in Resources). */
export const kenyaKisiiSite = makeKenyaCountySite({ slug: "kisii", county: "Kisii", listUrl: "https://kisii.go.ke/" });

/** Nyamira County — live-verified 2026-11-17 (https://nyamira.go.ke/, Tender Documents 58). */
export const kenyaNyamiraSite = makeKenyaCountySite({ slug: "nyamira", county: "Nyamira", listUrl: "https://nyamira.go.ke/" });

/** Uasin Gishu County — live-verified 2026-11-17 (https://uasingishu.go.ke/, Tenders in header quick links). */
export const kenyaUasinGishuSite = makeKenyaCountySite({ slug: "uasingishu", county: "Uasin Gishu", listUrl: "https://uasingishu.go.ke/" });

/** Machakos County — live-verified 2026-11-17 (https://machakos.go.ke/, E-Services + procurement pages). */
export const kenyaMachakosSite = makeKenyaCountySite({ slug: "machakos", county: "Machakos", listUrl: "https://machakos.go.ke/" });

/** Kilifi County — live-verified 2026-11-17 (https://kilifi.go.ke/, minimal homepage, procurement under Resources). */
export const kenyaKilifiSite = makeKenyaCountySite({ slug: "kilifi", county: "Kilifi", listUrl: "https://kilifi.go.ke/" });

/** Kwale County — live-verified 2026-11-17 (https://kwale.go.ke/, live tender table with IFMIS negotiation numbers). */
export const kenyaKwaleSite = makeKenyaCountySite({ slug: "kwale", county: "Kwale", listUrl: "https://kwale.go.ke/" });

/** Meru County — live-verified 2026-11-17 (https://meru.go.ke/, Projects & Programs / SAGAs). */
export const kenyaMeruSite = makeKenyaCountySite({ slug: "meru", county: "Meru", listUrl: "https://meru.go.ke/" });

/** Embu County — live-verified 2026-11-17 (https://embu.go.ke/, Opportunities > Tenders). */
export const kenyaEmbuSite = makeKenyaCountySite({ slug: "embu", county: "Embu", listUrl: "https://embu.go.ke/" });

/** Narok County — live-verified 2026-11-17 (https://narok.go.ke/, Tender Documents under Resources). */
export const kenyaNarokSite = makeKenyaCountySite({ slug: "narok", county: "Narok", listUrl: "https://narok.go.ke/" });

/** Nyeri County — verified 2026-11-17 (https://www.nyeri.go.ke/cgntenders/, live CGN tender table; homepage blocks direct fetch, tenders page is the verified entry point). */
export const kenyaNyeriSite = makeKenyaCountySite({ slug: "nyeri", county: "Nyeri", listUrl: "https://www.nyeri.go.ke/cgntenders/" });

/**
 * REREC — live-verified 2026-11-17 (https://rerec.co.ke/tenders/; 836 tender notices,
 * 1136 tender documents; live "INVITATION TO TENDER" rows dated Nov 2026). Table rows
 * carry the tender title, published date and a Download link.
 */
export const kenyaRerecSite: HtmlSiteConfig = {
  listUrl: "https://rerec.co.ke/tenders/",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "table tbody tr, .tender-item, article, .card, .views-row, a[href*='tender'], a[href*='Tender'], a[href*='.pdf'], a[href*='download']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const cells = [...row.querySelectorAll("td")];
    let titleText = text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.title")?.textContent);
    if (!titleText && cells.length >= 2) titleText = text(cells[1]?.textContent) ?? text(cells[0]?.textContent);
    if (!titleText) titleText = text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    const titleTrim = titleText.trim();
    if (!/tender|procure|bid|quotation|eoi|notice|award|invitation/i.test(titleTrim)) return null;
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
    const sourceUrl = resolveHref(href, baseUrl, "/tenders/");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-rerec", referenceNumber ?? `${titleTrim}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender Notice",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: "Rural Electrification and Renewable Energy Corporation (REREC)",
      publisher: "REREC",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleTrim, closingText, url: sourceUrl } };
  },
};

/**
 * Ministry of Health Kenya — live-verified 2026-11-17 (https://www.health.go.ke/;
 * Tenders under Adverts). Generic tender-link extraction on the official MoH site.
 */
export const kenyaMohSite: HtmlSiteConfig = {
  listUrl: "https://www.health.go.ke/",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "article, .post, .tender-item, .card, table tbody tr, .entry, .views-row, .wp-block-post, a[href*='tender'], a[href*='Tender'], a[href*='.pdf'], a[href*='/download/']",
  extract(row, _document, baseUrl) {
    const isAnchor = (row as Element).tagName?.toLowerCase() === "a";
    const link = (isAnchor ? (row as Element) : (row.querySelector("h1 a[href], h2 a[href], h3 a[href], h4 a[href], a[href*='tender'], a[href*='Tender'], a[href*='.pdf'], a[href*='/download/'], a[href]"))) as Element | null;
    const href = text(link?.getAttribute("href"));
    let titleText = text(row.querySelector("h1,h2,h3,h4,.entry-title,.title,.tender-title")?.textContent)
      ?? text(link?.getAttribute("title"))
      ?? text(link?.textContent)
      ?? text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    const titleTrim = titleText.trim();
    if (/^(home|about|contact|news|events|gallery|documents|departments|services|faqs?|jobs?|careers?|downloads?|tenders?|resources|media|staff mail|e-?services|projects?|public notices?|press releases?)$/i.test(titleTrim)) return null;
    const sourceUrl = resolveHref(href, baseUrl, "/");
    const hay = `${titleTrim} ${sourceUrl}`;
    if (!/tender|procure|rfq|rfp|bid|quotation|eoi|expression of interest|notice|addendum|request for proposal|invitation|advert/i.test(hay)) return null;
    if (/\/tenders?\/?$/.test(sourceUrl) && !/tender|procure|rfq|rfp|bid|quotation|eoi/i.test(titleTrim)) return null;
    const cells = [...row.querySelectorAll("td")];
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-moh", referenceNumber ?? `${titleTrim}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender Notice",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: "Ministry of Health, Kenya",
      publisher: "Ministry of Health, Kenya",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleTrim, closingText, url: sourceUrl } };
  },
};

/**
 * ICT Authority Kenya — live-verified 2026-11-17 (https://icta.go.ke/; Tenders menu +
 * procurement notices; ict.go.ke unreachable, official domain is icta.go.ke).
 */
export const kenyaIctaSite: HtmlSiteConfig = {
  listUrl: "https://icta.go.ke/",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "article, .post, .tender-item, .card, table tbody tr, .entry, .views-row, .wp-block-post, a[href*='tender'], a[href*='Tender'], a[href*='.pdf'], a[href*='/download/']",
  extract(row, _document, baseUrl) {
    const isAnchor = (row as Element).tagName?.toLowerCase() === "a";
    const link = (isAnchor ? (row as Element) : (row.querySelector("h1 a[href], h2 a[href], h3 a[href], h4 a[href], a[href*='tender'], a[href*='Tender'], a[href*='.pdf'], a[href*='/download/'], a[href]"))) as Element | null;
    const href = text(link?.getAttribute("href"));
    let titleText = text(row.querySelector("h1,h2,h3,h4,.entry-title,.title,.tender-title")?.textContent)
      ?? text(link?.getAttribute("title"))
      ?? text(link?.textContent)
      ?? text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    const titleTrim = titleText.trim();
    if (/^(home|about|contact|news|events|gallery|documents|departments|services|faqs?|jobs?|careers?|downloads?|tenders?|resources|media|staff mail|e-?services|projects?|public notices?|press releases?|careers)$/.test(titleTrim.toLowerCase())) return null;
    const sourceUrl = resolveHref(href, baseUrl, "/");
    const hay = `${titleTrim} ${sourceUrl}`;
    if (!/tender|procure|rfq|rfp|bid|quotation|eoi|expression of interest|notice|addendum|request for proposal|invitation|advert/i.test(hay)) return null;
    if (/\/tenders?\/?$/.test(sourceUrl) && !/tender|procure|rfq|rfp|bid|quotation|eoi/i.test(titleTrim)) return null;
    const cells = [...row.querySelectorAll("td")];
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-icta", referenceNumber ?? `${titleTrim}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender Notice",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: "ICT Authority, Kenya",
      publisher: "ICT Authority, Kenya",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleTrim, closingText, url: sourceUrl } };
  },
};

/** AGPO Kenya — opportunities/tenders listing (best-effort). */
export const kenyaAgpoSite: HtmlSiteConfig = {
  useBrowser: true,
  listUrl: "https://www.agpo.go.ke/pages/tenders",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "table#tenderTable tbody tr, table.dataTable tbody tr, table tbody tr, article, .tender-item, .opportunity, .views-row, .entry-content li, .card, a[href*='tender'], a[href*='Tender'], a[href*='opportun'], a[href*='notice']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const cells = [...row.querySelectorAll("td")];
    let titleText = text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.title")?.textContent);
    if (!titleText && cells.length >= 2) titleText = text(cells[1]?.textContent) ?? text(cells[0]?.textContent);
    if (!titleText) titleText = text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
    const sourceUrl = resolveHref(href, baseUrl, "/pages/tenders");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-agpo", referenceNumber ?? `${titleText}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender Notice",
      referenceNumber,
      countryCode: "KE",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: null,
      publisher: "AGPO Kenya",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
  },
};

/** Nairobi City County — procurement/tenders (best-effort). */
export const kenyaNairobiSite: HtmlSiteConfig = {
  listUrl: "https://nairobi.go.ke/downloads/",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "table tbody tr, article, .post, .tender, .entry, .views-row, .wp-block-post, .download-item, a[href*='.pdf'], a[href*='tender'], a[href*='Tender']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const titleText = text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.entry-title,.title")?.textContent) ?? text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    const cells = [...row.querySelectorAll("td")];
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
    const sourceUrl = resolveHref(href, baseUrl, "/tenders/");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-nairobi", referenceNumber ?? `${titleText}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender Notice",
      referenceNumber,
      countryCode: "KE",
      region: "Nairobi",
      city: "Nairobi",
      issuingInstitution: null,
      procuringOrganization: "Nairobi City County Government",
      publisher: "Nairobi City County",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
  },
};

/** Mombasa County — procurement/tenders (best-effort). */
export const kenyaMombasaSite: HtmlSiteConfig = {
  listUrl: "https://web.mombasa.go.ke/tenders/",
  useBrowser: true,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: ".wpdm-item, .package-card, .card, article, .post, .tender-item, table tbody tr, a[href*='/download/'], a[href*='.pdf']",
  extract(row, _document, baseUrl) {
    const isAnchor = (row as Element).tagName?.toLowerCase() === "a";
    // Prefer explicit tender/download links; avoid nav/header links
    const link = (isAnchor ? (row as Element) : (row.querySelector("a[href*='/download/'], a[href*='.pdf'], h3 a[href], h2 a[href], .wpdm-download-link, a[href]"))) as Element | null;
    const href = text(link?.getAttribute("href"));
    let titleText = text(row.querySelector("h1,h2,h3,h4,.entry-title,.title,.package-title,.wpdm_package_title")?.textContent)
      ?? text(link?.getAttribute("title"))
      ?? text(link?.textContent)
      ?? text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    const titleTrim = titleText.trim();
    // Skip obvious navigation/menu items and non-tender cards
    if (/^(home|about|contact|news|events|gallery|documents|departments|services|faqs?|jobs?|careers?|expired tenders|video gallery|policy documents|press releases|roads manual|traffic safety park|downloads?|tenders?)$/i.test(titleTrim)) return null;
    if (/^(about cgm|office of|cookie policy|e-services|digital services)$/i.test(titleTrim)) return null;
    const sourceUrl = resolveHref(href, baseUrl, "/tenders/");
    const hay = `${titleTrim} ${sourceUrl}`;
    // Require tender/procurement signal or a download detail page/PDF
    if (!/tender|procure|rfq|rfp|bid|quotation|eoi|expression of interest|notice|addendum|request for proposal|invitation/i.test(hay) && !/\/download\/|\.pdf/i.test(hay)) return null;
    // Avoid generic category/navigation URLs
    if (/\/tenders\/?$/.test(sourceUrl) && !/tender|procure|rfq|rfp|bid|quotation|eoi/i.test(titleTrim)) return null;
    const cells = [...row.querySelectorAll("td")];
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-mombasa", referenceNumber ?? `${titleTrim}-${sourceUrl}`);
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Tender Notice",
      referenceNumber,
      countryCode: "KE",
      region: "Mombasa",
      city: "Mombasa",
      issuingInstitution: null,
      procuringOrganization: "County Government of Mombasa",
      publisher: "Mombasa County",
      publishedAt: null,
      sourceDeadlineText: closingText?.slice(0, 500) ?? null,
      closingAt,
      timeZone: closingAt ? "Africa/Nairobi" : null,
      status: deadlineStatus(closingAt, new Date()),
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
  },
};

/**
 * Best-effort tender-list scraper for the national/agency sources verified on
 * 2026-11-17 in Ghana, Egypt and Morocco (see the matching *-deep-source-inventory.md
 * docs in docs/source-catalog/). These notices are mostly table rows or anchor lists
 * with a reference number, an object/title and a closing date; French and Arabic
 * tender signals are included.
 */
interface MainMarketSiteOptions {
  slug: string;
  publisher: string;
  listUrl: string;
  countryCode: "GH" | "EG" | "MA";
  timeZone: "Africa/Accra" | "Africa/Cairo" | "Africa/Casablanca";
}

function makeMainMarketTenderSite(options: MainMarketSiteOptions): HtmlSiteConfig {
  const { slug, publisher, listUrl, countryCode, timeZone } = options;
  return {
    listUrl,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    selector: "table tbody tr, article, .tender-item, .entry, .views-row, li, a[href*='tender'], a[href*='Tender'], a[href*='appel'], a[href*='offre'], a[href*='avis'], a[href*='.pdf'], a[href*='download']",
    extract(row, _document, baseUrl) {
      const isAnchor = (row as Element).tagName?.toLowerCase() === "a";
      const link = isAnchor ? (row as Element) : (row.querySelector("a[href*='tender'], a[href*='Tender'], a[href*='appel'], a[href*='offre'], a[href*='avis'], a[href*='.pdf'], a[href*='download'], h1 a[href], h2 a[href], h3 a[href], a[href]")) as Element | null;
      const href = text(link?.getAttribute("href"));
      const cells = [...row.querySelectorAll("td")];
      const titleText = text(row.querySelector("h1,h2,h3,h4,.entry-title,.title,.tender-title")?.textContent)
        ?? text(link?.getAttribute("title"))
        ?? text(link?.textContent)
        ?? text(cells.length > 1 ? cells[1].textContent : null)
        ?? text(row.textContent);
      if (!titleText || titleText.length < 8) return null;
      const titleTrim = titleText.trim();
      if (/^(home|about|contact|news|tenders?|appels? d'offres?|avis|consultations|résultats|results|documents|services|login|se connecter)$/i.test(titleTrim)) return null;
      const sourceUrl = resolveHref(href, baseUrl, "/");
      const hay = `${titleTrim} ${sourceUrl}`;
      if (!/tender|procure|rfq|rfp|bid|quotation|eoi|invitation|notice|advert|appel|offre|consultation|avis|مناقص|عطاء|إعلان/i.test(hay)) return null;
      const referenceNumber = cells.length ? text(cells[0]?.textContent)?.slice(0, 200) ?? null : null;
      const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent)
        ?? (cells.length > 2 ? text(cells[2]?.textContent) : null);
      const closingAt = parseFlexibleDate(closingText);
      const externalId = slugifyId(slug, referenceNumber ?? `${titleTrim}-${sourceUrl}`);
      const parsed: ParsedSourceOpportunity = {
        externalId,
        title: titleTrim.slice(0, 1000),
        description: null,
        sourceCategoryTerm: "Tender Notice",
        referenceNumber,
        countryCode,
        region: null,
        city: null,
        issuingInstitution: null,
        procuringOrganization: publisher,
        publisher,
        publishedAt: null,
        sourceDeadlineText: closingText?.slice(0, 500) ?? null,
        closingAt,
        timeZone: closingAt ? timeZone : null,
        status: deadlineStatus(closingAt, new Date()),
        sourceUrl,
        canonicalUrl: null,
        currency: null,
        amount: null,
        originalValues: { referenceNumber, closingText, documentLink: href },
      };
      return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleTrim, closingText, url: sourceUrl } };
    },
  };
}

/** Ghana — verified 2026-11-17; see ghana-deep-source-inventory.md. */
export const ghanaGhanepsSite = makeMainMarketTenderSite({ slug: "gh-ghaneps", publisher: "Ghana Electronic Procurement System", listUrl: "https://www.ghaneps.gov.gh/", countryCode: "GH", timeZone: "Africa/Accra" });
export const ghanaPpaSite = makeMainMarketTenderSite({ slug: "gh-ppa", publisher: "Public Procurement Authority, Ghana", listUrl: "https://tenders.ppa.gov.gh/tenders", countryCode: "GH", timeZone: "Africa/Accra" });
export const ghanaMofSite = makeMainMarketTenderSite({ slug: "gh-mof", publisher: "Ministry of Finance, Ghana", listUrl: "https://www.mofep.gov.gh/", countryCode: "GH", timeZone: "Africa/Accra" });
export const ghanaMohSite = makeMainMarketTenderSite({ slug: "gh-moh", publisher: "Ministry of Health, Ghana", listUrl: "https://www.moh.gov.gh/", countryCode: "GH", timeZone: "Africa/Accra" });
export const ghanaNpaSite = makeMainMarketTenderSite({ slug: "gh-npa", publisher: "National Petroleum Authority, Ghana", listUrl: "https://npa.gov.gh/", countryCode: "GH", timeZone: "Africa/Accra" });

/** Egypt — verified 2026-11-17; see egypt-deep-source-inventory.md. */
export const egyptGagsSite = makeMainMarketTenderSite({ slug: "eg-gags", publisher: "General Authority for Government Services, Egypt", listUrl: "https://gags.gov.eg/", countryCode: "EG", timeZone: "Africa/Cairo" });
export const egyptEpsGagsSite = makeMainMarketTenderSite({ slug: "eg-epsgags", publisher: "Public e-Procurement System (GAGS), Egypt", listUrl: "https://eps-gags.gov.eg/", countryCode: "EG", timeZone: "Africa/Cairo" });
export const egyptGcsSite = makeMainMarketTenderSite({ slug: "eg-gcs", publisher: "General Contracting Portal, Egypt", listUrl: "https://gcs.digitalegypt.gov.eg/", countryCode: "EG", timeZone: "Africa/Cairo" });
export const egyptSczoneSite = makeMainMarketTenderSite({ slug: "eg-sczone", publisher: "Suez Canal Economic Zone", listUrl: "https://sczone.eg/tenders", countryCode: "EG", timeZone: "Africa/Cairo" });
export const egyptMisrPetroleumSite = makeMainMarketTenderSite({ slug: "eg-misr-petroleum", publisher: "Misr Petroleum Company", listUrl: "https://www.misrpetroleum.com.eg/tenders.html", countryCode: "EG", timeZone: "Africa/Cairo" });
export const egyptAcudSite = makeMainMarketTenderSite({ slug: "eg-acud", publisher: "Administrative Capital for Urban Development", listUrl: "https://acud.eg/", countryCode: "EG", timeZone: "Africa/Cairo" });

/** Morocco — verified 2026-11-17; see morocco-deep-source-inventory.md. */
export const moroccoPmmpSite: HtmlSiteConfig = {
  ...makeMainMarketTenderSite({ slug: "ma-pmmp", publisher: "Portail Marocain des Marchés Publics", listUrl: "https://www.marchespublics.gov.ma/bdc/entreprise/consultation/", countryCode: "MA", timeZone: "Africa/Casablanca" }),
  selector: "table tbody tr, .list-group-item, article, a[href*='consultation']",
};