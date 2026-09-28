import { z } from "zod";

// Helper for JSON fields
const jsonSchema = z.custom<any>((val) => {
  if (typeof val === "string") {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }
  return typeof val === "object";
});

// Helper for Dates (Postgres returns ISO strings)
const dateSchema = z.string().datetime({ offset: true }).or(z.date());
const nullableDateSchema = dateSchema.nullable().optional();

// =============================================
// 1. CAMPUSES
// =============================================

export const campusSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  country: z.string(),
  city: z.string(),
  address: z.string().nullable().optional(),
  default_latitude: z.number(),
  default_longitude: z.number(),
  default_zoom: z.number().int().default(15),
  is_active: z.boolean().default(true),
  created_at: dateSchema.default(() => new Date()),
  settings: jsonSchema.nullable().optional(),
});

export type Campus = z.infer<typeof campusSchema>;

// =============================================
// 2. USERS
// =============================================

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string(),
  phone: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  created_at: dateSchema.default(() => new Date()),
  updated_at: dateSchema.default(() => new Date()),
  last_login_at: nullableDateSchema,
  reputation_score: z.number().min(0).max(5).default(5.0),
  total_items_posted: z.number().int().default(0),
  total_items_recovered: z.number().int().default(0),
  total_items_returned: z.number().int().default(0),
  is_banned: z.boolean().default(false),
  banned_at: nullableDateSchema,
  banned_reason: z.string().nullable().optional(),
  is_admin: z.boolean().default(false),
  campus_id: z.string().uuid().nullable().optional(),
  email_verified: z.boolean().default(false),
  email_verified_at: nullableDateSchema,
  deleted_at: nullableDateSchema,
});

export type User = z.infer<typeof userSchema>;

// =============================================
// 3. ITEMS
// =============================================

export const itemTypeSchema = z.enum(["lost", "found"]);
export const itemCategorySchema = z.enum([
  "electronics",
  "clothing",
  "books",
  "jewelry",
  "keys",
  "cards",
  "bags",
  "accessories",
  "containers",
  "other",
]);
export const itemLocationPrecisionSchema = z.enum([
  "exact",
  "approximate",
  "hidden",
]);
export const itemStatusSchema = z.enum([
  "active",
  "completed",
  "expired",
  "flagged",
  "removed",
]);

export const itemSchema = z.object({
  id: z.string().uuid(),
  type: itemTypeSchema,
  title: z.string(),
  description: z.string(),
  category: itemCategorySchema,
  image_url: z.string().nullable().optional(),
  image_metadata: jsonSchema.nullable().optional(),
  location_text: z.string(),
  // geo_location is stored as GEOGRAPHY(POINT) in DB, handled separately or as string/object depending on driver
  // We'll treat it as any for now or specific GeoJSON if we standardized that
  geo_location: z.any().nullable().optional(),
  location_precision: itemLocationPrecisionSchema.default("approximate"),
  date_lost_found: z.string().or(z.date()).nullable().optional(), // DATE type in Postgres
  created_at: dateSchema.default(() => new Date()),
  updated_at: dateSchema.default(() => new Date()),
  status: itemStatusSchema.default("active"),
  completed_at: nullableDateSchema,
  expires_at: dateSchema.nullable().optional(),
  posted_by: z.string().uuid(),
  ai_text_embedding: z.array(z.number()).nullable().optional(), // VECTOR(384)
  ai_processed_at: nullableDateSchema,
  ai_version: z.string().default("v1").nullable().optional(),
  // search_vector is generated, usually not needed in Zod schema for insertion/validation
  campus_id: z.string().uuid(),
  is_flagged: z.boolean().default(false),
  flag_count: z.number().int().default(0),
  reviewed_by: z.string().uuid().nullable().optional(),
  reviewed_at: nullableDateSchema,
  deleted_at: nullableDateSchema,
});

export type Item = z.infer<typeof itemSchema>;

// =============================================
// 4. MESSAGES
// =============================================

export const messageSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  recipient_id: z.string().uuid(),
  content: z.string().max(2000),
  is_read: z.boolean().default(false),
  read_at: nullableDateSchema,
  is_flagged: z.boolean().default(false),
  flagged_by: z.string().uuid().nullable().optional(),
  flagged_reason: z.string().nullable().optional(),
  created_at: dateSchema.default(() => new Date()),
  deleted_at: nullableDateSchema,
});

export type Message = z.infer<typeof messageSchema>;

// =============================================
// 5. FLAGS
// =============================================

export const flaggableTypeSchema = z.enum(["item", "message", "user"]);
export const flagReasonSchema = z.enum([
  "spam",
  "inappropriate_content",
  "scam",
  "duplicate",
  "harassment",
  "fake_item",
  "other",
]);
export const flagStatusSchema = z.enum(["pending", "reviewed", "dismissed"]);

export const flagSchema = z.object({
  id: z.string().uuid(),
  flaggable_type: flaggableTypeSchema,
  flaggable_id: z.string().uuid(),
  reporter_id: z.string().uuid(),
  reason: flagReasonSchema,
  description: z.string().nullable().optional(),
  status: flagStatusSchema.default("pending"),
  reviewed_by: z.string().uuid().nullable().optional(),
  reviewed_at: nullableDateSchema,
  review_notes: z.string().nullable().optional(),
  created_at: dateSchema.default(() => new Date()),
});

export type Flag = z.infer<typeof flagSchema>;

// =============================================
// 6. REPUTATION EVENTS
// =============================================

export const reputationEventTypeSchema = z.enum([
  "item_posted",
  "item_completed",
  "item_returned",
  "positive_feedback",
  "negative_feedback",
  "item_flagged_valid",
  "banned",
]);

export const reputationEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_type: reputationEventTypeSchema,
  points_change: z.number(),
  related_item_id: z.string().uuid().nullable().optional(),
  related_user_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: dateSchema.default(() => new Date()),
});

export type ReputationEvent = z.infer<typeof reputationEventSchema>;

// =============================================
// 7. NOTIFICATIONS
// =============================================

export const notificationTypeSchema = z.enum([
  "new_message",
  "item_expiring_soon",
  "item_expired",
  "match_found",
  "item_flagged",
  "welcome",
]);

export const notificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  related_item_id: z.string().uuid().nullable().optional(),
  related_message_id: z.string().uuid().nullable().optional(),
  action_url: z.string().nullable().optional(),
  is_read: z.boolean().default(false),
  read_at: nullableDateSchema,
  created_at: dateSchema.default(() => new Date()),
});

export type Notification = z.infer<typeof notificationSchema>;

// =============================================
// 8. ITEM EXTENSIONS
// =============================================

export const itemExtensionSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  user_id: z.string().uuid(),
  previous_expires_at: dateSchema,
  new_expires_at: dateSchema,
  days_extended: z.number().int().default(90),
  created_at: dateSchema.default(() => new Date()),
});

export type ItemExtension = z.infer<typeof itemExtensionSchema>;
