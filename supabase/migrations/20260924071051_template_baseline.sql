-- Fresh installations only. This baseline consolidates the maintained legacy migrations.
create schema if not exists extensions;
set search_path = public, extensions;


-- Source: 00001_extensions.sql
-- Migration: 00001_extensions
-- Description: Enable required PostgreSQL extensions
-- Note: These should already be enabled in your Supabase project from Phase 0

-- UUID generation (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;

-- PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA extensions;




-- Source: 00002_campuses.sql
-- Migration: 00002_campuses
-- Description: Create campuses table (must be created before users due to FK)

CREATE TABLE campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- Location
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  
  -- Map defaults
  default_latitude DECIMAL(10, 7) NOT NULL,
  default_longitude DECIMAL(10, 7) NOT NULL,
  default_zoom INT DEFAULT 15,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Settings
  settings JSONB DEFAULT '{}'::JSONB
);

-- One organization per deployment. Only trusted operator and service roles
-- may inspect or change the installed registration policy.
CREATE TABLE public.deployment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  default_campus_id uuid NOT NULL REFERENCES public.campuses(id),
  registration_mode text NOT NULL CHECK (registration_mode IN ('restricted', 'open')),
  allowed_email_domains text[] NOT NULL DEFAULT '{}',
  config_hash text NOT NULL,
  CONSTRAINT restricted_requires_domains CHECK (
    registration_mode = 'open' OR cardinality(allowed_email_domains) > 0
  )
);

ALTER TABLE public.deployment_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deployment_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.deployment_settings TO service_role;




-- Source: 00003_users.sql
-- Migration: 00003_users
-- Description: Create users table with profile, reputation, and moderation fields

CREATE TABLE users (
  -- Identity (matches Supabase Auth user id)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Reputation & Moderation
  reputation_score DECIMAL(3,2) DEFAULT 5.00 CHECK (reputation_score BETWEEN 0 AND 5),
  total_items_posted INT DEFAULT 0,
  total_items_recovered INT DEFAULT 0,
  total_items_returned INT DEFAULT 0,
  is_banned BOOLEAN DEFAULT FALSE,
  banned_at TIMESTAMPTZ,
  banned_reason TEXT,
  
  -- Admin flag
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Campus
  campus_id UUID REFERENCES campuses(id),
  
  -- Verification
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_campus ON users(campus_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_reputation ON users(reputation_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_banned ON users(is_banned) WHERE is_banned = TRUE;
CREATE INDEX idx_users_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();




-- Source: 00004_items.sql
-- Migration: 00004_items
-- Description: Create items table for lost/found items

CREATE TABLE items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core fields
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'electronics', 'clothing', 'books', 'jewelry',
    'keys', 'cards', 'bags', 'accessories', 'other'
  )),
  
  -- Media
  image_url TEXT,
  image_metadata JSONB,
  
  -- Location
  location_text TEXT NOT NULL,
  pickup_method TEXT NOT NULL DEFAULT 'meetup' CHECK (pickup_method IN ('office', 'meetup')),
  geo_location GEOGRAPHY(POINT, 4326),
  location_precision TEXT DEFAULT 'approximate' CHECK (
    location_precision IN ('exact', 'approximate', 'hidden')
  ),
  
  -- Timestamps
  date_lost_found DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active',
    'completed',
    'expired',
    'flagged',
    'removed'
  )),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  
  -- User relationship
  posted_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- AI fields
  ai_text_embedding VECTOR(384),
  ai_processed_at TIMESTAMPTZ,
  ai_version TEXT DEFAULT 'v1',
  
  -- Full-text search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location_text, ''))
  ) STORED,
  
  -- Campus
  campus_id UUID REFERENCES campuses(id) NOT NULL,
  
  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_count INT DEFAULT 0,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Basic indexes
CREATE INDEX idx_items_type_status ON items(type, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_category ON items(category) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX idx_items_posted_by ON items(posted_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_campus ON items(campus_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_created_at ON items(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_expires_at ON items(expires_at) WHERE status = 'active';
CREATE INDEX idx_items_flagged ON items(is_flagged) WHERE is_flagged = TRUE;

-- Full-text search index
CREATE INDEX idx_items_search ON items USING GIN(search_vector);

-- Geospatial index
CREATE INDEX idx_items_geo_location ON items USING GIST(geo_location)
  WHERE geo_location IS NOT NULL AND deleted_at IS NULL;

-- Vector similarity search index (for AI matching)
-- Note: This requires at least some data in the table to work properly
-- We'll create this index after we have some items with embeddings
-- CREATE INDEX idx_items_text_embedding ON items
--   USING ivfflat (ai_text_embedding vector_cosine_ops)
--   WITH (lists = 100);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();




-- Source: 00005_messages.sql
-- Migration: 00005_messages
-- Description: Create messages table for in-app messaging

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Conversation
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Content
  content TEXT NOT NULL CHECK (LENGTH(content) <= 2000),
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_by UUID REFERENCES users(id),
  flagged_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_messages_item ON messages(item_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_recipient ON messages(recipient_id, is_read, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_flagged ON messages(is_flagged) WHERE is_flagged = TRUE;

-- Composite index for conversations
CREATE INDEX idx_messages_conversation ON messages(item_id, sender_id, recipient_id, created_at DESC)
  WHERE deleted_at IS NULL;




-- Source: 00006_flags.sql
-- Migration: 00006_flags
-- Description: Create flags table for content reporting

CREATE TABLE flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What's being flagged
  flaggable_type TEXT NOT NULL CHECK (flaggable_type IN ('item', 'message', 'user')),
  flaggable_id UUID NOT NULL,
  
  -- Who flagged it
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Reason
  reason TEXT NOT NULL CHECK (reason IN (
    'spam',
    'inappropriate_content',
    'scam',
    'duplicate',
    'harassment',
    'fake_item',
    'other'
  )),
  description TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'reviewed',
    'dismissed'
  )),
  
  -- Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate flags
  UNIQUE(flaggable_type, flaggable_id, reporter_id)
);

-- Indexes
CREATE INDEX idx_flags_status ON flags(status, created_at DESC);
CREATE INDEX idx_flags_flaggable ON flags(flaggable_type, flaggable_id);
CREATE INDEX idx_flags_reporter ON flags(reporter_id);




-- Source: 00007_reputation_events.sql
-- Migration: 00007_reputation_events
-- Description: Create reputation_events table for tracking reputation changes

CREATE TABLE reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'item_posted',
    'item_completed',
    'item_returned',
    'positive_feedback',
    'negative_feedback',
    'item_flagged_valid',
    'banned'
  )),
  
  -- Impact
  points_change DECIMAL(3,2) NOT NULL,
  
  -- Related entities
  related_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reputation_user ON reputation_events(user_id, created_at DESC);
CREATE INDEX idx_reputation_type ON reputation_events(event_type);

-- Function to update user reputation score
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET reputation_score = GREATEST(0, LEAST(5, reputation_score + NEW.points_change))
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update reputation on new event
CREATE TRIGGER trigger_update_user_reputation
  AFTER INSERT ON reputation_events
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation();




-- Source: 00008_notifications.sql
-- Migration: 00008_notifications
-- Description: Create notifications table for in-app notifications

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification type
  type TEXT NOT NULL CHECK (type IN (
    'new_message',
    'item_expiring_soon',
    'item_expired',
    'match_found',
    'item_flagged',
    'welcome'
  )),
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  related_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  related_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Action URL
  action_url TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;




-- Source: 00009_item_extensions.sql
-- Migration: 00009_item_extensions
-- Description: Create item_extensions table for tracking item lifetime extensions

CREATE TABLE item_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Extension details
  previous_expires_at TIMESTAMPTZ NOT NULL,
  new_expires_at TIMESTAMPTZ NOT NULL,
  days_extended INT NOT NULL DEFAULT 90,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_item_extensions_item ON item_extensions(item_id, created_at DESC);
CREATE INDEX idx_item_extensions_user ON item_extensions(user_id, created_at DESC);

-- Function to count extensions for an item
CREATE OR REPLACE FUNCTION get_item_extension_count(p_item_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT FROM item_extensions WHERE item_id = p_item_id;
$$ LANGUAGE sql STABLE;




-- Source: 00010_rls_policies.sql
-- Migration: 00010_rls_policies
-- Description: Enable Row Level Security and create policies

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_extensions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CAMPUSES POLICIES (Public read)
-- =============================================

CREATE POLICY "Campuses are viewable by everyone"
  ON campuses FOR SELECT
  USING (is_active = TRUE);

-- =============================================
-- USERS POLICIES
-- =============================================

-- Anyone can view basic user profiles (for displaying poster info)
CREATE POLICY "Public user profiles are viewable"
  ON users FOR SELECT
  USING (deleted_at IS NULL);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- ITEMS POLICIES
-- =============================================

-- Anyone can view active/completed items
CREATE POLICY "Items are viewable by everyone"
  ON items FOR SELECT
  USING (deleted_at IS NULL AND status IN ('active', 'completed'));

-- Authenticated users can view their own items regardless of status
CREATE POLICY "Users can view all own items"
  ON items FOR SELECT
  USING (auth.uid() = posted_by);

-- Authenticated users can create items
CREATE POLICY "Authenticated users can create items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = posted_by);

-- Users can update their own items
CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  USING (auth.uid() = posted_by AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = posted_by);

-- Users can soft delete their own items
CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  USING (auth.uid() = posted_by);

-- =============================================
-- MESSAGES POLICIES
-- =============================================

-- Users can read messages they're part of
CREATE POLICY "Users can read their messages"
  ON messages FOR SELECT
  USING (
    deleted_at IS NULL AND (
      auth.uid() = sender_id OR
      auth.uid() = recipient_id
    )
  );

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update their own messages (e.g., flag)
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- =============================================
-- FLAGS POLICIES
-- =============================================

-- Users can create flags
CREATE POLICY "Users can create flags"
  ON flags FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own flags
CREATE POLICY "Users can view own flags"
  ON flags FOR SELECT
  USING (auth.uid() = reporter_id);

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can create notifications (via service role)
-- This is handled by service role key, no policy needed for INSERT

-- =============================================
-- REPUTATION EVENTS POLICIES
-- =============================================

-- Users can view their own reputation history
CREATE POLICY "Users can view own reputation"
  ON reputation_events FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- ITEM EXTENSIONS POLICIES
-- =============================================

-- Users can view extensions for their items
CREATE POLICY "Users can view own item extensions"
  ON item_extensions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create extensions for their items
CREATE POLICY "Users can extend own items"
  ON item_extensions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ADMIN POLICIES (for users with is_admin = true)
-- =============================================

-- Admin can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admin can update any user
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admin can view all items
CREATE POLICY "Admins can view all items"
  ON items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admin can update any item
CREATE POLICY "Admins can update any item"
  ON items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admin can view all messages
CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admin can view all flags
CREATE POLICY "Admins can view all flags"
  ON flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admin can update flags (review)
CREATE POLICY "Admins can update flags"
  ON flags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );




-- Source: 00011_auth_triggers.sql
-- Migration: 00011_auth_triggers
-- Description: Create triggers for auth events (user signup, etc.)

-- Function to handle new user signup
-- This creates a profile in the users table when a new auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_campus_id UUID;
BEGIN
  -- Task 3 replaces this with the protected deployment setting.
  SELECT ds.default_campus_id INTO default_campus_id FROM public.deployment_settings ds WHERE ds.id = true;
  
  -- Create user profile
  INSERT INTO public.users (
    id,
    email,
    display_name,
    campus_id,
    email_verified,
    email_verified_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    default_campus_id,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
    NEW.email_confirmed_at
  );
  
  -- Create welcome notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    action_url
  )
  VALUES (
    NEW.id,
    'welcome',
    'Welcome to Lostopedia! 👋',
    'Thanks for joining! Start by browsing items or reporting something you''ve lost or found.',
    '/dashboard'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to handle email verification
CREATE OR REPLACE FUNCTION handle_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user profile when email is verified
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users
    SET 
      email_verified = TRUE,
      email_verified_at = NEW.email_confirmed_at
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users update (for email verification)
CREATE OR REPLACE TRIGGER on_auth_user_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION handle_email_verified();

-- Function to update last_login_at
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Supabase doesn't have a built-in trigger for login
-- We'll update last_login_at via the application code




-- Source: 00012_helper_functions.sql
-- Migration: 00012_helper_functions
-- Description: Create helper functions for common operations

-- =============================================
-- ITEM HELPERS
-- =============================================

-- Get items with poster info
CREATE OR REPLACE FUNCTION get_items_with_poster(
  p_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_campus_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  item_id UUID,
  item_type TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  image_url TEXT,
  location_text TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  poster_id UUID,
  poster_name TEXT,
  poster_avatar TEXT,
  poster_reputation INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.type,
    i.title,
    i.description,
    i.category,
    i.image_url,
    i.location_text,
    i.status,
    i.created_at,
    i.expires_at,
    u.id,
    u.display_name,
    u.avatar_url,
    u.reputation_score
  FROM items i
  JOIN users u ON i.posted_by = u.id
  WHERE i.deleted_at IS NULL
    AND i.status = COALESCE(p_status, i.status)
    AND (p_type IS NULL OR i.type = p_type)
    AND (p_category IS NULL OR i.category = p_category)
    AND (p_campus_id IS NULL OR i.campus_id = p_campus_id)
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Search items with full-text search


-- =============================================
-- MESSAGE HELPERS
-- =============================================

-- Get conversations for a user


-- Get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS BIGINT AS $$
  SELECT COUNT(*)
  FROM messages
  WHERE recipient_id = p_user_id
    AND is_read = FALSE
    AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

-- =============================================
-- NOTIFICATION HELPERS
-- =============================================

-- Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS BIGINT AS $$
  SELECT COUNT(*)
  FROM notifications
  WHERE user_id = p_user_id
    AND is_read = FALSE;
$$ LANGUAGE sql STABLE;

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND is_read = FALSE;
$$ LANGUAGE sql;

-- =============================================
-- STATS HELPERS
-- =============================================

-- Get user stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_items INT,
  active_items INT,
  completed_items INT,
  expired_items INT,
  unread_messages BIGINT,
  unread_notifications BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM items WHERE posted_by = p_user_id AND deleted_at IS NULL),
    (SELECT COUNT(*)::INT FROM items WHERE posted_by = p_user_id AND status = 'active' AND deleted_at IS NULL),
    (SELECT COUNT(*)::INT FROM items WHERE posted_by = p_user_id AND status = 'completed' AND deleted_at IS NULL),
    (SELECT COUNT(*)::INT FROM items WHERE posted_by = p_user_id AND status = 'expired' AND deleted_at IS NULL),
    get_unread_message_count(p_user_id),
    get_unread_notification_count(p_user_id);
END;
$$ LANGUAGE plpgsql STABLE;




-- Source: 00013_admin_enhancements.sql
-- Migration: 00013_admin_enhancements
-- Description: Add admin-related fields for content moderation

-- Add admin fields to items table
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create index for removed items
CREATE INDEX IF NOT EXISTS idx_items_removed 
  ON items(removed_at DESC) 
  WHERE removed_at IS NOT NULL;

-- Create index for flagged active items (for moderation page)
CREATE INDEX IF NOT EXISTS idx_items_flagged_active 
  ON items(is_flagged, flag_count DESC) 
  WHERE is_flagged = TRUE AND status = 'active';

-- Note: flags table already has reviewed_by, reviewed_at, and review_notes fields
-- from migration 00006_flags.sql, so no changes needed there




-- Source: 00014_add_admin_adjustment.sql
-- Migration: 00014_add_admin_adjustment
-- Description: Add admin_adjustment to reputation event types

-- Drop the existing check constraint
ALTER TABLE reputation_events
  DROP CONSTRAINT IF EXISTS reputation_events_event_type_check;

-- Add the new check constraint with admin_adjustment
ALTER TABLE reputation_events
  ADD CONSTRAINT reputation_events_event_type_check 
  CHECK (event_type IN (
    'item_posted',
    'item_completed',
    'item_returned',
    'positive_feedback',
    'negative_feedback',
    'item_flagged_valid',
    'banned',
    'admin_adjustment'
  ));




-- Source: 00015_enforce_flag_workflow.sql
-- Migration: 00015_enforce_flag_workflow
-- Description: Add flag workflow enforcement for admin moderation
-- This migration adds fields to track flag-based item removal and prevent direct deletion

-- ==================================================
-- ITEMS TABLE: Add flag reference fields
-- ==================================================

-- Add columns to track which flag caused an item removal
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS removed_reason TEXT,
  ADD COLUMN IF NOT EXISTS removed_flag_id UUID REFERENCES flags(id) ON DELETE SET NULL;

-- Add index for removed items by flag
CREATE INDEX IF NOT EXISTS idx_items_removed_flag 
  ON items(removed_flag_id) 
  WHERE removed_flag_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN items.removed_flag_id IS 'Links to the flag that caused this item to be removed';
COMMENT ON COLUMN items.removed_reason IS 'Stores the flag reason that led to removal (denormalized for audit trail)';

-- ==================================================
-- FLAGS TABLE: Add action tracking
-- ==================================================

-- Add column to track what action was taken when reviewing a flag
ALTER TABLE flags
  ADD COLUMN IF NOT EXISTS action_taken TEXT DEFAULT 'none' CHECK (
    action_taken IN ('none', 'item_removed', 'user_warned', 'user_banned')
  );

-- Add index for flags that resulted in item removal
CREATE INDEX IF NOT EXISTS idx_flags_action_taken 
  ON flags(action_taken, created_at DESC) 
  WHERE action_taken != 'none';

-- Add comment for documentation
COMMENT ON COLUMN flags.action_taken IS 'Action taken by admin when reviewing this flag';

-- ==================================================
-- TRIGGER: Auto-update is_flagged status
-- ==================================================

-- Create or replace function to automatically update is_flagged when status changes
CREATE OR REPLACE FUNCTION update_item_flag_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When item is removed, mark as flagged
  IF NEW.status = 'removed' AND (OLD.status IS NULL OR OLD.status != 'removed') THEN
    NEW.is_flagged = TRUE;
  -- When item is restored from removed status, unflag it
  ELSIF NEW.status != 'removed' AND OLD.status = 'removed' THEN
    NEW.is_flagged = FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists to allow re-running migration)
DROP TRIGGER IF EXISTS trigger_update_item_flag_status ON items;

CREATE TRIGGER trigger_update_item_flag_status
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_item_flag_status();

COMMENT ON FUNCTION update_item_flag_status() IS 'Automatically sets is_flagged based on item status changes';

-- ==================================================
-- DATA INTEGRITY: Indexes for audit queries
-- ==================================================

-- Index for tracking removed items with full audit trail
CREATE INDEX IF NOT EXISTS idx_items_audit_trail 
  ON items(removed_at, removed_by, status) 
  WHERE removed_at IS NOT NULL;

-- Index for items that can be restored (removed but not deleted)
CREATE INDEX IF NOT EXISTS idx_items_restorable 
  ON items(status, removed_at DESC) 
  WHERE status = 'removed' AND deleted_at IS NULL;

-- ==================================================
-- NOTES
-- ==================================================

-- This migration supports the flag-based moderation workflow where:
-- 1. Admins review user-reported flags
-- 2. Approving a flag can trigger item removal
-- 3. Item removal is always linked to a flag for audit trail
-- 4. Direct removal without flag review is prevented at the application layer
-- 5. All removals are soft deletes (no permanent deletion)

-- The workflow ensures:
-- - Complete audit trail (who, when, why)
-- - Reversible actions (items can be restored)
-- - User accountability (all removals tied to flags)
-- - Data integrity (no permanent data loss)





-- Source: 00017_get_user_conversations.sql
-- Migration: 00017_get_user_conversations
-- Description: Create optimized function for fetching user conversations with pagination
-- This replaces the inefficient JavaScript-based grouping in the API route

-- Function to get user conversations with pagination
-- Returns aggregated conversations with last message and unread count
CREATE OR REPLACE FUNCTION get_user_conversations(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  item_id UUID,
  item_title TEXT,
  item_image_url TEXT,
  item_type TEXT,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  other_user_reputation DECIMAL,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_at TIMESTAMPTZ,
  last_message_is_read BOOLEAN,
  unread_count BIGINT,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- Get total count for pagination (before filtering)
  SELECT COUNT(DISTINCT (m.item_id, 
    CASE WHEN m.sender_id = p_user_id THEN m.recipient_id ELSE m.sender_id END))
  INTO v_total_count
  FROM messages m
  WHERE (m.sender_id = p_user_id OR m.recipient_id = p_user_id)
    AND m.deleted_at IS NULL
    AND (NOT p_unread_only OR EXISTS (
      SELECT 1 FROM messages m2
      WHERE m2.item_id = m.item_id
        AND ((m.sender_id = p_user_id AND m2.sender_id = m.recipient_id) OR
             (m.recipient_id = p_user_id AND m2.sender_id = m.sender_id))
        AND m2.recipient_id = p_user_id
        AND m2.is_read = FALSE
        AND m2.deleted_at IS NULL
    ));

  RETURN QUERY
  WITH conversation_messages AS (
    -- Get all messages for this user, identifying the other user in each conversation
    SELECT
      m.id,
      m.item_id,
      m.sender_id,
      m.recipient_id,
      m.content,
      m.is_read,
      m.created_at,
      CASE WHEN m.sender_id = p_user_id THEN m.recipient_id ELSE m.sender_id END as other_user_id,
      ROW_NUMBER() OVER (
        PARTITION BY m.item_id, 
          CASE WHEN m.sender_id = p_user_id THEN m.recipient_id ELSE m.sender_id END
        ORDER BY m.created_at DESC
      ) as rn
    FROM messages m
    WHERE (m.sender_id = p_user_id OR m.recipient_id = p_user_id)
      AND m.deleted_at IS NULL
  ),
  conversations AS (
    -- Get the last message per conversation (rn = 1)
    SELECT
      cm.item_id,
      cm.other_user_id,
      cm.id as last_message_id,
      cm.content as last_message_content,
      cm.sender_id as last_message_sender_id,
      cm.created_at as last_message_at,
      cm.is_read as last_message_is_read
    FROM conversation_messages cm
    WHERE cm.rn = 1
  ),
  unread_counts AS (
    -- Count unread messages per conversation
    SELECT
      m.item_id,
      CASE WHEN m.sender_id = p_user_id THEN m.recipient_id ELSE m.sender_id END as other_user_id,
      COUNT(*) FILTER (WHERE m.recipient_id = p_user_id AND m.is_read = FALSE) as unread_count
    FROM messages m
    WHERE (m.sender_id = p_user_id OR m.recipient_id = p_user_id)
      AND m.deleted_at IS NULL
    GROUP BY m.item_id, 
      CASE WHEN m.sender_id = p_user_id THEN m.recipient_id ELSE m.sender_id END
  )
  SELECT
    c.item_id,
    i.title as item_title,
    i.image_url as item_image_url,
    i.type as item_type,
    c.other_user_id,
    u.display_name as other_user_name,
    u.avatar_url as other_user_avatar,
    COALESCE(u.reputation_score, 5.0) as other_user_reputation,
    c.last_message_id,
    c.last_message_content,
    c.last_message_sender_id,
    c.last_message_at,
    c.last_message_is_read,
    COALESCE(uc.unread_count, 0) as unread_count,
    v_total_count as total_count
  FROM conversations c
  JOIN items i ON i.id = c.item_id AND i.deleted_at IS NULL
  JOIN users u ON u.id = c.other_user_id AND u.deleted_at IS NULL
  LEFT JOIN unread_counts uc ON uc.item_id = c.item_id AND uc.other_user_id = c.other_user_id
  WHERE (NOT p_unread_only OR COALESCE(uc.unread_count, 0) > 0)
  ORDER BY c.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_conversations(UUID, INT, INT, BOOLEAN) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_conversations(UUID, INT, INT, BOOLEAN) IS 
'Returns paginated list of conversations for a user, with last message and unread count. 
Optimized for performance using window functions and CTEs instead of client-side grouping.';



-- Source: 00018_enable_realtime.sql
-- Migration: 00018_enable_realtime
-- Description: Enable Realtime replication for notifications and messages tables

-- Enable Realtime for notifications table
-- This allows clients to subscribe to INSERT events on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable Realtime for messages table
-- This allows clients to subscribe to INSERT and UPDATE events on messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Note: If you get an error that the publication doesn't exist, run this first:
-- CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
-- Then remove tables you don't want replicated and add only the ones you need.



-- Source: 00019_recovery_tracking.sql
-- Migration: 00019_recovery_tracking
-- Description: Add recovered_by column to items and create user_badges table
-- Purpose: Enable item owners to credit helpers during completion, awarding reputation and badges

-- Add recovered_by column to items
ALTER TABLE items
ADD COLUMN recovered_by UUID REFERENCES users(id);

-- Create index for querying items by helper
CREATE INDEX idx_items_recovered_by ON items(recovered_by) WHERE recovered_by IS NOT NULL;

-- Create user_badges table
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'recovery_1',
    'recovery_5',
    'recovery_10',
    'recovery_25'
  )),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

-- Index for fetching user badges
CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- Add recovery_credit to notification types
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'new_message',
  'item_expiring_soon',
  'item_expired',
  'match_found',
  'item_flagged',
  'welcome',
  'recovery_credit'
));

-- RLS policies for user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are publicly viewable (for profile display)
CREATE POLICY "Badges are publicly viewable"
  ON user_badges FOR SELECT
  USING (true);

-- Only system can insert badges (via service role)
-- Regular users cannot insert badges directly
CREATE POLICY "System can insert badges"
  ON user_badges FOR INSERT
  WITH CHECK (false);

-- Comment for documentation
COMMENT ON TABLE user_badges IS 'Tracks recovery badges earned by users for helping return items';
COMMENT ON COLUMN items.recovered_by IS 'User who helped recover this item (credited by owner)';



-- Source: 00020_account_deletion_fks.sql
-- Migration: 00020_account_deletion_fks
-- Description: Allow user hard delete by setting ON DELETE SET NULL for non-cascading FKs
-- Purpose: When auth.users(id) is deleted, public.users cascades. Child tables that reference
-- users(id) with ON DELETE CASCADE are fine. Columns that reference users without CASCADE
-- must set ON DELETE SET NULL so the delete can succeed.

-- items.reviewed_by: admin who reviewed the item; safe to set NULL when that user is deleted
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_reviewed_by_fkey;
ALTER TABLE items
  ADD CONSTRAINT items_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- items.recovered_by: user who helped recover; safe to set NULL when that user is deleted
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_recovered_by_fkey;
ALTER TABLE items
  ADD CONSTRAINT items_recovered_by_fkey
  FOREIGN KEY (recovered_by) REFERENCES users(id) ON DELETE SET NULL;

-- flags.reviewed_by: admin who reviewed the flag; safe to set NULL when that user is deleted
ALTER TABLE flags DROP CONSTRAINT IF EXISTS flags_reviewed_by_fkey;
ALTER TABLE flags
  ADD CONSTRAINT flags_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;



-- Source: 00021_fix_missing_delete_constraints.sql
-- Migration: 00021_fix_missing_delete_constraints
-- Description: Add ON DELETE SET NULL for missing foreign keys to allow user deletion
-- Purpose: messages.flagged_by and items.removed_by were missing ON DELETE clauses,
-- causing user deletion to fail with foreign key constraint violations.

-- messages.flagged_by: user who flagged a message; safe to set NULL when that user is deleted
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_flagged_by_fkey;
ALTER TABLE messages
  ADD CONSTRAINT messages_flagged_by_fkey
  FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE SET NULL;

-- items.removed_by: admin who removed an item; safe to set NULL when that user is deleted
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_removed_by_fkey;
ALTER TABLE items
  ADD CONSTRAINT items_removed_by_fkey
  FOREIGN KEY (removed_by) REFERENCES users(id) ON DELETE SET NULL;



-- Source: 00022_uncapped_reputation.sql
-- Migration: 00022_uncapped_reputation
-- Description: Convert to uncapped integer-based reputation system with auto-ban at 0

-- Step 1: Drop existing reputation trigger and function
DROP TRIGGER IF EXISTS trigger_update_user_reputation ON reputation_events;
DROP FUNCTION IF EXISTS update_user_reputation();

-- Step 2: Modify reputation_score column
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_reputation_score_check,
  ALTER COLUMN reputation_score TYPE INTEGER USING (reputation_score * 20)::INTEGER,
  ALTER COLUMN reputation_score SET DEFAULT 100;

-- Step 3: Update existing user scores (scale 0-5 → 0-100, or reset to 100)
-- Option A: Scale existing scores (5.0 → 100, 4.0 → 80, etc.)
-- UPDATE users SET reputation_score = (reputation_score * 20)::INTEGER;

-- Option B: Reset all users to baseline 100 (recommended for clean slate)
UPDATE users SET reputation_score = 100 WHERE reputation_score IS NOT NULL;

-- Step 4: Create new reputation update function with auto-ban logic
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
DECLARE
  new_score INTEGER;
BEGIN
  -- Calculate new reputation score
  SELECT COALESCE(reputation_score, 100) + NEW.points_change
  INTO new_score
  FROM users
  WHERE id = NEW.user_id;

  -- Update reputation score
  UPDATE users
  SET reputation_score = new_score
  WHERE id = NEW.user_id;

  -- Auto-ban if reputation falls below 0
  IF new_score < 0 THEN
    UPDATE users
    SET
      is_banned = TRUE,
      banned_at = NOW(),
      banned_reason = COALESCE(
        banned_reason || ' | ',
        ''
      ) || 'Automatic ban: reputation score fell below 0 (score: ' || new_score || ')'
    WHERE id = NEW.user_id AND is_banned = FALSE;

    -- Log the auto-ban event
    INSERT INTO reputation_events (user_id, event_type, points_change, notes)
    VALUES (
      NEW.user_id,
      'banned',
      -1000,
      'Automatic ban triggered by reputation falling below 0'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Recreate trigger
CREATE TRIGGER trigger_update_user_reputation
  AFTER INSERT ON reputation_events
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation();

-- Step 6: Update event type constraint to include admin_adjustment
-- Drop and recreate the constraint to ensure it includes all event types
ALTER TABLE reputation_events
  DROP CONSTRAINT IF EXISTS reputation_events_event_type_check;

ALTER TABLE reputation_events
  ADD CONSTRAINT reputation_events_event_type_check
  CHECK (event_type IN (
    'item_posted',
    'item_completed',
    'item_returned',
    'positive_feedback',
    'negative_feedback',
    'item_flagged_valid',
    'banned',
    'admin_adjustment'
  ));

-- Step 7: Update indexes for integer scores
DROP INDEX IF EXISTS idx_users_reputation;
CREATE INDEX idx_users_reputation ON users(reputation_score DESC) WHERE deleted_at IS NULL AND is_banned = FALSE;

-- Step 8: Add reputation tier index for efficient querying
CREATE INDEX idx_users_high_reputation ON users(reputation_score)
  WHERE reputation_score >= 200 AND deleted_at IS NULL AND is_banned = FALSE;

COMMENT ON COLUMN users.reputation_score IS 'Uncapped integer reputation score. Starts at 100, no upper limit. Auto-ban if < 0.';



-- Source: 00023_backfill_expired_and_search_items.sql
-- Backfill status for items that passed expires_at while still marked active (e.g. cron not running).
-- Align search_items RPC with API (p_status) and exclude overdue active rows from "active" results.

UPDATE items
SET
  status = 'expired',
  updated_at = NOW()
WHERE status = 'active'
  AND expires_at < NOW()
  AND deleted_at IS NULL;





-- Source: 00025_search_items_created_at_date_filter.sql
-- Extend search_items RPC with optional posted-date range (created_at, UTC calendar days).





-- Source: 00026_admin_automation_tokens.sql
-- Machine tokens for admin automation clients (MCP and other agents).
-- Tokens are stored as hash-only secrets; raw secrets are never persisted.

create table if not exists public.admin_automation_tokens (
  id uuid primary key default gen_random_uuid(),
  token_name text not null,
  service_account_name text not null,
  token_prefix text not null unique,
  token_hash text not null unique,
  scopes text[] not null,
  is_active boolean not null default true,
  created_by uuid null references public.users(id) on delete set null,
  last_used_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_automation_tokens_scopes_nonempty check (coalesce(array_length(scopes, 1), 0) > 0),
  constraint admin_automation_tokens_scopes_valid check (
    scopes <@ array['read', 'mutate', 'destructive']::text[]
  )
);

create index if not exists idx_admin_automation_tokens_active
  on public.admin_automation_tokens (is_active, expires_at);

create index if not exists idx_admin_automation_tokens_created_by
  on public.admin_automation_tokens (created_by);



-- Source: 00027_admin_automation_safety.sql
-- Safety primitives for admin automation
-- - confirmation tokens for destructive dry-run/confirm flow
-- - idempotency storage for replay-safe mutating calls

create table if not exists public.admin_automation_confirm_tokens (
  id uuid primary key default gen_random_uuid(),
  operation_id text not null,
  intent_hash text not null,
  actor_fingerprint text not null,
  confirm_token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_automation_confirm_tokens_actor
  on public.admin_automation_confirm_tokens (actor_fingerprint, operation_id);

create table if not exists public.admin_automation_idempotency (
  id uuid primary key default gen_random_uuid(),
  actor_fingerprint text not null,
  operation_id text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_payload jsonb null,
  status_code int null,
  completed_at timestamptz null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint admin_automation_idempotency_unique unique (
    actor_fingerprint,
    operation_id,
    idempotency_key
  )
);

create index if not exists idx_admin_automation_idempotency_expiry
  on public.admin_automation_idempotency (expires_at);



-- Source: 00028_admin_automation_audit.sql
-- Append-only audit events for admin automation operations.

create table if not exists public.admin_automation_audit_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  actor_fingerprint text not null,
  operation_id text not null,
  outcome_status text not null,
  idempotency_key text null,
  error_code text null,
  target_refs jsonb null,
  created_at timestamptz not null default now(),
  constraint admin_automation_audit_events_outcome_valid check (
    outcome_status in ('success', 'failed', 'dry_run')
  )
);

create index if not exists idx_admin_automation_audit_events_created_at
  on public.admin_automation_audit_events (created_at desc);

create index if not exists idx_admin_automation_audit_events_request_id
  on public.admin_automation_audit_events (request_id);



-- Source: 00029_item_claimant_fields.sql
-- Office handoff: who physically claimed the item (public record; distinct from recovered_by helper credit)

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS claimant_name TEXT,
  ADD COLUMN IF NOT EXISTS claimant_student_id TEXT,
  ADD COLUMN IF NOT EXISTS claimant_recorded_by UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN items.claimant_name IS 'Person who claimed the item at office handoff (walk-in).';
COMMENT ON COLUMN items.claimant_student_id IS 'Campus student ID for the claimant.';
COMMENT ON COLUMN items.claimant_recorded_by IS 'Staff user who recorded office handoff / completion with claimant details.';

CREATE INDEX IF NOT EXISTS idx_items_claimant_recorded_by ON items(claimant_recorded_by) WHERE claimant_recorded_by IS NOT NULL;



-- Source: 00030_search_items_pickup_method.sql
-- Add pickup_method to search_items RPC results for listing parity with GET /api/search.

CREATE OR REPLACE FUNCTION search_items(
  p_query TEXT,
  p_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_campus_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  item_id UUID,
  item_type TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  image_url TEXT,
  location_text TEXT,
  pickup_method TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  poster_id UUID,
  poster_name TEXT,
  poster_avatar TEXT,
  poster_reputation INTEGER,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.type,
    i.title,
    i.description,
    i.category,
    i.image_url,
    i.location_text,
    i.pickup_method::TEXT,
    i.status,
    i.created_at,
    i.expires_at,
    u.id,
    u.display_name,
    u.avatar_url,
    u.reputation_score,
    ts_rank(i.search_vector, plainto_tsquery('english', p_query))
  FROM items i
  JOIN users u ON i.posted_by = u.id
  WHERE i.deleted_at IS NULL
    AND i.status = p_status
    AND (p_status IS DISTINCT FROM 'active' OR i.expires_at > NOW())
    AND i.search_vector @@ plainto_tsquery('english', p_query)
    AND (p_type IS NULL OR i.type = p_type)
    AND (p_category IS NULL OR i.category = p_category)
    AND (p_campus_id IS NULL OR i.campus_id = p_campus_id)
    AND (p_date_from IS NULL OR (i.created_at AT TIME ZONE 'UTC')::date >= p_date_from)
    AND (p_date_to IS NULL OR (i.created_at AT TIME ZONE 'UTC')::date <= p_date_to)
  ORDER BY ts_rank(i.search_vector, plainto_tsquery('english', p_query)) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;



-- Source: 00031_items_category_containers.sql
-- Add 'containers' to items.category (bottles, lunch boxes, food storage, etc.)

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check;

ALTER TABLE items ADD CONSTRAINT items_category_check CHECK (category IN (
  'electronics', 'clothing', 'books', 'jewelry',
  'keys', 'cards', 'bags', 'accessories', 'containers', 'other'
));



-- Source: 20260707120043_restrict_claimant_columns_anon.sql
-- Claimant PII (walk-in name + student ID) must not be readable anonymously.
REVOKE SELECT ON public.items FROM anon;
GRANT SELECT (
  id, type, title, description, category, image_url, image_metadata,
  location_text, pickup_method, geo_location, location_precision,
  date_lost_found, created_at, updated_at, status, completed_at, expires_at,
  posted_by, campus_id, is_flagged, flag_count, recovered_by, deleted_at
) ON public.items TO anon;



-- Source: 20260707124701_match_items_by_embedding.sql
-- Backfills the schema source of truth: this function already exists in the hosted DB (created out-of-band) and is required by /api/matches.
CREATE OR REPLACE FUNCTION public.match_items_by_embedding(
  query_embedding text,
  match_type text DEFAULT NULL::text,
  match_status text DEFAULT 'active'::text,
  exclude_user_id uuid DEFAULT NULL::uuid,
  match_limit integer DEFAULT 100
)
 RETURNS TABLE(id uuid, type text, title text, description text, category text, image_url text, image_metadata jsonb, location_text text, geo_location geography, location_precision text, date_lost_found date, created_at timestamp with time zone, updated_at timestamp with time zone, status text, completed_at timestamp with time zone, expires_at timestamp with time zone, posted_by uuid, campus_id uuid, is_flagged boolean, flag_count integer, cosine_distance double precision, similarity double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    i.id, i.type, i.title, i.description, i.category, i.image_url,
    i.image_metadata, i.location_text, i.geo_location, i.location_precision,
    i.date_lost_found, i.created_at, i.updated_at, i.status, i.completed_at,
    i.expires_at, i.posted_by, i.campus_id, i.is_flagged, i.flag_count,
    (i.ai_text_embedding <=> query_embedding::vector) as cosine_distance,
    (1 - (i.ai_text_embedding <=> query_embedding::vector)) as similarity
  FROM items i
  WHERE i.deleted_at IS NULL
    AND i.ai_text_embedding IS NOT NULL
    AND (match_type IS NULL OR i.type = match_type)
    AND (match_status IS NULL OR i.status = match_status)
    AND (exclude_user_id IS NULL OR i.posted_by != exclude_user_id)
  ORDER BY i.ai_text_embedding <=> query_embedding::vector
  LIMIT match_limit;
END;
$function$;



-- Source: 20260708012219_auth_gate_discovery.sql
-- Guests may see aggregate platform stats, but not item/user rows.
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE (
  total_users bigint,
  total_items bigint,
  items_recovered bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      SELECT COUNT(*)::bigint
      FROM public.users
      WHERE is_banned = FALSE
        AND deleted_at IS NULL
    ) AS total_users,
    (
      SELECT COUNT(*)::bigint
      FROM public.items
      WHERE deleted_at IS NULL
    ) AS total_items,
    (
      SELECT COUNT(*)::bigint
      FROM public.items
      WHERE status = 'completed'
        AND deleted_at IS NULL
    ) AS items_recovered;
$$;

REVOKE ALL ON FUNCTION public.get_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;

-- Remove direct anonymous reads from community data tables.
REVOKE SELECT ON public.items FROM anon;
REVOKE SELECT ON public.users FROM anon;

DROP POLICY IF EXISTS "Items are viewable by everyone" ON public.items;
CREATE POLICY "Authenticated users can view visible items"
  ON public.items
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND deleted_at IS NULL
    AND status IN ('active', 'completed')
  );

DROP POLICY IF EXISTS "Public user profiles are viewable" ON public.users;
CREATE POLICY "Authenticated users can view active user profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND deleted_at IS NULL
  );



-- Source: 20260711040138_consolidate_dashboard_stats.sql
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
  total_items BIGINT,
  active_items BIGINT,
  completed_items BIGINT,
  expired_items BIGINT,
  unread_messages BIGINT,
  unread_notifications BIGINT,
  expiring_soon BIGINT,
  reputation_score INTEGER,
  total_items_recovered INTEGER,
  total_items_returned INTEGER
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM items WHERE posted_by = auth.uid() AND deleted_at IS NULL),
    (SELECT count(*) FROM items WHERE posted_by = auth.uid() AND status = 'active' AND expires_at > now() AND deleted_at IS NULL),
    (SELECT count(*) FROM items WHERE posted_by = auth.uid() AND status = 'completed' AND deleted_at IS NULL),
    (SELECT count(*) FROM items WHERE posted_by = auth.uid() AND status = 'expired' AND deleted_at IS NULL),
    (SELECT count(*) FROM messages WHERE recipient_id = auth.uid() AND is_read = false AND deleted_at IS NULL),
    (SELECT count(*) FROM notifications WHERE user_id = auth.uid() AND is_read = false),
    (SELECT count(*) FROM items WHERE posted_by = auth.uid() AND status = 'active' AND expires_at > now() AND expires_at <= now() + interval '7 days' AND deleted_at IS NULL),
    coalesce((SELECT reputation_score FROM users WHERE id = auth.uid()), 0),
    coalesce((SELECT total_items_recovered FROM users WHERE id = auth.uid()), 0),
    coalesce((SELECT total_items_returned FROM users WHERE id = auth.uid()), 0)
  WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;



-- Source: 20260711043610_fix_avatar_profile_persistence.sql
-- Make the Data API privileges required by the authenticated avatar update
-- explicit while retaining row ownership enforcement through RLS.
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT UPDATE (avatar_url, updated_at) ON TABLE public.users TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);



-- Source: 20260711045652_secure_admin_automation_tables.sql
-- These tables are accessed only by trusted server-side automation through the
-- service role. Keep Data API client roles denied by default.

alter table public.admin_automation_tokens
  enable row level security;

alter table public.admin_automation_confirm_tokens
  enable row level security;

alter table public.admin_automation_idempotency
  enable row level security;

alter table public.admin_automation_audit_events
  enable row level security;

revoke all privileges
  on table public.admin_automation_tokens,
           public.admin_automation_confirm_tokens,
           public.admin_automation_idempotency,
           public.admin_automation_audit_events
  from public, anon, authenticated;
