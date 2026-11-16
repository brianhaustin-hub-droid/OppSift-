import { z } from "zod";
import { parsedSourceOpportunitySchema } from "./contracts";

const maximumTextBytes = 2_000_000;
const maximumRows = 10_000;
const maximumFields = 200;

function assertSize(value: string) {
  if (new TextEncoder().encode(value).byteLength > maximumTextBytes) {
    throw new Error("Source document exceeds the configured parser size limit.");
  }
}

export type CsvParseResult =
  | { success: true; headers: string[]; rows: Array<Record<string, string>>; errors: [] }
  | { success: false; headers: string[]; rows: Array<Record<string, string>>; errors: string[] };

export function parseCsv(input: string): CsvParseResult {
  if (new TextEncoder().encode(input).byteLength > maximumTextBytes) {
    return {
      success: false,
      headers: [],
      rows: [],
      errors: ["Source document exceeds the configured parser size limit."],
    };
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const errors: string[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index] ?? "";
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
      if (row.length > maximumFields) errors.push(`CSV row ${rows.length + 1} exceeds the field limit.`);
    } else if (character === "\n" || character === "\r") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      if (rows.length > maximumRows) {
        errors.push("CSV document exceeds the configured row limit.");
        break;
      }
    } else {
      field += character;
    }
  }

  if (quoted) errors.push("CSV document has an unterminated quoted field.");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  const headers = (rows.shift() ?? []).map((header) => header.trim().replace(/^\uFEFF/, ""));
  if (headers.length === 0 || headers.some((header) => header.length === 0)) {
    errors.push("CSV document requires non-empty header names.");
  }
  if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) {
    errors.push("CSV header names must be unique, ignoring case.");
  }

  const dataRows: Array<Record<string, string>> = [];
  for (const [index, values] of rows.entries()) {
    if (values.length !== headers.length) {
      errors.push(`CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}.`);
      continue;
    }
    dataRows.push(Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""])));
  }

  return errors.length > 0
    ? { success: false, headers, rows: dataRows, errors }
    : { success: true, headers, rows: dataRows, errors: [] };
}

const csvOpportunityMappingSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  sourceCategoryTerm: z.string().min(1),
  countryCode: z.string().min(1),
  publisher: z.string().min(1),
  sourceUrl: z.string().min(1),
  description: z.string().optional(),
  referenceNumber: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  issuingInstitution: z.string().optional(),
  procuringOrganization: z.string().optional(),
  publishedAt: z.string().optional(),
  sourceDeadlineText: z.string().optional(),
  closingAt: z.string().optional(),
  timeZone: z.string().optional(),
  status: z.string().optional(),
  canonicalUrl: z.string().optional(),
  currency: z.string().optional(),
  amount: z.string().optional(),
});

export type CsvOpportunityField = keyof z.input<typeof csvOpportunityMappingSchema>;
export type CsvColumnMapping = Partial<Record<CsvOpportunityField, string>>;

export function mapCsvRowsToOpportunities(
  parsedCsv: CsvParseResult,
  mapping: CsvColumnMapping,
) {
  if (!parsedCsv.success) {
    return {
      records: [] as Array<z.infer<typeof parsedSourceOpportunitySchema>>,
      rejected: parsedCsv.rows.map((row, index) => ({
        rowNumber: index + 2,
        errors: parsedCsv.errors,
        original: row,
      })),
    };
  }

  const records: Array<z.infer<typeof parsedSourceOpportunitySchema>> = [];
  const rejected: Array<{ rowNumber: number; errors: string[]; original: Record<string, string> }> = [];
  for (const [index, row] of parsedCsv.rows.entries()) {
    const candidate: Record<string, string | undefined> = {};
    for (const [field, column] of Object.entries(mapping)) {
      if (column) candidate[field] = row[column];
    }
    const mapped = csvOpportunityMappingSchema.safeParse(candidate);
    if (!mapped.success) {
      rejected.push({
        rowNumber: index + 2,
        errors: mapped.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
        original: row,
      });
      continue;
    }

    const parsed = parsedSourceOpportunitySchema.safeParse({
      ...mapped.data,
      description: mapped.data.description || null,
      referenceNumber: mapped.data.referenceNumber || null,
      region: mapped.data.region || null,
      city: mapped.data.city || null,
      issuingInstitution: mapped.data.issuingInstitution || null,
      procuringOrganization: mapped.data.procuringOrganization || null,
      publishedAt: mapped.data.publishedAt || null,
      sourceDeadlineText: mapped.data.sourceDeadlineText || null,
      closingAt: mapped.data.closingAt || null,
      timeZone: mapped.data.timeZone || null,
      status: mapped.data.status || "unknown",
      canonicalUrl: mapped.data.canonicalUrl || null,
      currency: mapped.data.currency || null,
      amount: mapped.data.amount || null,
      originalValues: row,
    });
    if (!parsed.success) {
      rejected.push({
        rowNumber: index + 2,
        errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
        original: row,
      });
      continue;
    }
    records.push(parsed.data);
  }
  return { records, rejected };
}

export type ParsedFeedEntry = {
  id: string;
  title: string;
  link: string;
  publishedAt: string | null;
  updatedAt: string | null;
  summary: string | null;
  content: string | null;
  author: string | null;
};

function decodeXmlText(value: string) {
  const withoutCdata = value.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/u, "$1");
  if (/&(?!#x[0-9a-f]+;|#\d+;|amp;|lt;|gt;|quot;|apos;)/iu.test(withoutCdata)) {
    throw new Error("XML contains an unsupported or undeclared entity.");
  }
  return withoutCdata
    .replace(/&#x([0-9a-f]+);/giu, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/gu, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'");
}

function xmlField(xml: string, names: readonly string[]) {
  for (const name of names) {
    const expression = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}\\s*>`, "iu");
    const match = xml.match(expression);
    if (match?.[1] !== undefined) {
      const text = match[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>|<[^>]*>/gu, (_tag, cdata: string | undefined) => cdata ?? "")
        .trim();
      return decodeXmlText(text);
    }
  }
  return null;
}

export function parseSyndicationFeed(xml: string): ParsedFeedEntry[] {
  assertSize(xml);
  if (/<!DOCTYPE|<!ENTITY/iu.test(xml)) throw new Error("DTD and entity declarations are not permitted in source XML.");
  if (!/^\s*(?:<\?xml[^>]*>\s*)?(?:<rss\b|<feed\b|<rdf:RDF\b)/iu.test(xml)) {
    throw new Error("Expected an RSS, Atom, or RSS RDF feed document.");
  }
  parseXmlRecordFeed(xml);
  const entryTag = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>|<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry\s*>/giu;
  const entries: ParsedFeedEntry[] = [];
  for (const match of xml.matchAll(entryTag)) {
    if (entries.length >= maximumRows) throw new Error("Feed exceeds the configured entry limit.");
    const body = match[1] ?? match[2] ?? "";
    const linkHref = body.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/iu)?.[1];
    const linkText = xmlField(body, ["link"]);
    const id = xmlField(body, ["guid", "id"]);
    const title = xmlField(body, ["title"]);
    const link = linkHref ?? linkText ?? id;
    if (!id && !link) throw new Error(`Feed entry ${entries.length + 1} is missing a stable identifier.`);
    entries.push({
      id: id ?? link ?? "",
      title: title ?? "",
      link: link ?? "",
      publishedAt: xmlField(body, ["pubDate", "published", "dc:date"]),
      updatedAt: xmlField(body, ["updated", "lastBuildDate"]),
      summary: xmlField(body, ["description", "summary", "subtitle"]),
      content: xmlField(body, ["content:encoded", "content"]),
      author: xmlField(body, ["author", "dc:creator"]),
    });
  }
  return entries;
}

export function parseJsonFeed(input: string, maxBytes = maximumTextBytes) {
  if (new TextEncoder().encode(input).byteLength > maxBytes) {
    throw new Error("JSON feed exceeds the configured parser size limit.");
  }
  const parsed: unknown = JSON.parse(input);
  const feed = z.object({
    items: z.array(z.record(z.string(), z.unknown())).max(maximumRows),
  }).safeParse(parsed);
  if (!feed.success) throw new Error("JSON feed must contain an items array of records.");
  return feed.data.items;
}

export function parseXmlRecordFeed(input: string) {
  assertSize(input);
  if (/<!DOCTYPE|<!ENTITY/iu.test(input)) throw new Error("DTD and entity declarations are not permitted in source XML.");
  const tokens = /<!--[\s\S]*?-->|<\?xml[^?]*\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[\w:.-]+(?:\s+[^<>]*?)?\/?>|[^<]+/giu;
  type XmlNode = { name: string; text: string[]; children: XmlNode[] };
  const roots: XmlNode[] = [];
  const stack: XmlNode[] = [];
  let cursor = 0;
  let nodeCount = 0;
  let token: RegExpExecArray | null;
  while ((token = tokens.exec(input)) !== null) {
    if (token.index !== cursor) throw new Error("XML document contains malformed markup.");
    cursor = tokens.lastIndex;
    const value = token[0];
    if (value.startsWith("<!--") || value.startsWith("<?xml")) continue;
    if (value.startsWith("<![CDATA[")) {
      if (stack.length === 0) throw new Error("XML CDATA appears outside the root element.");
      stack[stack.length - 1]?.text.push(value.slice(9, -3));
      continue;
    }
    if (value.startsWith("</")) {
      const name = value.slice(2, -1).trim();
      const current = stack.pop();
      if (!current || current.name !== name) throw new Error("XML closing tag does not match its opening tag.");
      continue;
    }
    if (value.startsWith("<")) {
      const selfClosing = value.endsWith("/>");
      const name = value.slice(1, selfClosing ? -2 : -1).trim().match(/^[\w:.-]+/u)?.[0];
      if (!name || /^(script|iframe|object|embed)$/iu.test(name)) {
        throw new Error("XML contains an invalid or executable element.");
      }
      const node: XmlNode = { name, text: [], children: [] };
      nodeCount += 1;
      if (nodeCount > maximumRows * maximumFields || stack.length >= 64) {
        throw new Error("XML document exceeds configured structural limits.");
      }
      const parent = stack[stack.length - 1];
      if (parent) parent.children.push(node);
      else roots.push(node);
      if (!selfClosing) stack.push(node);
      continue;
    }
    if (stack.length > 0) stack[stack.length - 1]?.text.push(decodeXmlText(value));
    else if (value.trim()) throw new Error("XML has text outside its root element.");
  }
  if (cursor !== input.length || stack.length !== 0 || roots.length !== 1) {
    throw new Error("XML document is malformed or has mismatched elements.");
  }

  function toValue(node: XmlNode): unknown {
    const result: Record<string, unknown> = {};
    for (const child of node.children) {
      const value = toValue(child);
      if (Object.hasOwn(result, child.name)) {
        const existing = result[child.name];
        result[child.name] = Array.isArray(existing) ? [...existing, value] : [existing, value];
      } else {
        result[child.name] = value;
      }
    }
    const text = node.text.join("").trim();
    if (Object.keys(result).length === 0) return text;
    if (text) result._text = text;
    return result;
  }
  const root = roots[0];
  if (!root) throw new Error("XML root element is missing.");
  return { [root.name]: toValue(root) };
}
