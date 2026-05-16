-- Ensure the core auth-owned tables exist for a clean Viada Supabase reset.
-- Signup writes public.profiles and public.children; dashboard reads children
-- where parent_id equals the authenticated user's id.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'therapist', 'admin')),
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  age smallint NOT NULL CHECK (age BETWEEN 1 AND 18),
  avatar text NOT NULL DEFAULT ':)',
  color text NOT NULL DEFAULT '#6366F1',
  therapist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  game_mode text NOT NULL DEFAULT 'kids' CHECK (game_mode IN ('kids', 'teen')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS children_parent_id_idx ON public.children(parent_id);
CREATE INDEX IF NOT EXISTS children_therapist_id_idx ON public.children(therapist_id);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS children_parent_select ON public.children;
DROP POLICY IF EXISTS children_parent_insert ON public.children;
DROP POLICY IF EXISTS children_parent_update ON public.children;
DROP POLICY IF EXISTS children_parent_delete ON public.children;
DROP POLICY IF EXISTS children_therapist_select ON public.children;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY children_parent_select ON public.children
  FOR SELECT TO authenticated
  USING (auth.uid() = parent_id);

CREATE POLICY children_parent_insert ON public.children
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY children_parent_update ON public.children
  FOR UPDATE TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY children_parent_delete ON public.children
  FOR DELETE TO authenticated
  USING (auth.uid() = parent_id);

CREATE POLICY children_therapist_select ON public.children
  FOR SELECT TO authenticated
  USING (auth.uid() = therapist_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'parent'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        full_name = EXCLUDED.full_name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
