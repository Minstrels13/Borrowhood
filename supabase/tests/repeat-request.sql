-- Run after 041. Uses an existing real request and rolls back. Sequence gaps are normal.
begin;

do $$
declare
  loan public.requests;
  test_date date;
begin
  select r.* into loan from public.requests r
  join public.items i on i.id = r.item_id
  join public.profiles p on p.id = r.borrower_id
  join auth.users u on u.id = p.id
  where r.status not in ('declined', 'cancelled') and i.is_active and i.deleted_at is null
    and p.verification_status = 'approved' and p.photo_path is not null
    and p.submitted_at is not null and u.email_confirmed_at is not null
    and not exists (
      select 1 from public.requests newer where newer.item_id = r.item_id
        and newer.borrower_id = r.borrower_id and newer.reference_number > r.reference_number
    )
  order by r.reference_number desc limit 1;
  if loan.id is null then
    raise exception 'A latest requested, approved, handed-over or returned request from a verified borrower is required.';
  end if;
  select (now() at time zone 'Asia/Manila')::date + day_offset into test_date
  from generate_series(365, 730) as days(day_offset)
  where not exists (
    select 1 from public.requests r where r.item_id = loan.item_id
      and r.status in ('approved', 'handed_over')
      and (now() at time zone 'Asia/Manila')::date + day_offset between r.start_date and r.end_date
  ) order by day_offset limit 1;
  if test_date is null then raise exception 'No unreserved one-day test range found.'; end if;
  perform set_config('borrowhood.repeat_item', loan.item_id::text, true);
  perform set_config('borrowhood.repeat_original', loan.id::text, true);
  perform set_config('borrowhood.repeat_date', test_date::text, true);
  perform set_config('request.jwt.claim.sub', loan.borrower_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', loan.borrower_id, 'role', 'authenticated')::text, true);
end;
$$;

set local role authenticated;
do $$
begin
  begin
    perform public.create_request(current_setting('borrowhood.repeat_item')::uuid,
      current_setting('borrowhood.repeat_date')::date,
      current_setting('borrowhood.repeat_date')::date, '');
    raise exception 'FAIL: a second request was allowed';
  exception when unique_violation then
    if sqlerrm <> 'You already sent a borrow request for this item.' then raise; end if;
  end;
  raise notice 'PASS: latest non-declined/non-cancelled request prevents another submission';
end;
$$;
reset role;

update public.requests set status = 'cancelled', cancelled_at = now()
where id = current_setting('borrowhood.repeat_original')::uuid;

set local role authenticated;
do $$
declare replacement uuid;
begin
  replacement := public.create_request(current_setting('borrowhood.repeat_item')::uuid,
    current_setting('borrowhood.repeat_date')::date,
    current_setting('borrowhood.repeat_date')::date, '');
  if replacement = current_setting('borrowhood.repeat_original')::uuid
    or not exists (select 1 from public.requests where id = replacement and status = 'requested')
    or not exists (select 1 from public.requests
      where id = current_setting('borrowhood.repeat_original')::uuid and status = 'cancelled') then
    raise exception 'FAIL: cancellation did not permit a new request while retaining history';
  end if;
  begin
    perform public.create_request(current_setting('borrowhood.repeat_item')::uuid,
      current_setting('borrowhood.repeat_date')::date,
      current_setting('borrowhood.repeat_date')::date, '');
    raise exception 'FAIL: duplicate replacement was allowed';
  exception when unique_violation then
    if sqlerrm <> 'You already sent a borrow request for this item.' then raise; end if;
  end;
  raise notice 'PASS: cancelled request can be replaced once; history is retained and duplicates are blocked';
end;
$$;
reset role;
rollback;
