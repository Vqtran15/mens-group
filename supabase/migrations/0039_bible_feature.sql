-- Bible feature flag per group; off by default so existing groups are unaffected.
ALTER TABLE public.groups ADD COLUMN bible_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Allow the group creator to update their group's feature settings.
-- Other UPDATE paths (rename, etc.) go through RPCs that run SECURITY DEFINER,
-- so this narrow policy doesn't open any unintended blast radius.
CREATE POLICY "Group creator can update own group"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
