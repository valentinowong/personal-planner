-- Broaden lists SELECT so invitees (by user_id or invited_email) can see list names for invites
-- Keep modifications restricted to owners.

DROP POLICY IF EXISTS "User lists" ON public.lists;

CREATE POLICY lists_select_owner_or_share ON public.lists
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.list_shares s
      WHERE s.list_id = public.lists.id
        AND s.status IN ('pending','active')
        AND (
          s.user_id = auth.uid()
          OR (
            s.invited_email IS NOT NULL
            AND lower(s.invited_email) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
          )
        )
    )
  );

CREATE POLICY lists_modify_owner ON public.lists
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
