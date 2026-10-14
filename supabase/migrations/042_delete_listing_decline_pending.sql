begin;

create or replace function public.delete_item(p_item uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  listing public.items;
begin
  if not public.is_verified() then raise exception 'Complete verification first.'; end if;
  select * into listing from public.items where id = p_item for update;
  if not found or listing.owner_id <> auth.uid() or listing.deleted_at is not null then
    raise exception 'Only the owner can delete an existing listing.';
  end if;
  if exists (
    select 1 from public.requests where item_id = p_item and status in ('approved', 'handed_over')
  ) then
    raise exception 'Complete or cancel approved loans and confirm return of ongoing loans before deleting this listing.';
  end if;

  update public.requests
  set status = 'declined', decline_reason = 'Listing removed by owner.', decline_note = '',
    declined_at = now(), updated_at = now()
  where item_id = p_item and status = 'requested';

  update public.items set deleted_at = now(), is_active = false, updated_at = now()
  where id = p_item;
end;
$$;
comment on function public.delete_item(uuid) is
  'Verified owner-only soft deletion atomically declines pending requests with a removal reason. Approved/handed-over loans block deletion before any changes. The listing lock serializes creation/approval; all history and media are retained.';
revoke execute on function public.delete_item(uuid) from public, anon, authenticated;
grant execute on function public.delete_item(uuid) to authenticated;

commit;
