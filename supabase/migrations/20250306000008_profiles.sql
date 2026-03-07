-- =============================================================================
-- Migration 008: Profiles and User Base
-- =============================================================================
-- Design: profiles extends Supabase auth.users. 1:1 via id = auth.uid().
-- user_exam_tracks: which track(s) user is studying. admin_roles and
-- user_admin_roles for platform administration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
-- Extends auth.users. Created via trigger on signup.
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  -- Primary track for dashboard/defaults
  primary_exam_track_id UUID REFERENCES exam_tracks(id) ON DELETE SET NULL,
  -- Preferences
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can read/update own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_primary_track ON profiles(primary_exam_track_id) WHERE primary_exam_track_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- user_exam_tracks
-- -----------------------------------------------------------------------------
-- Which track(s) the user has access to / is studying.
CREATE TABLE user_exam_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exam_track_id)
);

ALTER TABLE user_exam_tracks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_exam_tracks_user ON user_exam_tracks(user_id);
CREATE INDEX idx_user_exam_tracks_track ON user_exam_tracks(exam_track_id);

-- -----------------------------------------------------------------------------
-- admin_roles
-- -----------------------------------------------------------------------------
-- Lookup table for admin role definitions.
CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug admin_role_slug NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_roles_slug ON admin_roles(slug);

-- -----------------------------------------------------------------------------
-- user_admin_roles
-- -----------------------------------------------------------------------------
CREATE TABLE user_admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, admin_role_id)
);

ALTER TABLE user_admin_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_admin_roles_user ON user_admin_roles(user_id);
CREATE INDEX idx_user_admin_roles_role ON user_admin_roles(admin_role_id);

-- -----------------------------------------------------------------------------
-- Trigger: Create profile on signup
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
