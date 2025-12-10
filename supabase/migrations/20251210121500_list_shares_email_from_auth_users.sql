-- Broaden invitee access to use canonical email from auth.users, not only JWT claim.
-- This fixes cases where the JWT email claim is missing or differs in casing/provider formatting.

-- Update list_shares policies
drop policy if exists list_shares_select on public.list_shares;
create policy list_shares_select on public.list_shares
  for select using (
    user_id = auth.uid()
    or invited_by = auth.uid()
    or list_owned_by_user(list_id, auth.uid())
    or (
      invited_email is not null
      and (
        lower(invited_email) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
        or exists (
          select 1 from auth.users u
          where u.id = auth.uid() and lower(u.email) = lower(invited_email)
        )
      )
    )
  );

drop policy if exists list_shares_update on public.list_shares;
create policy list_shares_update on public.list_shares
  for update using (
    user_id = auth.uid()
    or invited_by = auth.uid()
    or list_owned_by_user(list_id, auth.uid())
    or (
      invited_email is not null
      and (
        lower(invited_email) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
        or exists (
          select 1 from auth.users u
          where u.id = auth.uid() and lower(u.email) = lower(invited_email)
        )
      )
    )
  );

-- Update lists policy so invitees can read list names even when JWT lacks email.
drop policy if exists lists_select_owner_or_share on public.lists;
create policy lists_select_owner_or_share on public.lists
  for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.list_shares s
      where s.list_id = public.lists.id
        and s.status in ('pending','active')
        and (
          s.user_id = auth.uid()
          or (
            s.invited_email is not null
            and (
              lower(s.invited_email) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
              or exists (
                select 1 from auth.users u
                where u.id = auth.uid() and lower(u.email) = lower(s.invited_email)
              )
            )
          )
        )
    )
  );
