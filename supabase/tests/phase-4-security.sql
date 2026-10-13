-- Run after 020–022. Uses a real requested loan and a third, unrelated team account; rolls back every change.
begin;

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.requests'::regclass)
    or has_table_privilege('authenticated', 'public.requests', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('anon', 'public.requests', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'FAIL: request RLS/grants';
  end if;
  raise notice 'PASS: 1 requests have RLS and no direct browser writes';
  if has_sequence_privilege('authenticated', 'public.request_reference_counter', 'USAGE,UPDATE')
    or has_function_privilege('anon', 'public.create_request(uuid,date,date,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.transition_request(uuid,text,jsonb)', 'EXECUTE')
    or has_function_privilege('anon', 'public.request_detail(uuid)', 'EXECUTE') then
    raise exception 'FAIL: counter/private function grants';
  end if;
  raise notice 'PASS: 2 private counter and mutation/detail functions';
  if not exists (select 1 from pg_constraint where conrelid = 'public.requests'::regclass
    and conname = 'requests_no_overlap' and contype = 'x') then
    raise exception 'FAIL: exclusion constraint missing';
  end if;
  raise notice 'PASS: 3 concurrent overlap constraint installed';
  if not exists (select 1 from storage.buckets where id = 'condition-photos' and not public
    and file_size_limit = 1048576 and allowed_mime_types = array['image/jpeg']) then
    raise exception 'FAIL: private condition bucket';
  end if;
  raise notice 'PASS: 4 condition bucket type/size/privacy';
end;
$$;

set local role anon;
do $$
begin
  perform * from public.item_availability('00000000-0000-0000-0000-000000000000');
  perform * from public.available_items() limit 1;
  raise notice 'PASS: 5 anonymous availability does not require private helper permissions';
end;
$$;
reset role;

do $$
declare
  loan public.requests;
  outsider uuid;
begin
  select * into loan from public.requests where status = 'requested' order by created_at desc limit 1;
  if loan.id is null then
    raise exception 'Create a real requested loan through the app before running these checks.';
  end if;
  select id into outsider from public.profiles where id not in (loan.owner_id, loan.borrower_id) limit 1;
  if outsider is null then raise exception 'A third team account is required.'; end if;
  perform set_config('borrowhood.test_request', loan.id::text, true);
  perform set_config('borrowhood.test_item', loan.item_id::text, true);
  perform set_config('borrowhood.test_owner', loan.owner_id::text, true);
  perform set_config('borrowhood.test_borrower', loan.borrower_id::text, true);
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', outsider, 'role', 'authenticated')::text, true);
end;
$$;
set local role authenticated;
do $$
begin
  if exists (select 1 from public.requests where id = current_setting('borrowhood.test_request')::uuid)
    or public.request_detail(current_setting('borrowhood.test_request')::uuid) is not null then
    raise exception 'FAIL: outsider private read';
  end if;
  raise notice 'PASS: 6 unrelated account cannot read request or identities';
end;
$$;
reset role;

do $$
declare owner_id uuid := current_setting('borrowhood.test_owner')::uuid;
begin
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
end;
$$;
set local role authenticated;
do $$
begin
  begin
    perform public.create_request(current_setting('borrowhood.test_item')::uuid,
      (now() at time zone 'Asia/Manila')::date, (now() at time zone 'Asia/Manila')::date, '');
    raise exception 'FAIL: self borrow allowed';
  exception when raise_exception then
    if sqlerrm <> 'You cannot borrow your own item.' then raise; end if;
  end;
  raise notice 'PASS: 7 self-borrow denied';
  begin
    perform public.transition_request(current_setting('borrowhood.test_request')::uuid, 'return', '{}'::jsonb);
    raise exception 'FAIL: requested loan returned';
  exception when raise_exception then
    if sqlerrm <> 'The request changed. Refresh it before trying again.' then raise; end if;
  end;
  raise notice 'PASS: 8 invalid transition denied';
end;
$$;
reset role;

do $$
begin
  begin
    update public.items set deleted_at = now() where id = current_setting('borrowhood.test_item')::uuid;
    raise exception 'FAIL: active-request deletion allowed';
  exception when raise_exception then
    if sqlerrm <> 'Complete or close active requests before hiding or deleting this listing.' then raise; end if;
  end;
  raise notice 'PASS: 9 requested loan blocks soft deletion';
  update public.requests set start_date = (now() at time zone 'Asia/Manila')::date - 1,
    end_date = (now() at time zone 'Asia/Manila')::date - 1
  where id = current_setting('borrowhood.test_request')::uuid;
  raise notice 'PASS: 10 trusted SQL-editor date correction allowed under normal constraints';
end;
$$;

rollback;
