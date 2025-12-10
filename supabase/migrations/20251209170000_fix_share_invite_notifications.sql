-- Improve share-invite notifications by resolving invitee user_id from email when possible

create or replace function public.notify_share_invited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  -- inviter confirmation
  perform public.create_notification(coalesce(new.invited_by, owner_id), 'share_invited_sent', jsonb_build_object('list_id', new.list_id, 'share_id', new.id));
  return new;
end;
$$;

drop trigger if exists trg_notify_share_invited on public.list_shares;
create trigger trg_notify_share_invited
after insert on public.list_shares
for each row execute function public.notify_share_invited();
