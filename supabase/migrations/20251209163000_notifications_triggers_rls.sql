-- Notifications + sharing/assignment triggers and RLS hardening

-- Helper to create notifications ( SECURITY DEFINER to bypass RLS )
create or replace function public.create_notification(_user_id uuid, _kind text, _payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _user_id is null then
    return;
  end if;
  insert into public.notifications(user_id, kind, payload) values (_user_id, coalesce(_kind, 'unknown'), coalesce(_payload, '{}'::jsonb));
exception
  when others then
    -- do not block caller
    perform 1;
end;
$$;

-- Trigger: list_shares AFTER INSERT (invited)
create or replace function public.notify_share_invited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select user_id into owner_id from public.lists where id = new.list_id;
  -- invitee
  perform public.create_notification(new.user_id, 'share_invited', jsonb_build_object('list_id', new.list_id, 'invited_by', new.invited_by));
  -- inviter confirmation
  perform public.create_notification(coalesce(new.invited_by, owner_id), 'share_invited_sent', jsonb_build_object('list_id', new.list_id, 'share_id', new.id));
  return new;
end;
$$;

drop trigger if exists trg_notify_share_invited on public.list_shares;
create trigger trg_notify_share_invited
after insert on public.list_shares
for each row execute function public.notify_share_invited();

-- Trigger: list_shares AFTER UPDATE status -> active (accepted)
create or replace function public.notify_share_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if (old.status is distinct from 'active') and new.status = 'active' then
    select user_id into owner_id from public.lists where id = new.list_id;
    perform public.create_notification(coalesce(new.invited_by, owner_id), 'share_accepted', jsonb_build_object('list_id', new.list_id, 'user_id', new.user_id, 'share_id', new.id));
    perform public.create_notification(new.user_id, 'share_accepted_self', jsonb_build_object('list_id', new.list_id, 'share_id', new.id));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_share_accepted on public.list_shares;
create trigger trg_notify_share_accepted
after update on public.list_shares
for each row execute function public.notify_share_accepted();

-- Trigger: list_shares AFTER UPDATE status -> revoked
create or replace function public.notify_share_revoked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.status is distinct from 'revoked') and new.status = 'revoked' then
    perform public.create_notification(old.user_id, 'share_revoked', jsonb_build_object('list_id', new.list_id, 'share_id', new.id));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_share_revoked on public.list_shares;
create trigger trg_notify_share_revoked
after update on public.list_shares
for each row execute function public.notify_share_revoked();

-- Trigger: tasks AFTER UPDATE assignee change
create or replace function public.notify_task_assignee_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.assignee_id is distinct from new.assignee_id then
    if new.assignee_id is not null then
      perform public.create_notification(
        new.assignee_id,
        'assignment_assigned',
        jsonb_build_object('task_id', new.id, 'title', new.title, 'list_id', new.list_id, 'previous_assignee', old.assignee_id)
      );
    end if;
    if old.assignee_id is not null then
      perform public.create_notification(
        old.assignee_id,
        'assignment_unassigned',
        jsonb_build_object('task_id', new.id, 'title', new.title, 'list_id', new.list_id, 'new_assignee', new.assignee_id)
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_task_assignee_change on public.tasks;
create trigger trg_notify_task_assignee_change
after update on public.tasks
for each row execute function public.notify_task_assignee_change();

-- RLS: tighten access
alter table public.notifications enable row level security;
alter table public.list_shares enable row level security;
alter table public.assignment_history enable row level security;

-- Notifications policies: owner can read/update own rows
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid());

-- List shares policies
drop policy if exists list_shares_select on public.list_shares;
create policy list_shares_select on public.list_shares
  for select using (
    user_id = auth.uid()
    or invited_by = auth.uid()
    or exists(select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid())
  );

drop policy if exists list_shares_insert on public.list_shares;
create policy list_shares_insert on public.list_shares
  for insert with check (
    exists(select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid())
  );

drop policy if exists list_shares_update on public.list_shares;
create policy list_shares_update on public.list_shares
  for update using (
    user_id = auth.uid()
    or invited_by = auth.uid()
    or exists(select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid())
  );

drop policy if exists list_shares_delete on public.list_shares;
create policy list_shares_delete on public.list_shares
  for delete using (
    invited_by = auth.uid()
    or exists(select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid())
    or user_id = auth.uid()
  );

-- Assignment history policies (read-only to relevant users)
drop policy if exists assignment_history_select on public.assignment_history;
create policy assignment_history_select on public.assignment_history
  for select using (
    exists(
      select 1 from public.tasks t
      where t.id = task_id
        and (t.user_id = auth.uid() or t.assignee_id = auth.uid())
    )
  );

-- No insert/update/delete policies for assignment_history or notifications: only triggers/service role should write.
