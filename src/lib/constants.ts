/**
 * Application constants
 */
import { organization } from '@/lib/organization/config'

// Feature flags
export const MESSAGING_ENABLED = false

// Item categories
export const ITEM_CATEGORIES = [
  'electronics',
  'clothing',
  'books',
  'jewelry',
  'keys',
  'cards',
  'bags',
  'accessories',
  'containers',
  'other',
] as const

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

// Item types
export const ITEM_TYPES = ['lost', 'found'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

// Item statuses
export const ITEM_STATUSES = [
  'active',
  'completed',
  'expired',
  'flagged',
  'removed',
] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]

// Flag reasons
export const FLAG_REASONS = [
  'spam',
  'inappropriate_content',
  'scam',
  'duplicate',
  'harassment',
  'fake_item',
  'other',
] as const
export type FlagReason = (typeof FLAG_REASONS)[number]

// Notification types
export const NOTIFICATION_TYPES = [
  'new_message',
  'item_expiring_soon',
  'item_expired',
  'match_found',      // For future Phase 5
  'item_flagged',     // For future Phase 7
  'welcome',         // For future use
  'recovery_credit',  // When someone credits you for helping recover their item
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

// Reputation events
export const REPUTATION_EVENTS = [
  'item_posted',
  'item_completed',
  'item_returned',
  'positive_feedback',
  'negative_feedback',
  'item_flagged_valid',
  'banned',
  'admin_adjustment',
] as const
export type ReputationEvent = (typeof REPUTATION_EVENTS)[number]

// Reputation points (uncapped integer system)
// Users start at 100 points. No upper limit.
// Falling below 0 triggers automatic account suspension.
export const REPUTATION_POINTS: Record<ReputationEvent, number> = {
  item_posted: 2,           // Max 10/day = +20 max per day
  item_completed: 5,        // Owner recovered their item
  item_returned: 15,        // Helper credited for returning (BIG reward)
  positive_feedback: 5,     // Future: positive review
  negative_feedback: -10,   // Future: negative review
  item_flagged_valid: -25,  // Serious penalty for rule violations
  banned: -1000,            // Nuclear option, ensures below 0
  admin_adjustment: 0,      // Manual, any value set by admin (-500 to +500)
}

// Contact email (support, privacy, terms)
export const CONTACT_EMAIL = organization.supportEmail

// App configuration
export const APP_CONFIG = {
  name: organization.name,
  description: organization.description,
  contactEmail: CONTACT_EMAIL,
  itemExpirationDays: 90,
  maxItemExtensions: 3,
  extensionDays: 90,
  maxImageSizeMB: 10,
  maxTitleLength: 100,
  maxDescriptionLength: 1000,
  maxMessageLength: 2000,
  itemsPerPage: 20,
  matchesPerPage: 10,
  pollingIntervals: {
    messages: 10000, // 10 seconds on thread page
    inbox: 30000, // 30 seconds on inbox page
    notifications: 60000, // 60 seconds in header
  },
} as const

// Compatibility adapter for existing location field names.
export const DEFAULT_CAMPUS = organization.location

// Category labels and icons (for display)
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  electronics: 'Electronics',
  clothing: 'Clothing',
  books: 'Books',
  jewelry: 'Jewelry',
  keys: 'Keys',
  cards: 'Cards & IDs',
  bags: 'Bags',
  accessories: 'Accessories',
  containers: 'Containers',
  other: 'Other',
}

// Recovery badges for users who help return items
export const RECOVERY_BADGES = [
  { type: 'recovery_1', threshold: 1, name: 'Good Samaritan', icon: '🤝' },
  { type: 'recovery_5', threshold: 5, name: 'Community Helper', icon: '⭐' },
  { type: 'recovery_10', threshold: 10, name: 'Recovery Hero', icon: '🏆' },
  { type: 'recovery_25', threshold: 25, name: 'Legend', icon: '👑' },
] as const
export type RecoveryBadgeType = (typeof RECOVERY_BADGES)[number]['type']
