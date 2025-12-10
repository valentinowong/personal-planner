-- Fix list_shares/list invite visibility without relying on JWT email claim privileges.
-- Adds a SECURITY DEFINER helper to fetch the authenticated user's canonical email
-- and rewrites policies to use it (and the JWT claim) while removing the temporary debug policy.

-- Helper: return canonical email for a user (bypasses auth.users privileges for clients).
create or replace function public.user_email(_uid uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select email from auth.users where id = _uid;
$$;

-- Remove temporary open select policy if still present.
drop policy if exists list_shares_select_debug on public.list_shares;

-- Recreate list_shares policies using helper.
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
        or lower(invited_email) = lower(public.user_email(auth.uid()))
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
        or lower(invited_email) = lower(public.user_email(auth.uid()))
      )
    )
  );

-- Recreate lists select policy to leverage helper.
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
              or lower(s.invited_email) = lower(public.user_email(auth.uid()))
            )
          )
        )
    )
  );
