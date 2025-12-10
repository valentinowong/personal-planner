-- Replace broad FOR ALL policy with explicit, minimal policies to avoid side-effects during auth/signup.
-- Goal: owners always have full access; invitees (by user_id or invited_email) can SELECT list names for invites.

-- Drop prior policies introduced in 20251209174000_lists_policy_shared_access.sql
DROP POLICY IF EXISTS lists_select_owner_or_share ON public.lists;
DROP POLICY IF EXISTS lists_modify_owner ON public.lists;
DROP POLICY IF EXISTS "User lists" ON public.lists;

-- Select: owner or share participant (pending/active) by user_id or invited_email
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

-- Insert: only owner (the creator) can insert; check ensures row bound to auth user
CREATE POLICY lists_insert_owner ON public.lists
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update: only owner
CREATE POLICY lists_update_owner ON public.lists
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Delete: only owner
CREATE POLICY lists_delete_owner ON public.lists
  FOR DELETE USING (user_id = auth.uid());
