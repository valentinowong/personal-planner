-- Task history for undo/redo
create table if not exists public.task_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  task_id uuid not null,
  action text not null,
  payload_before jsonb,
  payload_after jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists task_history_user_created_idx on public.task_history (user_id, created_at desc);
create index if not exists task_history_task_idx on public.task_history (task_id);

-- RLS
alter table public.task_history enable row level security;

create policy "task_history_select_own" on public.task_history
  for select using (user_id = auth.uid());

create policy "task_history_insert_own" on public.task_history
  for insert with check (user_id = auth.uid());

create policy "task_history_delete_own" on public.task_history
  for delete using (user_id = auth.uid());

-- Keep last 7 days per user
create or replace function public.prune_task_history()
returns trigger language plpgsql as $$
begin
  delete from public.task_history
  where user_id = new.user_id
    and created_at < now() - interval '7 days';
  return new;
end;
$$;

drop trigger if exists prune_task_history_trigger on public.task_history;
create trigger prune_task_history_trigger
  after insert on public.task_history
  for each row execute function public.prune_task_history();
