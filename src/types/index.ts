/**
 * Domain types for Lostopedia
 * These are the types used throughout the application
 */

import type {
  DbUser,
  DbCampus,
} from './database'

import type {
  ItemCategory,
  ItemType,
  ItemStatus,
  FlagReason,
  NotificationType,
  ReputationEvent as ReputationEventType,
  RecoveryBadgeType,
} from '@/lib/constants'

// Re-export database types for convenience
export type {
  DbUser,
  DbCampus,
  DbItem,
  DbMessage,
  DbFlag,
  DbNotification,
  DbReputationEvent,
  DbItemExtension,
} from './database'

// ============================================
// User Types
// ============================================

export interface User extends Omit<DbUser, 'reputation_score' | 'total_items_posted' | 'total_items_recovered' | 'total_items_returned'> {
  reputationScore: number
  totalItemsPosted: number
  totalItemsRecovered: number
  totalItemsReturned: number
}

export interface UserProfile {
  id: string
  displayName: string
  avatarUrl: string | null
  reputationScore: number
}

export interface CurrentUser extends User {
  isAdmin: boolean
}

// ============================================
// Campus Types
// ============================================

export interface Campus extends DbCampus {
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
}

// ============================================
// Item Types
// ============================================

export interface GeoLocation {
  latitude: number
  longitude: number
  formattedAddress?: string
}

export interface Item {
  id: string
  type: ItemType
  title: string
  description: string
  category: ItemCategory
  imageUrl: string | null
  imageMetadata: Record<string, unknown> | null
  locationText: string
  pickupMethod: 'office' | 'meetup' | null
  geoLocation: GeoLocation | null
  locationPrecision: 'exact' | 'approximate' | 'hidden'
  dateLostFound: string | null
  createdAt: string
  updatedAt: string
  status: ItemStatus
  completedAt: string | null
  expiresAt: string
  postedBy: string
  campusId: string
  isFlagged: boolean
  flagCount: number
  /** Office handoff: who claimed the item (public when set). */
  claimantName?: string | null
  claimantStudentId?: string | null
  claimantRecordedBy?: string | null
  /** Lost items: registered user credited as having helped recover (FK to users). */
  recoveredBy?: string | null
  /** Populated on detail views when recoveredBy is set (joined profile). */
  recoveryHelper?: UserProfile | null
}

export interface ItemWithPoster extends Item {
  poster: UserProfile
}

// For item cards and lists
export interface ItemCard {
  id: string
  type: ItemType
  title: string
  description: string
  category: ItemCategory
  imageUrl: string | null
  locationText: string
  pickupMethod?: 'office' | 'meetup' | null
  geoLocation?: GeoLocation | null
  status: ItemStatus
  createdAt: string
  expiresAt: string
  poster: UserProfile
}

// ============================================
// Message Types
// ============================================

export interface Message {
  id: string
  itemId: string
  senderId: string
  recipientId: string
  content: string
  isRead: boolean
  readAt: string | null
  isFlagged: boolean
  flaggedBy: string | null
  flaggedReason: string | null
  createdAt: string
}

export interface MessageWithUsers extends Message {
  sender: UserProfile
  recipient: UserProfile
}

export interface Conversation {
  itemId: string
  item: {
    id: string
    title: string
    imageUrl: string | null
    type: ItemType
  }
  otherUser: UserProfile
  lastMessage: {
    id: string
    content: string
    createdAt: string
    isRead: boolean
    senderId: string
  }
  unreadCount: number
}

// ============================================
// Flag Types
// ============================================

export interface Flag {
  id: string
  flaggableType: 'item' | 'message' | 'user'
  flaggableId: string
  reporterId: string
  reason: FlagReason
  description: string | null
  status: 'pending' | 'reviewed' | 'dismissed'
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
}

export interface FlagWithReporter extends Flag {
  reporter: UserProfile
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedItemId: string | null
  relatedMessageId: string | null
  actionUrl: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

// ============================================
// Reputation Types
// ============================================

export interface ReputationEventRecord {
  id: string
  userId: string
  eventType: ReputationEventType
  pointsChange: number
  relatedItemId: string | null
  relatedUserId: string | null
  notes: string | null
  createdAt: string
}

// ============================================
// Item Extension Types
// ============================================

export interface ItemExtension {
  id: string
  itemId: string
  userId: string
  previousExpiresAt: string
  newExpiresAt: string
  daysExtended: number
  createdAt: string
}

// ============================================
// Match Types (for AI matching)
// ============================================

export interface Match {
  item: ItemWithPoster
  score: number
  scorePercentage: number
  breakdown: {
    textScore: number
    metadataScore: number
    proximityScore: number
  }
  reasons: string[]
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  success: false
  error: string
  message?: string
  code?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// ============================================
// Form Types
// ============================================

export interface ItemFormData {
  type: ItemType
  title: string
  description: string
  category: ItemCategory
  locationText: string
  geoLocation?: GeoLocation
  locationPrecision: 'exact' | 'approximate' | 'hidden'
  dateLostFound?: string
  image?: File
}

export interface MessageFormData {
  itemId: string
  recipientId: string
  content: string
}

export interface FlagFormData {
  flaggableType: 'item' | 'message' | 'user'
  flaggableId: string
  reason: FlagReason
  description?: string
}

export interface ProfileFormData {
  displayName: string
  phone?: string
  avatar?: File
}

// ============================================
// Auth Types
// ============================================

export interface SignUpData {
  email: string
  password: string
  displayName: string
}

export interface SignInData {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  emailConfirmedAt: string | null
}

export interface Session {
  user: AuthUser
  accessToken: string
  refreshToken: string
  expiresAt: number
}

// ============================================
// User Stats Types
// ============================================

export interface UserStats {
  totalItems: number
  activeItems: number
  completedItems: number
  expiredItems: number
  unreadMessages: number
  unreadNotifications: number
}

// ============================================
// Search Types
// ============================================

export interface SearchFilters {
  type?: ItemType
  category?: ItemCategory
  status?: ItemStatus
  query?: string
  campusId?: string
}

export interface SearchResult {
  item: ItemCard
  relevanceScore?: number
}

// ============================================
// Badge Types
// ============================================

export interface UserBadge {
  id: string
  userId: string
  badgeType: RecoveryBadgeType
  earnedAt: string
}
