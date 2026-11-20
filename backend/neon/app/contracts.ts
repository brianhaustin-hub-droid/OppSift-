import { z } from "zod";

const uuidShape = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());
const jsonObject = z.record(z.string(), z.unknown());

export const onboardingPersonaSchema = z.enum([
  "supplier_sme",
  "consultant_bid_writer",
  "business_development_team",
  "admin_analyst",
  "other",
]);
export const onboardingStatusSchema = z.enum(["not_started", "in_progress", "completed", "skipped"]);
export const onboardingIntentSchema = z.enum(["create", "join", "individual", "undecided"]);

export const userOnboardingSchema = z.object({
  userId: uuidShape,
  persona: onboardingPersonaSchema.nullable().optional(),
  organizationIntent: onboardingIntentSchema.nullable().optional(),
  countriesOfInterest: z.array(z.string().regex(/^[A-Z]{2}$/)).default([]),
  categoriesOfInterest: z.array(z.enum(["government", "grants", "commercial"])).default([]),
  keywords: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  preferredLanguages: z.array(z.string().trim().min(2).max(35)).max(20).default([]),
  alertPreferences: jsonObject.default({}),
  completedSteps: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  status: onboardingStatusSchema.default("not_started"),
  startedAt: isoDateTime.nullable().optional(),
  completedAt: isoDateTime.nullable().optional(),
  skippedAt: isoDateTime.nullable().optional(),
  createdAt: isoDateTime.optional(),
  updatedAt: isoDateTime.optional(),
}).strict();
export type UserOnboarding = z.infer<typeof userOnboardingSchema>;

export const savedSearchSchema = z.object({
  id: uuidShape,
  organizationId: uuidShape,
  createdBy: uuidShape,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  filters: jsonObject.default({}),
  isShared: z.boolean().default(false),
  createdAt: isoDateTime.optional(),
  updatedAt: isoDateTime.optional(),
}).strict();
export type SavedSearch = z.infer<typeof savedSearchSchema>;

export const alertSubscriptionSchema = z.object({
  id: uuidShape,
  organizationId: uuidShape,
  createdBy: uuidShape,
  savedSearchId: uuidShape.nullable().optional(),
  opportunityId: uuidShape.nullable().optional(),
  name: z.string().trim().min(1).max(160),
  channel: z.enum(["email", "in_app"]).default("email"),
  frequency: z.enum(["immediate", "daily", "weekly"]).default("daily"),
  status: z.enum(["active", "paused", "archived"]).default("active"),
  criteria: jsonObject.default({}),
  lastNotifiedAt: isoDateTime.nullable().optional(),
  createdAt: isoDateTime.optional(),
  updatedAt: isoDateTime.optional(),
}).strict();
export type AlertSubscription = z.infer<typeof alertSubscriptionSchema>;

export const alertNotificationSchema = z.object({
  id: z.number().int().positive(),
  subscriptionId: uuidShape,
  organizationId: uuidShape,
  opportunityId: uuidShape.nullable().optional(),
  eventType: z.enum(["new_match", "deadline_warning", "amendment", "status_change", "digest"]),
  payload: jsonObject.default({}),
  deliveryStatus: z.enum(["pending", "sent", "failed", "suppressed"]).default("pending"),
  scheduledFor: isoDateTime.optional(),
  sentAt: isoDateTime.nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: isoDateTime.optional(),
}).strict();
export type AlertNotification = z.infer<typeof alertNotificationSchema>;

export const applicationStageSchema = z.enum([
  "interested", "qualified", "preparing", "submitted", "awarded", "lost", "no_bid", "archived",
]);

export const opportunityApplicationSchema = z.object({
  id: uuidShape,
  organizationId: uuidShape,
  opportunityId: uuidShape,
  createdBy: uuidShape,
  ownerUserId: uuidShape.nullable().optional(),
  stage: applicationStageSchema.default("interested"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueAt: isoDateTime.nullable().optional(),
  submittedAt: isoDateTime.nullable().optional(),
  outcome: z.enum(["pending", "won", "lost", "cancelled", "unknown"]).nullable().optional(),
  valueEstimate: z.string().regex(/^\d{1,16}(\.\d{1,4})?$/).nullable().optional(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  notes: z.string().max(20000).nullable().optional(),
  metadata: jsonObject.default({}),
  createdAt: isoDateTime.optional(),
  updatedAt: isoDateTime.optional(),
}).strict();
export type OpportunityApplication = z.infer<typeof opportunityApplicationSchema>;

export const applicationEventSchema = z.object({
  id: z.number().int().positive(),
  applicationId: uuidShape,
  organizationId: uuidShape,
  actorUserId: uuidShape.nullable().optional(),
  eventType: z.enum(["created", "stage_changed", "note", "assignment", "status_update"]),
  fromStage: applicationStageSchema.nullable().optional(),
  toStage: applicationStageSchema.nullable().optional(),
  payload: jsonObject.default({}),
  occurredAt: isoDateTime.optional(),
}).strict();
export type ApplicationEvent = z.infer<typeof applicationEventSchema>;

export const productEventSchema = z.object({
  id: z.number().int().positive().optional(),
  organizationId: uuidShape.nullable().optional(),
  userId: uuidShape.nullable().optional(),
  eventName: z.string().trim().min(1).max(120),
  eventCategory: z.string().trim().max(80).nullable().optional(),
  subjectType: z.string().trim().max(80).nullable().optional(),
  subjectId: z.string().trim().max(200).nullable().optional(),
  properties: jsonObject.default({}),
  occurredAt: isoDateTime.optional(),
  createdAt: isoDateTime.optional(),
}).strict();
export type ProductEvent = z.infer<typeof productEventSchema>;

export const supportRequestSchema = z.object({
  id: uuidShape.optional(),
  organizationId: uuidShape.nullable().optional(),
  userId: uuidShape.nullable().optional(),
  contactEmail: z.string().trim().email().max(320),
  category: z.enum(["general", "bug", "billing", "data_quality", "source_request", "access", "other"]).default("general"),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(1).max(10000),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).default("open"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  metadata: jsonObject.default({}),
  createdAt: isoDateTime.optional(),
  updatedAt: isoDateTime.optional(),
  resolvedAt: isoDateTime.nullable().optional(),
}).strict();
export type SupportRequest = z.infer<typeof supportRequestSchema>;

export const sourcesCoverageSummarySchema = z.object({
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  totalSources: z.number().int().nonnegative(),
  operationalSources: z.number().int().nonnegative(),
  totalRecords: z.number().int().nonnegative(),
  lastSuccessfulRetrieval: isoDateTime.nullable().optional(),
}).strict();
export type SourcesCoverageSummary = z.infer<typeof sourcesCoverageSummarySchema>;
