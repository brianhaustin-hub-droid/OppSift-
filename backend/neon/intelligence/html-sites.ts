import type { ParsedSourceOpportunity } from "./contracts";
import type { HtmlSiteConfig } from "./html-list-connector";

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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
  listUrl: "https://gppagal.gov.gm/",
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
  listUrl: "https://ppra.co.bw/",
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
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "table tbody tr, .table tbody tr, .list-group-item, article, .card, .row .col, div[class*='marche'], a[href*='marche'], a[href*='avis']",
  extract(row, _document, baseUrl) {
    const link = row.querySelector("a[href]");
    const href = text(link?.getAttribute("href"));
    const cells = [...row.querySelectorAll("td")];
    let titleText = text(link?.textContent) ?? text(row.querySelector("h1, h2, h3, h4, .title, strong")?.textContent);
    if (!titleText && cells.length >= 1) titleText = text(cells[0]?.textContent) ?? text(cells[1]?.textContent);
    if (!titleText) titleText = text(row.textContent);
    if (!titleText || titleText.length < 6) return null;
    if (/accueil|connexion|contact|recherche|menu|login/i.test(titleText)) return null;
    const sourceUrl = href ? new URL(href.replace(/&amp;/gu, "&"), baseUrl).toString() : new URL(baseUrl).toString();
    const referenceNumber = cells.length ? (text(cells[0]?.textContent)?.slice(0, 200) ?? null) : null;
    const externalId = `mg-${(referenceNumber ?? titleText).toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 120)}`;
    const parsed: ParsedSourceOpportunity = {
      externalId,
      title: titleText.slice(0, 1000),
      description: null,
      sourceCategoryTerm: "Avis d'appel d'offres",
      referenceNumber,
      countryCode: "MG",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: null,
      publisher: "Autorité de Régulation des Marchés Publics (ARMP) Madagascar",
      publishedAt: null,
      sourceDeadlineText: null,
      closingAt: null,
      timeZone: "Indian/Antananarivo",
      status: "unknown",
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: { title: titleText, url: sourceUrl },
    };
    return { externalId, sourceUrl, parsed, payload: { title: titleText, url: sourceUrl } };
  },
};

/**
 * Malawi — ppdamlawi.org public procurement notices.
 */
export const malawiSite: HtmlSiteConfig = {
  listUrl: "https://ppda.mw/",
  headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html,application/xhtml+xml" },
  selector: "article",
  extract(row, _document, baseUrl) {
    const title = text(row.querySelector("h1, h2, h3")?.textContent);
    if (!title) return null;
    const sourceUrl = new URL(baseUrl).toString();
    const parsed: ParsedSourceOpportunity = {
      externalId: `mw-${title.slice(0, 80)}`,
      title,
      description: null,
      sourceCategoryTerm: "Invitation for Bids",
      referenceNumber: null,
      countryCode: "MW",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: null,
      publisher: "Malawi Public Procurement ... Authority",
      publishedAt: null,
      sourceDeadlineText: null,
      closingAt: null,
      timeZone: null,
      status: "unknown",
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: {},
    };
    return { externalId: parsed.externalId, sourceUrl, parsed, payload: { title } };
  },
};

/**
 * Mozambique — sisac.mf.gov.mz public procurement notices.
 */
export const mozambiqueSite: HtmlSiteConfig = {
  listUrl: "https://www.ufsa.gov.mz/",
  headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html,application/xhtml+xml" },
  selector: "article",
  extract(row, _document, baseUrl) {
    const title = text(row.querySelector("h1, h2, h3")?.textContent);
    if (!title) return null;
    const sourceUrl = new URL(baseUrl).toString();
    const parsed: ParsedSourceOpportunity = {
      externalId: `mz-${title.slice(0, 80)}`,
      title,
      description: null,
      sourceCategoryTerm: "Invitation for Bids",
      referenceNumber: null,
      countryCode: "MZ",
      region: null,
      city: null,
      issuingInstitution: null,
      procuringOrganization: null,
      publisher: "Mozambique public procurement information system",
      publishedAt: null,
      sourceDeadlineText: null,
      closingAt: null,
      timeZone: null,
      status: "unknown",
      sourceUrl,
      canonicalUrl: null,
      currency: null,
      amount: null,
      originalValues: {},
    };
    return { externalId: parsed.externalId, sourceUrl, parsed, payload: { title } };
  },
};

function slugifyId(prefix: string, value: string): string {
  return `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 80)}`;
}

function parseFlexibleDate(value: string | null): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  const iso = Date.parse(raw);
  if (!Number.isNaN(iso)) return new Date(iso).toISOString();
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/u.exec(raw);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? Number(`20${y}`) : Number(y);
    const dt = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  const dMonY = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/u.exec(raw);
  if (dMonY) {
    const [, d, mon, y, hh, mm] = dMonY;
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const mi = months.indexOf(mon.toLowerCase().slice(0, 3));
    if (mi >= 0) {
      const dt = new Date(Date.UTC(Number(y), mi, Number(d), Number(hh ?? 0), Number(mm ?? 0)));
      return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
    }
  }
  return null;
}

function resolveHref(href: string | null | undefined, baseUrl: string, fallbackPath: string): string {
  const clean = text(href)?.replace(/&amp;/gu, "&");
  if (!clean || clean === "#" || clean.toLowerCase().startsWith("javascript:")) {
    return new URL(fallbackPath, baseUrl).toString();
  }
  try {
    return new URL(clean, baseUrl).toString();
  } catch {
    return new URL(fallbackPath, baseUrl).toString();
  }
}

/** Kenya Railways Corporation — public tenders listing (TablePress). */
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
  selector: "table tbody tr, article, .post, .entry, .document-icon-row, .dg-documents a, ul li a, .entry-content a[href]",
  extract(row, _document, baseUrl) {
    const link = row.matches?.("a") ? row : row.querySelector("a[href]") ?? (row as Element);
    if (!(link as Element)?.getAttribute?.("href") && !row.querySelector("a[href]")) return null;
    const href = text(link?.getAttribute("href"));
    const titleText = text(link?.textContent) ?? text(row.querySelector("h1,h2,h3,h4,.title,.entry-title")?.textContent) ?? text(row.textContent);
    if (!titleText || titleText.length < 8) return null;
    if (/^download$/i.test(titleText)) return null;
    const cells = [...row.querySelectorAll("td")];
    const referenceNumber = cells.length ? text(cells[0]?.textContent) : null;
    const closingText = text(row.querySelector("time,.date,.closing-date")?.textContent) ?? (cells.length > 1 ? text(cells[cells.length - 2]?.textContent) : null);
    const sourceUrl = resolveHref(href, baseUrl, "/tender-documents-2");
    const closingAt = parseFlexibleDate(closingText);
    const externalId = slugifyId("ke-kura", referenceNumber ?? `${titleText}-${sourceUrl}`);
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
      originalValues: { referenceNumber, closingText, documentLink: href },
    };
    return { externalId, sourceUrl, parsed, payload: { referenceNumber, title: titleText, closingText, url: sourceUrl } };
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
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  selector: "table tbody tr, article, .post, .tender, .entry, .views-row, .wp-block-post, .download-item, .elementor-widget-container a, .entry-content a, a[href*='download'], a[href*='tender'], a[href*='Tender'], a[href*='.pdf']",
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
    const externalId = slugifyId("ke-mombasa", referenceNumber ?? `${titleText}-${sourceUrl}`);
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