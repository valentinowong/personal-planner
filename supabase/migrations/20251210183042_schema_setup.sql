create type "public"."recurrence_freq" as enum ('DAILY', 'WEEKLY', 'MONTHLY');

create type "public"."task_status" as enum ('todo', 'doing', 'done', 'canceled');


  create table "public"."assignment_history" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "task_id" uuid not null,
    "previous_assignee_id" uuid,
    "new_assignee_id" uuid,
    "changed_by" uuid not null,
    "note" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."assignment_history" enable row level security;


  create table "public"."labels" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "color" text not null
      );


alter table "public"."labels" enable row level security;


  create table "public"."list_shares" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "list_id" uuid not null,
    "user_id" uuid,
    "invited_email" text,
    "role" text not null default 'collaborator'::text,
    "status" text not null default 'pending'::text,
    "invited_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."list_shares" enable row level security;


  create table "public"."lists" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "sort_index" integer default 0,
    "is_system" boolean default false,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."lists" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "kind" text not null,
    "payload" jsonb,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."profiles" (
    "user_id" uuid not null,
    "display_name" text,
    "tz" text default 'UTC'::text,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."profiles" enable row level security;


  create table "public"."recurrence_occurrences" (
    "recurrence_id" uuid not null,
    "occurrence_date" date not null,
    "moved_to_date" date,
    "status" public.task_status default 'todo'::public.task_status,
    "title" text,
    "notes" text,
    "list_id" uuid,
    "planned_start" timestamp with time zone,
    "planned_end" timestamp with time zone,
    "actual_minutes" integer,
    "skip" boolean default false
      );


alter table "public"."recurrence_occurrences" enable row level security;


  create table "public"."recurrences" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid(),
    "title" text not null,
    "notes" text,
    "list_id" uuid,
    "freq" public.recurrence_freq not null,
    "interval" integer not null default 1,
    "byday" integer[] default '{}'::integer[],
    "by_monthday" integer[] default '{}'::integer[],
    "start_date" date not null,
    "until" date,
    "estimate_minutes" integer,
    "priority" integer default 0,
    "active" boolean default true,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "template_task_id" uuid
      );


alter table "public"."recurrences" enable row level security;


  create table "public"."subtasks" (
    "id" uuid not null default gen_random_uuid(),
    "task_id" uuid not null,
    "title" text not null,
    "done" boolean default false,
    "sort_index" integer default 0
      );


alter table "public"."subtasks" enable row level security;


  create table "public"."task_history" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "task_id" uuid not null,
    "action" text not null,
    "payload_before" jsonb,
    "payload_after" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."task_history" enable row level security;


  create table "public"."task_labels" (
    "task_id" uuid not null,
    "label_id" uuid not null
      );


alter table "public"."task_labels" enable row level security;


  create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "list_id" uuid,
    "title" text not null,
    "notes" text,
    "status" public.task_status not null default 'todo'::public.task_status,
    "due_date" date,
    "planned_start" timestamp with time zone,
    "planned_end" timestamp with time zone,
    "estimate_minutes" integer,
    "actual_minutes" integer,
    "priority" integer default 0,
    "sort_index" double precision default 0,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now()),
    "assignee_id" uuid
      );


alter table "public"."tasks" enable row level security;

CREATE UNIQUE INDEX assignment_history_pkey ON public.assignment_history USING btree (id);

CREATE UNIQUE INDEX labels_pkey ON public.labels USING btree (id);

CREATE UNIQUE INDEX list_shares_pkey ON public.list_shares USING btree (id);

CREATE UNIQUE INDEX list_shares_unique_member ON public.list_shares USING btree (list_id, user_id) WHERE (status <> 'revoked'::text);

CREATE UNIQUE INDEX lists_pkey ON public.lists USING btree (id);
CREATE UNIQUE INDEX lists_owner_name_unique ON public.lists USING btree (user_id, lower(name));

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

CREATE INDEX recurrence_occurrence_idx ON public.recurrence_occurrences USING btree (recurrence_id, occurrence_date);

CREATE UNIQUE INDEX recurrence_occurrences_pkey ON public.recurrence_occurrences USING btree (recurrence_id, occurrence_date);

CREATE UNIQUE INDEX recurrences_pkey ON public.recurrences USING btree (id);

CREATE INDEX recurrences_user_active_start_idx ON public.recurrences USING btree (user_id, active, start_date);

CREATE UNIQUE INDEX subtasks_pkey ON public.subtasks USING btree (id);

CREATE UNIQUE INDEX task_history_pkey ON public.task_history USING btree (id);

CREATE INDEX task_history_task_idx ON public.task_history USING btree (task_id);

CREATE INDEX task_history_user_created_idx ON public.task_history USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX task_labels_pkey ON public.task_labels USING btree (task_id, label_id);

CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);

CREATE INDEX tasks_user_due_date_idx ON public.tasks USING btree (user_id, due_date);

CREATE INDEX tasks_user_updated_at_idx ON public.tasks USING btree (user_id, updated_at);

alter table "public"."assignment_history" add constraint "assignment_history_pkey" PRIMARY KEY using index "assignment_history_pkey";

alter table "public"."labels" add constraint "labels_pkey" PRIMARY KEY using index "labels_pkey";

alter table "public"."list_shares" add constraint "list_shares_pkey" PRIMARY KEY using index "list_shares_pkey";

alter table "public"."lists" add constraint "lists_pkey" PRIMARY KEY using index "lists_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."recurrence_occurrences" add constraint "recurrence_occurrences_pkey" PRIMARY KEY using index "recurrence_occurrences_pkey";

alter table "public"."recurrences" add constraint "recurrences_pkey" PRIMARY KEY using index "recurrences_pkey";

alter table "public"."subtasks" add constraint "subtasks_pkey" PRIMARY KEY using index "subtasks_pkey";

alter table "public"."task_history" add constraint "task_history_pkey" PRIMARY KEY using index "task_history_pkey";

alter table "public"."task_labels" add constraint "task_labels_pkey" PRIMARY KEY using index "task_labels_pkey";

alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";

alter table "public"."assignment_history" add constraint "assignment_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) not valid;

alter table "public"."assignment_history" validate constraint "assignment_history_changed_by_fkey";

alter table "public"."assignment_history" add constraint "assignment_history_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."assignment_history" validate constraint "assignment_history_task_id_fkey";

alter table "public"."labels" add constraint "labels_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."labels" validate constraint "labels_user_id_fkey";

alter table "public"."list_shares" add constraint "list_shares_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) not valid;

alter table "public"."list_shares" validate constraint "list_shares_invited_by_fkey";

alter table "public"."list_shares" add constraint "list_shares_list_id_fkey" FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE not valid;

alter table "public"."list_shares" validate constraint "list_shares_list_id_fkey";

alter table "public"."list_shares" add constraint "list_shares_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'collaborator'::text]))) not valid;

alter table "public"."list_shares" validate constraint "list_shares_role_check";

alter table "public"."list_shares" add constraint "list_shares_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'revoked'::text]))) not valid;

alter table "public"."list_shares" validate constraint "list_shares_status_check";

alter table "public"."list_shares" add constraint "list_shares_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."list_shares" validate constraint "list_shares_user_id_fkey";

alter table "public"."lists" add constraint "lists_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."lists" validate constraint "lists_user_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."recurrence_occurrences" add constraint "recurrence_occurrences_list_id_fkey" FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE SET NULL not valid;

alter table "public"."recurrence_occurrences" validate constraint "recurrence_occurrences_list_id_fkey";

alter table "public"."recurrence_occurrences" add constraint "recurrence_occurrences_recurrence_id_fkey" FOREIGN KEY (recurrence_id) REFERENCES public.recurrences(id) ON DELETE CASCADE not valid;

alter table "public"."recurrence_occurrences" validate constraint "recurrence_occurrences_recurrence_id_fkey";

alter table "public"."recurrences" add constraint "recurrences_list_id_fkey" FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE SET NULL not valid;

alter table "public"."recurrences" validate constraint "recurrences_list_id_fkey";

alter table "public"."recurrences" add constraint "recurrences_template_task_id_fkey" FOREIGN KEY (template_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."recurrences" validate constraint "recurrences_template_task_id_fkey";

alter table "public"."recurrences" add constraint "recurrences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."recurrences" validate constraint "recurrences_user_id_fkey";

alter table "public"."subtasks" add constraint "subtasks_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."subtasks" validate constraint "subtasks_task_id_fkey";

alter table "public"."task_labels" add constraint "task_labels_label_id_fkey" FOREIGN KEY (label_id) REFERENCES public.labels(id) ON DELETE CASCADE not valid;

alter table "public"."task_labels" validate constraint "task_labels_label_id_fkey";

alter table "public"."task_labels" add constraint "task_labels_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."task_labels" validate constraint "task_labels_task_id_fkey";

alter table "public"."tasks" add constraint "tasks_list_id_fkey" FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_list_id_fkey";

alter table "public"."tasks" add constraint "tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_notification(_user_id uuid, _kind text, _payload jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_tasks_window(_start date, _end date)
 RETURNS TABLE(id uuid, user_id uuid, list_id uuid, assignee_id uuid, title text, notes text, status public.task_status, due_date date, planned_start timestamp with time zone, planned_end timestamp with time zone, estimate_minutes integer, actual_minutes integer, priority integer, sort_index integer, is_recurring boolean, recurrence_id uuid, occurrence_date date, moved_to_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with window_days as (
    select generate_series(_start, _end, interval '1 day')::date as day
  ),
  expanded as (
    select
      uuid_v5(r.id, d.day::text) as id,
      r.user_id,
      coalesce(occ.list_id, r.list_id) as list_id,
      null::uuid as assignee_id,
      coalesce(occ.title, r.title) as title,
      coalesce(occ.notes, r.notes) as notes,
      coalesce(occ.status, 'todo') as status,
      coalesce(occ.moved_to_date, d.day) as due_date,
      coalesce(occ.planned_start, null) as planned_start,
      coalesce(occ.planned_end, null) as planned_end,
      r.estimate_minutes,
      coalesce(occ.actual_minutes, null) as actual_minutes,
      r.priority,
      0 as sort_index,
      true as is_recurring,
      r.id as recurrence_id,
      d.day as occurrence_date,
      occ.moved_to_date,
      occ.skip
    from public.recurrences r
    join window_days d on d.day between _start and _end
    left join public.recurrence_occurrences occ
      on occ.recurrence_id = r.id and occ.occurrence_date = d.day
    where r.user_id = auth.uid()
      and r.active
      and r.start_date <= d.day
      and (r.until is null or d.day <= r.until)
      and (occ.skip is distinct from true)
      and (
        case r.freq
          when 'DAILY' then ((d.day - r.start_date)::int % r.interval = 0)
          when 'WEEKLY' then (
            floor(extract(epoch from (d.day::timestamp - r.start_date::timestamp)) / 604800)::int % r.interval = 0
          )
          when 'MONTHLY' then ((date_part('year', age(d.day, r.start_date)) * 12 + date_part('month', age(d.day, r.start_date)))::int % r.interval = 0)
        end
      )
      and (
        coalesce(cardinality(r.byday), 0) = 0
        or extract(dow from d.day)::int = any(r.byday)
      )
      and (
        coalesce(cardinality(r.by_monthday), 0) = 0
        or extract(day from d.day)::int = any(r.by_monthday)
      )
  )
  select * from (
    select
      t.id,
      t.user_id,
      t.list_id,
      t.assignee_id,
      t.title,
      t.notes,
      t.status,
      t.due_date,
      t.planned_start,
      t.planned_end,
      t.estimate_minutes,
      t.actual_minutes,
      t.priority,
      t.sort_index,
      false as is_recurring,
      null::uuid as recurrence_id,
      null::date as occurrence_date,
      null::date as moved_to_date
    from public.tasks t
    where t.due_date between _start and _end
      and (
        t.user_id = auth.uid()
        or t.assignee_id = auth.uid()
        or (t.list_id is not null and list_shared_with_user(t.list_id, auth.uid()))
      )

    union all

    select
      e.id,
      e.user_id,
      e.list_id,
      e.assignee_id,
      e.title,
      e.notes,
      e.status,
      e.due_date,
      e.planned_start,
      e.planned_end,
      e.estimate_minutes,
      e.actual_minutes,
      e.priority,
      e.sort_index,
      e.is_recurring,
      e.recurrence_id,
      e.occurrence_date,
      e.moved_to_date
    from expanded e
  ) combined
  order by due_date, sort_index, priority desc;
$function$
;

CREATE OR REPLACE FUNCTION public.list_owned_by_user(_list_id uuid, _uid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from public.lists where id = _list_id and user_id = _uid);
$function$
;

CREATE OR REPLACE FUNCTION public.list_shared_with_user(_list_id uuid, _uid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            and (
              lower(s.invited_email) = lower(public.user_email(_uid))
              or lower(s.invited_email) = lower(COALESCE(current_setting('request.jwt.claim.email', true), ''::text))
            )
          )
        )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.notify_share_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.notify_share_invited()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  owner_id uuid;
  invitee_id uuid;
begin
  select user_id into owner_id from public.lists where id = new.list_id;

  -- resolve invitee by email if user_id is null
  invitee_id := new.user_id;
  if invitee_id is null and new.invited_email is not null then
    select id into invitee_id from auth.users where lower(email) = lower(new.invited_email) limit 1;
  end if;

  -- invitee notification (only if we have a user id)
  perform public.create_notification(invitee_id, 'share_invited', jsonb_build_object('list_id', new.list_id, 'invited_by', new.invited_by, 'share_id', new.id));

  -- inviter confirmation removed (sender does not need a notification)
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_share_revoked()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (old.status is distinct from 'revoked') and new.status = 'revoked' then
    perform public.create_notification(old.user_id, 'share_revoked', jsonb_build_object('list_id', new.list_id, 'share_id', new.id));
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_task_assignee_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor uuid := coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
    auth.uid()
  );
begin
  if old.assignee_id is distinct from new.assignee_id then
    if new.assignee_id is not null then
      -- Skip notifying if the actor assigned themselves
      if actor is distinct from new.assignee_id then
        perform public.create_notification(
          new.assignee_id,
          'assignment_assigned',
          jsonb_build_object(
            'task_id', new.id,
            'title', new.title,
            'list_id', new.list_id,
            'previous_assignee', old.assignee_id,
            'actor_id', actor
          )
        );
      end if;
    end if;
    if old.assignee_id is not null then
      -- Skip notifying if the actor unassigned themselves
      if actor is distinct from old.assignee_id then
        perform public.create_notification(
          old.assignee_id,
          'assignment_unassigned',
          jsonb_build_object(
            'task_id', new.id,
            'title', new.title,
            'list_id', new.list_id,
            'new_assignee', new.assignee_id,
            'actor_id', actor
          )
        );
      end if;
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prune_task_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  delete from public.task_history
  where user_id = new.user_id
    and created_at < now() - interval '7 days';
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.user_email(_uid uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select email from auth.users where id = _uid;
$function$
;

CREATE OR REPLACE FUNCTION public.uuid_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select extensions.uuid_generate_v5(namespace, name);
$function$
;

grant delete on table "public"."assignment_history" to "anon";

grant insert on table "public"."assignment_history" to "anon";

grant references on table "public"."assignment_history" to "anon";

grant select on table "public"."assignment_history" to "anon";

grant trigger on table "public"."assignment_history" to "anon";

grant truncate on table "public"."assignment_history" to "anon";

grant update on table "public"."assignment_history" to "anon";

grant delete on table "public"."assignment_history" to "authenticated";

grant insert on table "public"."assignment_history" to "authenticated";

grant references on table "public"."assignment_history" to "authenticated";

grant select on table "public"."assignment_history" to "authenticated";

grant trigger on table "public"."assignment_history" to "authenticated";

grant truncate on table "public"."assignment_history" to "authenticated";

grant update on table "public"."assignment_history" to "authenticated";

grant delete on table "public"."assignment_history" to "service_role";

grant insert on table "public"."assignment_history" to "service_role";

grant references on table "public"."assignment_history" to "service_role";

grant select on table "public"."assignment_history" to "service_role";

grant trigger on table "public"."assignment_history" to "service_role";

grant truncate on table "public"."assignment_history" to "service_role";

grant update on table "public"."assignment_history" to "service_role";

grant delete on table "public"."labels" to "anon";

grant insert on table "public"."labels" to "anon";

grant references on table "public"."labels" to "anon";

grant select on table "public"."labels" to "anon";

grant trigger on table "public"."labels" to "anon";

grant truncate on table "public"."labels" to "anon";

grant update on table "public"."labels" to "anon";

grant delete on table "public"."labels" to "authenticated";

grant insert on table "public"."labels" to "authenticated";

grant references on table "public"."labels" to "authenticated";

grant select on table "public"."labels" to "authenticated";

grant trigger on table "public"."labels" to "authenticated";

grant truncate on table "public"."labels" to "authenticated";

grant update on table "public"."labels" to "authenticated";

grant delete on table "public"."labels" to "service_role";

grant insert on table "public"."labels" to "service_role";

grant references on table "public"."labels" to "service_role";

grant select on table "public"."labels" to "service_role";

grant trigger on table "public"."labels" to "service_role";

grant truncate on table "public"."labels" to "service_role";

grant update on table "public"."labels" to "service_role";

grant delete on table "public"."list_shares" to "anon";

grant insert on table "public"."list_shares" to "anon";

grant references on table "public"."list_shares" to "anon";

grant select on table "public"."list_shares" to "anon";

grant trigger on table "public"."list_shares" to "anon";

grant truncate on table "public"."list_shares" to "anon";

grant update on table "public"."list_shares" to "anon";

grant delete on table "public"."list_shares" to "authenticated";

grant insert on table "public"."list_shares" to "authenticated";

grant references on table "public"."list_shares" to "authenticated";

grant select on table "public"."list_shares" to "authenticated";

grant trigger on table "public"."list_shares" to "authenticated";

grant truncate on table "public"."list_shares" to "authenticated";

grant update on table "public"."list_shares" to "authenticated";

grant delete on table "public"."list_shares" to "service_role";

grant insert on table "public"."list_shares" to "service_role";

grant references on table "public"."list_shares" to "service_role";

grant select on table "public"."list_shares" to "service_role";

grant trigger on table "public"."list_shares" to "service_role";

grant truncate on table "public"."list_shares" to "service_role";

grant update on table "public"."list_shares" to "service_role";

grant delete on table "public"."lists" to "anon";

grant insert on table "public"."lists" to "anon";

grant references on table "public"."lists" to "anon";

grant select on table "public"."lists" to "anon";

grant trigger on table "public"."lists" to "anon";

grant truncate on table "public"."lists" to "anon";

grant update on table "public"."lists" to "anon";

grant delete on table "public"."lists" to "authenticated";

grant insert on table "public"."lists" to "authenticated";

grant references on table "public"."lists" to "authenticated";

grant select on table "public"."lists" to "authenticated";

grant trigger on table "public"."lists" to "authenticated";

grant truncate on table "public"."lists" to "authenticated";

grant update on table "public"."lists" to "authenticated";

grant delete on table "public"."lists" to "service_role";

grant insert on table "public"."lists" to "service_role";

grant references on table "public"."lists" to "service_role";

grant select on table "public"."lists" to "service_role";

grant trigger on table "public"."lists" to "service_role";

grant truncate on table "public"."lists" to "service_role";

grant update on table "public"."lists" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."recurrence_occurrences" to "anon";

grant insert on table "public"."recurrence_occurrences" to "anon";

grant references on table "public"."recurrence_occurrences" to "anon";

grant select on table "public"."recurrence_occurrences" to "anon";

grant trigger on table "public"."recurrence_occurrences" to "anon";

grant truncate on table "public"."recurrence_occurrences" to "anon";

grant update on table "public"."recurrence_occurrences" to "anon";

grant delete on table "public"."recurrence_occurrences" to "authenticated";

grant insert on table "public"."recurrence_occurrences" to "authenticated";

grant references on table "public"."recurrence_occurrences" to "authenticated";

grant select on table "public"."recurrence_occurrences" to "authenticated";

grant trigger on table "public"."recurrence_occurrences" to "authenticated";

grant truncate on table "public"."recurrence_occurrences" to "authenticated";

grant update on table "public"."recurrence_occurrences" to "authenticated";

grant delete on table "public"."recurrence_occurrences" to "service_role";

grant insert on table "public"."recurrence_occurrences" to "service_role";

grant references on table "public"."recurrence_occurrences" to "service_role";

grant select on table "public"."recurrence_occurrences" to "service_role";

grant trigger on table "public"."recurrence_occurrences" to "service_role";

grant truncate on table "public"."recurrence_occurrences" to "service_role";

grant update on table "public"."recurrence_occurrences" to "service_role";

grant delete on table "public"."recurrences" to "anon";

grant insert on table "public"."recurrences" to "anon";

grant references on table "public"."recurrences" to "anon";

grant select on table "public"."recurrences" to "anon";

grant trigger on table "public"."recurrences" to "anon";

grant truncate on table "public"."recurrences" to "anon";

grant update on table "public"."recurrences" to "anon";

grant delete on table "public"."recurrences" to "authenticated";

grant insert on table "public"."recurrences" to "authenticated";

grant references on table "public"."recurrences" to "authenticated";

grant select on table "public"."recurrences" to "authenticated";

grant trigger on table "public"."recurrences" to "authenticated";

grant truncate on table "public"."recurrences" to "authenticated";

grant update on table "public"."recurrences" to "authenticated";

grant delete on table "public"."recurrences" to "service_role";

grant insert on table "public"."recurrences" to "service_role";

grant references on table "public"."recurrences" to "service_role";

grant select on table "public"."recurrences" to "service_role";

grant trigger on table "public"."recurrences" to "service_role";

grant truncate on table "public"."recurrences" to "service_role";

grant update on table "public"."recurrences" to "service_role";

grant delete on table "public"."subtasks" to "anon";

grant insert on table "public"."subtasks" to "anon";

grant references on table "public"."subtasks" to "anon";

grant select on table "public"."subtasks" to "anon";

grant trigger on table "public"."subtasks" to "anon";

grant truncate on table "public"."subtasks" to "anon";

grant update on table "public"."subtasks" to "anon";

grant delete on table "public"."subtasks" to "authenticated";

grant insert on table "public"."subtasks" to "authenticated";

grant references on table "public"."subtasks" to "authenticated";

grant select on table "public"."subtasks" to "authenticated";

grant trigger on table "public"."subtasks" to "authenticated";

grant truncate on table "public"."subtasks" to "authenticated";

grant update on table "public"."subtasks" to "authenticated";

grant delete on table "public"."subtasks" to "service_role";

grant insert on table "public"."subtasks" to "service_role";

grant references on table "public"."subtasks" to "service_role";

grant select on table "public"."subtasks" to "service_role";

grant trigger on table "public"."subtasks" to "service_role";

grant truncate on table "public"."subtasks" to "service_role";

grant update on table "public"."subtasks" to "service_role";

grant delete on table "public"."task_history" to "anon";

grant insert on table "public"."task_history" to "anon";

grant references on table "public"."task_history" to "anon";

grant select on table "public"."task_history" to "anon";

grant trigger on table "public"."task_history" to "anon";

grant truncate on table "public"."task_history" to "anon";

grant update on table "public"."task_history" to "anon";

grant delete on table "public"."task_history" to "authenticated";

grant insert on table "public"."task_history" to "authenticated";

grant references on table "public"."task_history" to "authenticated";

grant select on table "public"."task_history" to "authenticated";

grant trigger on table "public"."task_history" to "authenticated";

grant truncate on table "public"."task_history" to "authenticated";

grant update on table "public"."task_history" to "authenticated";

grant delete on table "public"."task_history" to "service_role";

grant insert on table "public"."task_history" to "service_role";

grant references on table "public"."task_history" to "service_role";

grant select on table "public"."task_history" to "service_role";

grant trigger on table "public"."task_history" to "service_role";

grant truncate on table "public"."task_history" to "service_role";

grant update on table "public"."task_history" to "service_role";

grant delete on table "public"."task_labels" to "anon";

grant insert on table "public"."task_labels" to "anon";

grant references on table "public"."task_labels" to "anon";

grant select on table "public"."task_labels" to "anon";

grant trigger on table "public"."task_labels" to "anon";

grant truncate on table "public"."task_labels" to "anon";

grant update on table "public"."task_labels" to "anon";

grant delete on table "public"."task_labels" to "authenticated";

grant insert on table "public"."task_labels" to "authenticated";

grant references on table "public"."task_labels" to "authenticated";

grant select on table "public"."task_labels" to "authenticated";

grant trigger on table "public"."task_labels" to "authenticated";

grant truncate on table "public"."task_labels" to "authenticated";

grant update on table "public"."task_labels" to "authenticated";

grant delete on table "public"."task_labels" to "service_role";

grant insert on table "public"."task_labels" to "service_role";

grant references on table "public"."task_labels" to "service_role";

grant select on table "public"."task_labels" to "service_role";

grant trigger on table "public"."task_labels" to "service_role";

grant truncate on table "public"."task_labels" to "service_role";

grant update on table "public"."task_labels" to "service_role";

grant delete on table "public"."tasks" to "anon";

grant insert on table "public"."tasks" to "anon";

grant references on table "public"."tasks" to "anon";

grant select on table "public"."tasks" to "anon";

grant trigger on table "public"."tasks" to "anon";

grant truncate on table "public"."tasks" to "anon";

grant update on table "public"."tasks" to "anon";

grant delete on table "public"."tasks" to "authenticated";

grant insert on table "public"."tasks" to "authenticated";

grant references on table "public"."tasks" to "authenticated";

grant select on table "public"."tasks" to "authenticated";

grant trigger on table "public"."tasks" to "authenticated";

grant truncate on table "public"."tasks" to "authenticated";

grant update on table "public"."tasks" to "authenticated";

grant delete on table "public"."tasks" to "service_role";

grant insert on table "public"."tasks" to "service_role";

grant references on table "public"."tasks" to "service_role";

grant select on table "public"."tasks" to "service_role";

grant trigger on table "public"."tasks" to "service_role";

grant truncate on table "public"."tasks" to "service_role";

grant update on table "public"."tasks" to "service_role";


  create policy "assignment_history_select"
  on "public"."assignment_history"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.tasks t
  WHERE ((t.id = assignment_history.task_id) AND ((t.user_id = auth.uid()) OR (t.assignee_id = auth.uid()))))));

  create policy "assignment_history_insert"
  on "public"."assignment_history"
  as permissive
  for insert
  to public
with check ((changed_by = auth.uid()));



  create policy "User labels"
  on "public"."labels"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "list_shares_delete"
  on "public"."list_shares"
  as permissive
  for delete
  to public
using (((invited_by = auth.uid()) OR public.list_owned_by_user(list_id, auth.uid())));



  create policy "list_shares_insert"
  on "public"."list_shares"
  as permissive
  for insert
  to public
with check (public.list_owned_by_user(list_id, auth.uid()));



  create policy "list_shares_select"
  on "public"."list_shares"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (invited_by = auth.uid()) OR public.list_owned_by_user(list_id, auth.uid()) OR ((invited_email IS NOT NULL) AND ((lower(invited_email) = lower(COALESCE(current_setting('request.jwt.claim.email'::text, true), ''::text))) OR (lower(invited_email) = lower(public.user_email(auth.uid())))))));



  create policy "list_shares_update"
  on "public"."list_shares"
  as permissive
  for update
  to public
using (((user_id = auth.uid()) OR (invited_by = auth.uid()) OR public.list_owned_by_user(list_id, auth.uid()) OR ((invited_email IS NOT NULL) AND ((lower(invited_email) = lower(COALESCE(current_setting('request.jwt.claim.email'::text, true), ''::text))) OR (lower(invited_email) = lower(public.user_email(auth.uid())))))));



  create policy "lists_delete_owner"
  on "public"."lists"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "lists_insert_owner"
  on "public"."lists"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "lists_select_owner_or_share"
  on "public"."lists"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.list_shares s
  WHERE ((s.list_id = lists.id) AND (s.status = ANY (ARRAY['pending'::text, 'active'::text])) AND ((s.user_id = auth.uid()) OR ((s.invited_email IS NOT NULL) AND ((lower(s.invited_email) = lower(COALESCE(current_setting('request.jwt.claim.email'::text, true), ''::text))) OR (lower(s.invited_email) = lower(public.user_email(auth.uid())))))))))));



  create policy "lists_update_owner"
  on "public"."lists"
  as permissive
  for update
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "notifications_select"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "notifications_update"
  on "public"."notifications"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));



  create policy "User can manage own profile"
  on "public"."profiles"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "User recurrence overrides"
  on "public"."recurrence_occurrences"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.recurrences r
  WHERE ((r.id = recurrence_occurrences.recurrence_id) AND (r.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.recurrences r
  WHERE ((r.id = recurrence_occurrences.recurrence_id) AND (r.user_id = auth.uid())))));



  create policy "User recurrences"
  on "public"."recurrences"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "User subtasks"
  on "public"."subtasks"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.tasks t
  WHERE ((t.id = subtasks.task_id) AND (t.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.tasks t
  WHERE ((t.id = subtasks.task_id) AND (t.user_id = auth.uid())))));



  create policy "task_history_delete_own"
  on "public"."task_history"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "task_history_insert_own"
  on "public"."task_history"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "task_history_select_own"
  on "public"."task_history"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "User task labels"
  on "public"."task_labels"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.tasks t
     JOIN public.labels l ON ((l.id = task_labels.label_id)))
  WHERE ((t.id = task_labels.task_id) AND (t.user_id = auth.uid()) AND (l.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM (public.tasks t
     JOIN public.labels l ON ((l.id = task_labels.label_id)))
  WHERE ((t.id = task_labels.task_id) AND (t.user_id = auth.uid()) AND (l.user_id = auth.uid())))));



  create policy "tasks_delete_shared"
  on "public"."tasks"
  as permissive
  for delete
  to public
using (((user_id = auth.uid()) OR ((list_id IS NOT NULL) AND public.list_shared_with_user(list_id, auth.uid()))));



  create policy "tasks_insert_shared"
  on "public"."tasks"
  as permissive
  for insert
  to public
with check ((((user_id = auth.uid()) AND (list_id IS NULL)) OR ((list_id IS NOT NULL) AND public.list_shared_with_user(list_id, auth.uid()))));



  create policy "tasks_select_shared"
  on "public"."tasks"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (assignee_id = auth.uid()) OR ((list_id IS NOT NULL) AND public.list_shared_with_user(list_id, auth.uid()))));



  create policy "tasks_update_shared"
  on "public"."tasks"
  as permissive
  for update
  to public
using (((user_id = auth.uid()) OR ((list_id IS NOT NULL) AND public.list_shared_with_user(list_id, auth.uid()))))
with check (((user_id = auth.uid()) OR ((list_id IS NOT NULL) AND public.list_shared_with_user(list_id, auth.uid()))));


CREATE TRIGGER trg_notify_share_accepted AFTER UPDATE ON public.list_shares FOR EACH ROW EXECUTE FUNCTION public.notify_share_accepted();

CREATE TRIGGER trg_notify_share_invited AFTER INSERT ON public.list_shares FOR EACH ROW EXECUTE FUNCTION public.notify_share_invited();

CREATE TRIGGER trg_notify_share_revoked AFTER UPDATE ON public.list_shares FOR EACH ROW EXECUTE FUNCTION public.notify_share_revoked();

CREATE TRIGGER prune_task_history_trigger AFTER INSERT ON public.task_history FOR EACH ROW EXECUTE FUNCTION public.prune_task_history();

CREATE TRIGGER trg_notify_task_assignee_change AFTER UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignee_change();
