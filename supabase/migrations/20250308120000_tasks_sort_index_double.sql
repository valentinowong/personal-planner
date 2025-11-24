-- Allow fractional task sort ordering for drag-and-drop reordering
alter table public.tasks
  alter column sort_index type double precision using sort_index::double precision,
  alter column sort_index set default 0;
