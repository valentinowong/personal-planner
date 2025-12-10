-- Share-aware task visibility.
-- Allows list collaborators to read tasks on shared lists while keeping writes owner-only.

-- Helper: true if list is shared with the user (active share) or owned by the user.
create or replace function public.list_shared_with_user(_list_id uuid, _uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    coalesce(list_owned_by_user(_list_id, _uid), false)
    or exists (
      select 1
      from public.list_shares s
      where s.list_id = _list_id
        and s.status = 'active'
        and (
          s.user_id = _uid
          or (
            s.invited_email is not null
            and lower(s.invited_email) = lower(public.user_email(_uid))
          )
        )
    );
$$;

-- Tasks: replace owner-only policy with share-aware select; keep writes owner-only for now.
drop policy if exists "User tasks" on public.tasks;
drop policy if exists tasks_select_shared on public.tasks;
drop policy if exists tasks_insert_owner on public.tasks;
drop policy if exists tasks_update_owner on public.tasks;
drop policy if exists tasks_delete_owner on public.tasks;

create policy tasks_select_shared on public.tasks
  for select using (
    user_id = auth.uid()
    or assignee_id = auth.uid()
    or (list_id is not null and list_shared_with_user(list_id, auth.uid()))
  );

create policy tasks_insert_owner on public.tasks
  for insert with check (user_id = auth.uid());

create policy tasks_update_owner on public.tasks
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy tasks_delete_owner on public.tasks
  for delete using (user_id = auth.uid());
