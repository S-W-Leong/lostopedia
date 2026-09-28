/**
 * Supabase Database Types
 * Auto-generated from database schema
 * DO NOT EDIT MANUALLY - regenerate with: npx supabase gen types typescript
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      campuses: {
        Row: {
          address: string | null
          city: string
          country: string
          created_at: string | null
          default_latitude: number
          default_longitude: number
          default_zoom: number | null
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          slug: string
        }
        Insert: {
          address?: string | null
          city: string
          country: string
          created_at?: string | null
          default_latitude: number
          default_longitude: number
          default_zoom?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          slug: string
        }
        Update: {
          address?: string | null
          city?: string
          country?: string
          created_at?: string | null
          default_latitude?: number
          default_longitude?: number
          default_zoom?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          slug?: string
        }
        Relationships: []
      }
      admin_automation_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          scopes: string[]
          service_account_name: string
          token_hash: string
          token_name: string
          token_prefix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          scopes: string[]
          service_account_name: string
          token_hash: string
          token_name: string
          token_prefix: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          scopes?: string[]
          service_account_name?: string
          token_hash?: string
          token_name?: string
          token_prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'admin_automation_tokens_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      flags: {
        Row: {
          action_taken: string | null
          created_at: string | null
          description: string | null
          flaggable_id: string
          flaggable_type: string
          id: string
          reason: string
          reporter_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          description?: string | null
          flaggable_id: string
          flaggable_type: string
          id?: string
          reason: string
          reporter_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          description?: string | null
          flaggable_id?: string
          flaggable_type?: string
          id?: string
          reason?: string
          reporter_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'flags_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'flags_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      item_extensions: {
        Row: {
          created_at: string | null
          days_extended: number
          id: string
          item_id: string
          new_expires_at: string
          previous_expires_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          days_extended?: number
          id?: string
          item_id: string
          new_expires_at: string
          previous_expires_at: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          days_extended?: number
          id?: string
          item_id?: string
          new_expires_at?: string
          previous_expires_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'item_extensions_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_extensions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      items: {
        Row: {
          admin_notes: string | null
          ai_processed_at: string | null
          ai_text_embedding: string | null
          ai_version: string | null
          campus_id: string
          category: string
          claimant_name: string | null
          claimant_recorded_by: string | null
          claimant_student_id: string | null
          completed_at: string | null
          created_at: string | null
          date_lost_found: string | null
          deleted_at: string | null
          description: string
          expires_at: string | null
          flag_count: number | null
          geo_location: unknown
          id: string
          image_metadata: Json | null
          image_url: string | null
          is_flagged: boolean | null
          location_precision: string | null
          location_text: string
          pickup_method: string | null
          posted_by: string
          removed_at: string | null
          removed_by: string | null
          removed_flag_id: string | null
          removed_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_vector: unknown
          status: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          ai_processed_at?: string | null
          ai_text_embedding?: string | null
          ai_version?: string | null
          campus_id: string
          category: string
          claimant_name?: string | null
          claimant_recorded_by?: string | null
          claimant_student_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          date_lost_found?: string | null
          deleted_at?: string | null
          description: string
          expires_at?: string | null
          flag_count?: number | null
          geo_location?: unknown
          id?: string
          image_metadata?: Json | null
          image_url?: string | null
          is_flagged?: boolean | null
          location_precision?: string | null
          location_text: string
          pickup_method?: string | null
          posted_by: string
          removed_at?: string | null
          removed_by?: string | null
          removed_flag_id?: string | null
          removed_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_vector?: unknown
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          ai_processed_at?: string | null
          ai_text_embedding?: string | null
          ai_version?: string | null
          campus_id?: string
          category?: string
          claimant_name?: string | null
          claimant_recorded_by?: string | null
          claimant_student_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          date_lost_found?: string | null
          deleted_at?: string | null
          description?: string
          expires_at?: string | null
          flag_count?: number | null
          geo_location?: unknown
          id?: string
          image_metadata?: Json | null
          image_url?: string | null
          is_flagged?: boolean | null
          location_precision?: string | null
          location_text?: string
          pickup_method?: string | null
          posted_by?: string
          removed_at?: string | null
          removed_by?: string | null
          removed_flag_id?: string | null
          removed_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_vector?: unknown
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'items_campus_id_fkey'
            columns: ['campus_id']
            isOneToOne: false
            referencedRelation: 'campuses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_posted_by_fkey'
            columns: ['posted_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_claimant_recorded_by_fkey'
            columns: ['claimant_recorded_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_removed_by_fkey'
            columns: ['removed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_removed_flag_id_fkey'
            columns: ['removed_flag_id']
            isOneToOne: false
            referencedRelation: 'flags'
            referencedColumns: ['id']
          }
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          flagged_by: string | null
          flagged_reason: string | null
          id: string
          is_flagged: boolean | null
          is_read: boolean | null
          item_id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_read?: boolean | null
          item_id: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_read?: boolean | null
          item_id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_flagged_by_fkey'
            columns: ['flagged_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          related_item_id: string | null
          related_message_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          related_item_id?: string | null
          related_message_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          related_item_id?: string | null
          related_message_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_related_item_id_fkey'
            columns: ['related_item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_related_message_id_fkey'
            columns: ['related_message_id']
            isOneToOne: false
            referencedRelation: 'messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      reputation_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          notes: string | null
          points_change: number
          related_item_id: string | null
          related_user_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          notes?: string | null
          points_change: number
          related_item_id?: string | null
          related_user_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          points_change?: number
          related_item_id?: string | null
          related_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reputation_events_related_item_id_fkey'
            columns: ['related_item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reputation_events_related_user_id_fkey'
            columns: ['related_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reputation_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          campus_id: string | null
          created_at: string | null
          deleted_at: string | null
          display_name: string
          email: string
          email_verified: boolean | null
          email_verified_at: string | null
          id: string
          is_admin: boolean | null
          is_banned: boolean | null
          last_login_at: string | null
          phone: string | null
          reputation_score: number | null
          total_items_posted: number | null
          total_items_recovered: number | null
          total_items_returned: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          campus_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name: string
          email: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          id: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          reputation_score?: number | null
          total_items_posted?: number | null
          total_items_recovered?: number | null
          total_items_returned?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          campus_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string
          email?: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          id?: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          reputation_score?: number | null
          total_items_posted?: number | null
          total_items_recovered?: number | null
          total_items_returned?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'users_campus_id_fkey'
            columns: ['campus_id']
            isOneToOne: false
            referencedRelation: 'campuses'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================
// Convenience Type Aliases
// ============================================

type PublicSchema = Database['public']

// Table Row Types (for SELECT)
export type DbUser = PublicSchema['Tables']['users']['Row']
export type DbAdminAutomationToken = PublicSchema['Tables']['admin_automation_tokens']['Row']
export type DbCampus = PublicSchema['Tables']['campuses']['Row']
export type DbItem = PublicSchema['Tables']['items']['Row']
export type DbMessage = PublicSchema['Tables']['messages']['Row']
export type DbFlag = PublicSchema['Tables']['flags']['Row']
export type DbNotification = PublicSchema['Tables']['notifications']['Row']
export type DbReputationEvent = PublicSchema['Tables']['reputation_events']['Row']
export type DbItemExtension = PublicSchema['Tables']['item_extensions']['Row']

// Table Insert Types (for INSERT)
export type DbUserInsert = PublicSchema['Tables']['users']['Insert']
export type DbAdminAutomationTokenInsert = PublicSchema['Tables']['admin_automation_tokens']['Insert']
export type DbCampusInsert = PublicSchema['Tables']['campuses']['Insert']
export type DbItemInsert = PublicSchema['Tables']['items']['Insert']
export type DbMessageInsert = PublicSchema['Tables']['messages']['Insert']
export type DbFlagInsert = PublicSchema['Tables']['flags']['Insert']
export type DbNotificationInsert = PublicSchema['Tables']['notifications']['Insert']
export type DbReputationEventInsert = PublicSchema['Tables']['reputation_events']['Insert']
export type DbItemExtensionInsert = PublicSchema['Tables']['item_extensions']['Insert']

// Table Update Types (for UPDATE)
export type DbUserUpdate = PublicSchema['Tables']['users']['Update']
export type DbAdminAutomationTokenUpdate = PublicSchema['Tables']['admin_automation_tokens']['Update']
export type DbCampusUpdate = PublicSchema['Tables']['campuses']['Update']
export type DbItemUpdate = PublicSchema['Tables']['items']['Update']
export type DbMessageUpdate = PublicSchema['Tables']['messages']['Update']
export type DbFlagUpdate = PublicSchema['Tables']['flags']['Update']
export type DbNotificationUpdate = PublicSchema['Tables']['notifications']['Update']
export type DbReputationEventUpdate = PublicSchema['Tables']['reputation_events']['Update']
export type DbItemExtensionUpdate = PublicSchema['Tables']['item_extensions']['Update']

