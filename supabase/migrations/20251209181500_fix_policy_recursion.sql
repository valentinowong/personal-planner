-- Fix RLS recursion between lists and list_shares by using a SECURITY DEFINER helper.
-- Also ensure owners, inviters, invitees-by-email/user_id can read/update list_shares.

-- Helper function: true if the given user owns the list (bypasses RLS).
create or replace function public.list_owned_by_user(_list_id uuid, _uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.lists where id = _list_id and user_id = _uid);
$$;

-- Reset list_shares policies to avoid recursive references.
drop policy if exists list_shares_select on public.list_shares;
drop policy if exists list_shares_insert on public.list_shares;
drop policy if exists list_shares_update on public.list_shares;
drop policy if exists list_shares_delete on public.list_shares;

-- Select: invitee, inviter, or list owner
create policy list_shares_select on public.list_shares
  for select using (
    user_id = auth.uid()
    or invited_by = auth.uid()
    or list_owned_by_user(list_id, auth.uid())
    or (
      invited_email is not null
      and lower(invited_email) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
    )
  );

-- Insert: only list owners (inviter)
create policy list_shares_insert on public.list_shares
  for insert with check (list_owned_by_user(list_id, auth.uid()));

-- Update: invitee, inviter, or list owner
create policy list_shares_update on public.list_shares
  for update using (
    user_id = auth.uid()
    or invited_by = auth.uid()
    or list_owned_by_user(list_id, auth.uid())
    or (
      invited_email is not null
      and lower(invited_email) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
    )
  );

-- Delete: inviter or list owner (invitee can decline via status update, not delete)
create policy list_shares_delete on public.list_shares
  for delete using (
    invited_by = auth.uid()
    or list_owned_by_user(list_id, auth.uid())
  );
