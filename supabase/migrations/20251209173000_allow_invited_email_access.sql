-- Allow invitees identified only by email to view/act on their pending list_shares rows

-- Recreate select policy to include invited_email match on auth email
DROP POLICY IF EXISTS list_shares_select ON public.list_shares;
CREATE POLICY list_shares_select ON public.list_shares
  FOR SELECT USING (
    user_id = auth.uid()
    OR invited_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.lists l WHERE l.id = list_id AND l.user_id = auth.uid())
    OR (
      invited_email IS NOT NULL
      AND lower(invited_email) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
    )
  );

-- Recreate update policy so invitees by email can accept/decline
DROP POLICY IF EXISTS list_shares_update ON public.list_shares;
CREATE POLICY list_shares_update ON public.list_shares
  FOR UPDATE USING (
    user_id = auth.uid()
    OR invited_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.lists l WHERE l.id = list_id AND l.user_id = auth.uid())
    OR (
      invited_email IS NOT NULL
      AND lower(invited_email) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
    )
  );
