-- Clean Viada schema for a fresh Supabase project reset.
-- Apply to an empty project with Supabase auth enabled.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'therapist', 'admin')),
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  age smallint NOT NULL CHECK (age BETWEEN 1 AND 18),
  avatar text NOT NULL DEFAULT ':)',
  color text NOT NULL DEFAULT '#6366F1',
  therapist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  game_mode text NOT NULL DEFAULT 'kids' CHECK (game_mode IN ('kids', 'teen')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  mood text NOT NULL CHECK (mood IN ('happy', 'calm', 'anxious', 'angry', 'sad', 'tired')),
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 3),
  game text NOT NULL,
  world text NOT NULL DEFAULT '',
  played_at timestamptz NOT NULL DEFAULT now(),
  day_label text NOT NULL DEFAULT ''
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('alert', 'pattern', 'positive')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.therapist_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  ai_summary jsonb,
  week_of date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.iep_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  label text NOT NULL,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  max_score smallint NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX children_parent_id_idx ON public.children(parent_id);
CREATE INDEX children_therapist_id_idx ON public.children(therapist_id);
CREATE INDEX sessions_child_id_played_at_idx ON public.sessions(child_id, played_at DESC);
CREATE INDEX notifications_recipient_id_created_at_idx ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX therapist_notes_child_id_idx ON public.therapist_notes(child_id);
CREATE INDEX iep_goals_child_id_idx ON public.iep_goals(child_id);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.children TO authenticated;
GRANT SELECT, INSERT ON public.sessions TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.therapist_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.iep_goals TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iep_goals ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY children_therapist_select ON public.children
  FOR SELECT TO authenticated
  USING (auth.uid() = therapist_id);

CREATE POLICY sessions_related_select ON public.sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = sessions.child_id
        AND (children.parent_id = auth.uid() OR children.therapist_id = auth.uid())
    )
  );

CREATE POLICY sessions_parent_insert ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = sessions.child_id
        AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY notifications_recipient_select ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY notifications_recipient_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY therapist_notes_related_select ON public.therapist_notes
  FOR SELECT TO authenticated
  USING (
    auth.uid() = therapist_id OR EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = therapist_notes.child_id
        AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY therapist_notes_therapist_insert ON public.therapist_notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY therapist_notes_therapist_update ON public.therapist_notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY iep_goals_related_select ON public.iep_goals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = iep_goals.child_id
        AND (children.parent_id = auth.uid() OR children.therapist_id = auth.uid())
    )
  );

CREATE POLICY iep_goals_therapist_insert ON public.iep_goals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = iep_goals.child_id
        AND children.therapist_id = auth.uid()
    )
  );

CREATE POLICY iep_goals_therapist_update ON public.iep_goals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = iep_goals.child_id
        AND children.therapist_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = iep_goals.child_id
        AND children.therapist_id = auth.uid()
    )
  );

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_session_day_label()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.day_label := COALESCE(
    NULLIF(NEW.day_label, ''),
    CASE EXTRACT(DOW FROM NEW.played_at AT TIME ZONE 'UTC')
      WHEN 0 THEN 'Sun'
      WHEN 1 THEN 'Mon'
      WHEN 2 THEN 'Tue'
      WHEN 3 THEN 'Wed'
      WHEN 4 THEN 'Thu'
      WHEN 5 THEN 'Fri'
      WHEN 6 THEN 'Sat'
    END
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER sessions_day_label
  BEFORE INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_session_day_label();
