-- Make parent access to children explicit for each operation.
-- Parents can only read, insert, update, or delete child rows where parent_id is their own auth uid.

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "children_parent_all" ON public.children;
DROP POLICY IF EXISTS "children_parent_select" ON public.children;
DROP POLICY IF EXISTS "children_parent_insert" ON public.children;
DROP POLICY IF EXISTS "children_parent_update" ON public.children;
DROP POLICY IF EXISTS "children_parent_delete" ON public.children;

CREATE POLICY "children_parent_select" ON public.children
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "children_parent_insert" ON public.children
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "children_parent_update" ON public.children
  FOR UPDATE USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "children_parent_delete" ON public.children
  FOR DELETE USING (auth.uid() = parent_id);
