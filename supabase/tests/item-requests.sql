-- Run after 024 as the SQL Editor postgres role. All test rows roll back; counter gaps are normal.
begin;

do $$
declare
  members uuid[];
  listing uuid;
  chosen uuid;
  competing uuid;
  base_day date := (now() at time zone 'Asia/Manila')::date + 500;
  candidate_start date;
  candidate_end date;
  scenario integer;
  expected text;
  result jsonb;
begin
  if has_function_privilege('anon', 'public.item_requests(uuid,text,integer)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.item_requests(uuid,text,integer)', 'EXECUTE') then
    raise exception 'FAIL: item request function grants';
  end if;
  raise notice 'PASS: owner list is unavailable to anonymous callers';
  select array_agg(id) into members from (
    select p.id from public.profiles p join auth.users u on u.id = p.id
    where p.verification_status = 'approved' and p.photo_path is not null
      and p.submitted_at is not null and u.email_confirmed_at is not null
    order by p.id limit 3
  ) verified;
  if coalesce(array_length(members, 1), 0) < 3 then
    raise exception 'Three existing verified team accounts are required.';
  end if;

  for scenario in 1..5 loop
    insert into public.items(owner_id, title, category, condition_note, listing_type, max_borrow_days)
    values (members[1], 'Rollback overlap check', 'Other', 'Test only', 'free', 7)
    returning id into listing;
    candidate_start := case scenario when 1 then base_day + 1 when 2 then base_day + 2
      when 3 then base_day - 2 when 4 then base_day + 3 else base_day - 2 end;
    candidate_end := case scenario when 1 then base_day + 1 when 2 then base_day + 4
      when 3 then base_day when 4 then base_day + 4 else base_day - 1 end;
    perform set_config('request.jwt.claim.sub', members[2]::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', members[2], 'role', 'authenticated')::text, true);
    chosen := public.create_request(listing, base_day, base_day + 2, 'Rollback test');
    perform set_config('request.jwt.claim.sub', members[3]::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', members[3], 'role', 'authenticated')::text, true);
    competing := public.create_request(listing, candidate_start, candidate_end, 'Rollback test');
    begin
      perform public.item_requests(listing);
      raise exception 'FAIL: borrower accessed owner list';
    exception when raise_exception then
      if sqlerrm <> 'Only the item owner can view these requests.' then raise; end if;
    end;
    perform set_config('request.jwt.claim.sub', members[1]::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', members[1], 'role', 'authenticated')::text, true);
    result := public.item_requests(listing);
    if (result->>'total')::integer <> 2 or jsonb_array_length(result->'requests') <> 2
      or result->'requests'->0->'borrower' ? 'email' then
      raise exception 'FAIL: owner projection';
    end if;
    perform public.transition_request(chosen, 'approve');
    expected := case when scenario <= 3 then 'declined' else 'requested' end;
    if (select status from public.requests where id = competing) <> expected
      or (select status from public.requests where id = chosen) <> 'approved' then
      raise exception 'FAIL: overlap scenario %', scenario;
    end if;
    if expected = 'declined' then
      if not exists (select 1 from public.requests where id = competing and declined_at is not null
        and decline_reason = 'This item is no longer available for your selected dates because another request was approved.') then
        raise exception 'FAIL: automatic decline reason/timestamp';
      end if;
      begin
        perform public.transition_request(competing, 'approve');
        raise exception 'FAIL: stale approval succeeded';
      exception when raise_exception then
        if sqlerrm <> 'Only a requested loan can be approved.' then raise; end if;
      end;
    end if;
    raise notice 'PASS: boundary scenario %, owner projection and borrower denial', scenario;
  end loop;
end;
$$;

rollback;
