import { z } from "zod";

const categorySchema = z.enum(["government", "grants", "commercial"]);
// UUID-shape, not RFC variant enforcement: source ids are minted by our own
// activation migrations and several use synthetic ids outside the RFC
// variant range (see intelligence/contracts.ts uuidShapeSchema).
const uuidShape = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const sortSchema = z.enum([
  "relevance",
  "recent",
  "closing",
  "value",
  "updated",
]);

const dateSchema = z.iso.date();
const regionSchema = z.enum([
  "africa",
  "asia",
  "europe",
  "north_america",
  "south_america",
  "oceania",
  "antarctica",
  "other",
]);
const codeList = (pattern: RegExp, limit = 30) =>
  z.array(z.string().regex(pattern)).max(limit).refine(
    (values) => new Set(values).size === values.length,
    "Filter values must be unique.",
  );

export const searchRequestSchema = z
  .object({
    query: z.string().trim().max(300).default(""),
    countries: codeList(/^[A-Z]{2}$/).default([]),
    regions: z.array(regionSchema).max(8).default([]),
    categories: z.array(categorySchema).max(3).default([]),
    opportunityTypes: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
    industries: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
    publishers: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
    sourceIds: z.array(uuidShape).max(30).default([]),
    languages: codeList(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/).default([]),
    publishedFrom: dateSchema.optional(),
    publishedTo: dateSchema.optional(),
    closingFrom: dateSchema.optional(),
    closingTo: dateSchema.optional(),
    statuses: z
      .array(z.enum(["open", "closed", "cancelled", "awarded", "unknown"]))
      .max(5)
      .default([]),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    minimumValue: z.number().finite().nonnegative().optional(),
    maximumValue: z.number().finite().nonnegative().optional(),
    verification: z.enum(["any", "verified", "unverified"]).default("any"),
    sort: sortSchema.default("relevance"),
    page: z.number().int().min(1).max(100_000).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  })
  .strict()
  .superRefine((request, context) => {
    if (
      request.publishedFrom &&
      request.publishedTo &&
      request.publishedFrom > request.publishedTo
    ) {
      context.addIssue({
        code: "custom",
        message: "Publication date start must be on or before its end.",
        path: ["publishedFrom"],
      });
    }
    if (
      request.closingFrom &&
      request.closingTo &&
      request.closingFrom > request.closingTo
    ) {
      context.addIssue({
        code: "custom",
        message: "Closing date start must be on or before its end.",
        path: ["closingFrom"],
      });
    }
    if (
      request.minimumValue !== undefined &&
      request.maximumValue !== undefined &&
      request.minimumValue > request.maximumValue
    ) {
      context.addIssue({
        code: "custom",
        message: "Minimum value cannot exceed maximum value.",
        path: ["minimumValue"],
      });
    }
    if (
      (request.minimumValue !== undefined ||
        request.maximumValue !== undefined) &&
      !request.currency
    ) {
      context.addIssue({
        code: "custom",
        message: "Select an original currency when filtering by value.",
        path: ["currency"],
      });
    }
  });

export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchSort = z.infer<typeof sortSchema>;
