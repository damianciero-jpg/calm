-- ============================================================
-- CalmPath Database Schema
-- Paste this entire file into Supabase Studio > SQL Editor
-- and click Run. Safe to re-run (uses IF NOT EXISTS + OR REPLACE).
-- ============================================================


-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('parent', 'therapist', 'admin')),
  full_name  text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.children (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         text NOT NULL,
  age          smallint NOT NULL,
  avatar       text NOT NULL DEFAULT '👦',
  color        text NOT NULL DEFAULT '#6366F1',
  therapist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id  uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  mood      text NOT NULL CHECK (mood IN ('happy','calm','anxious','angry','sad','tired')),
  stars     smallint NOT NULL CHECK (stars BETWEEN 1 AND 3),
  game      text NOT NULL,
  world     text NOT NULL DEFAULT '',
  played_at timestamptz NOT NULL DEFAULT now(),
  day_label text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.therapist_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      text NOT NULL DEFAULT '',
  ai_summary   jsonb,
  week_of      date NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.iep_goals (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id   uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  label      text NOT NULL,
  score      smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  max_score  smallint NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id     uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('alert','pattern','positive')),
  title        text NOT NULL,
  body         text NOT NULL DEFAULT '',
  read         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);


-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iep_goals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- profiles: own row only
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- children
DROP POLICY IF EXISTS "children_parent_all"       ON public.children;
DROP POLICY IF EXISTS "children_parent_select"    ON public.children;
DROP POLICY IF EXISTS "children_parent_insert"    ON public.children;
DROP POLICY IF EXISTS "children_parent_update"    ON public.children;
DROP POLICY IF EXISTS "children_parent_delete"    ON public.children;
DROP POLICY IF EXISTS "children_therapist_select"  ON public.children;
CREATE POLICY "children_parent_select" ON public.children
  FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "children_parent_insert" ON public.children
  FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "children_parent_update" ON public.children
  FOR UPDATE USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "children_parent_delete" ON public.children
  FOR DELETE USING (auth.uid() = parent_id);
CREATE POLICY "children_therapist_select" ON public.children
  FOR SELECT USING (auth.uid() = therapist_id);

-- sessions
DROP POLICY IF EXISTS "sessions_parent_select"    ON public.sessions;
DROP POLICY IF EXISTS "sessions_parent_insert"    ON public.sessions;
DROP POLICY IF EXISTS "sessions_therapist_select" ON public.sessions;
CREATE POLICY "sessions_parent_select" ON public.sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );
CREATE POLICY "sessions_parent_insert" ON public.sessions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );
CREATE POLICY "sessions_therapist_select" ON public.sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND therapist_id = auth.uid())
  );

-- therapist_notes
DROP POLICY IF EXISTS "notes_therapist_all"    ON public.therapist_notes;
DROP POLICY IF EXISTS "notes_parent_select"    ON public.therapist_notes;
CREATE POLICY "notes_therapist_all" ON public.therapist_notes
  FOR ALL USING (auth.uid() = therapist_id);
CREATE POLICY "notes_parent_select" ON public.therapist_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );

-- iep_goals
DROP POLICY IF EXISTS "iep_parent_select"     ON public.iep_goals;
DROP POLICY IF EXISTS "iep_therapist_all"     ON public.iep_goals;
CREATE POLICY "iep_parent_select" ON public.iep_goals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );
CREATE POLICY "iep_therapist_all" ON public.iep_goals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND therapist_id = auth.uid())
  );

-- notifications: recipients only
DROP POLICY IF EXISTS "notif_recipient_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_recipient_update" ON public.notifications;
CREATE POLICY "notif_recipient_select" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "notif_recipient_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id);


-- ── Auto-create profile on signup ────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ── Auto-compute day_label on session insert ─────────────────

CREATE OR REPLACE FUNCTION public.set_session_day_label()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.day_label := CASE EXTRACT(DOW FROM NEW.played_at AT TIME ZONE 'UTC')
    WHEN 0 THEN 'Sun'
    WHEN 1 THEN 'Mon'
    WHEN 2 THEN 'Tue'
    WHEN 3 THEN 'Wed'
    WHEN 4 THEN 'Thu'
    WHEN 5 THEN 'Fri'
    WHEN 6 THEN 'Sat'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_day_label ON public.sessions;
CREATE TRIGGER sessions_day_label
  BEFORE INSERT ON public.sessions
  FOR EACH ROW EXECUTE PROCEDURE public.set_session_day_label();
