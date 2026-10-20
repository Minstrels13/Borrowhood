begin;

create or replace function public.guard_repeat_request()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  latest_status text;
begin
  -- Serialize submissions so a fresh request blocks another concurrent request.
  perform 1 from public.items where id = new.item_id for update;
  select status into latest_status from public.requests
  where item_id = new.item_id and borrower_id = new.borrower_id
  order by reference_number desc limit 1;
  if found and latest_status not in ('declined', 'cancelled', 'returned') then
    raise exception 'You already sent a borrow request for this item.' using errcode = '23505';
  end if;
  return new;
end;
$$;
comment on function public.guard_repeat_request() is
  'A declined, cancelled or returned latest request permits a fresh submission. Active requests still prevent another submission. The item lock prevents concurrent duplicates; earlier requests and condition history are preserved.';
revoke execute on function public.guard_repeat_request() from public, anon, authenticated;

commit;
