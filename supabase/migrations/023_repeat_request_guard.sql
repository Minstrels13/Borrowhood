begin;

create index requests_borrower_item_latest
on public.requests(borrower_id, item_id, reference_number desc);

create function public.guard_repeat_request()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  latest_status text;
begin
  -- Serialize same-item submissions, including two browser tabs sending together.
  perform 1 from public.items where id = new.item_id for update;
  select status into latest_status from public.requests
  where item_id = new.item_id and borrower_id = new.borrower_id
  order by reference_number desc limit 1;
  if found and latest_status <> 'declined' then
    raise exception 'You already sent a borrow request for this item.' using errcode = '23505';
  end if;
  return new;
end;
$$;
comment on function public.guard_repeat_request() is
  'One latest request per borrower/item: only a declined outcome permits another submission. Cancelled/returned still link to history. Listing lock prevents concurrent duplicates; existing records are preserved.';

create trigger request_repeat_guard before insert on public.requests
for each row execute function public.guard_repeat_request();

revoke execute on function public.guard_repeat_request() from public, anon, authenticated;

commit;
