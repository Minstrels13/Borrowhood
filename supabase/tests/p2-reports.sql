-- Manual, approved QA database only, after 047; NEVER run against production.
-- Supply six DISTINCT, team-designated existing account UUIDs in this session first:
-- set borrowhood.test_owner = '...'; set borrowhood.test_borrower = '...';
-- set borrowhood.test_outsider = '...'; set borrowhood.test_admin = '...';
-- set borrowhood.test_second_admin = '...'; set borrowhood.test_unverified = '...';
-- Owner/borrower/outsider AND first admin must be fully verified; both admins confirmed.
-- No accounts created. Only isolated fixture items/loans/reports are inserted, all rolled back.
-- Single-session assertions do NOT establish the concurrency cases in docs/p2-reports-qa.md.
begin;
create function public.p2_report_assert(ok boolean, label text) returns void
language plpgsql set search_path = '' as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end;
$$;
create function public.p2_report_expect(command text, expected text) returns void
language plpgsql set search_path = '' as $$
begin
  begin execute command;
  exception when others then
    if sqlerrm = expected or sqlstate = expected then return; end if;
    raise;
  end;
  raise exception 'FAIL: expected denial %', expected;
end;
$$;
revoke all on function public.p2_report_assert(boolean,text), public.p2_report_expect(text,text) from public;
grant execute on function public.p2_report_assert(boolean,text), public.p2_report_expect(text,text) to anon, authenticated;

-- Validate fixtures as postgres, without choosing arbitrary real accounts or printing identity.
do $$
declare key text; member uuid; members uuid[] := '{}';
begin
  foreach key in array array['owner','borrower','outsider','admin','second_admin','unverified'] loop
    member := nullif(current_setting('borrowhood.test_' || key, true), '')::uuid;
    if member is null or member = any(members) or not exists (select 1 from public.profiles where id = member) then
      raise exception 'Six distinct designated existing account IDs are required.';
    end if;
    members := array_append(members, member);
    perform set_config('request.jwt.claim.sub', member::text, true);
    if key in ('owner','borrower','outsider','admin') and not public.is_verified() then
      raise exception 'Designated student and first admin must be verified.';
    end if;
    if key in ('admin','second_admin') and not public.is_admin() then raise exception 'Designated admin must be confirmed.'; end if;
    if key = 'unverified' and (public.is_verified() or public.is_admin()) then raise exception 'Unverified fixture must not have elevated access.'; end if;
  end loop;
end;
$$;
select public.p2_report_assert((select relrowsecurity from pg_class where oid='public.reports'::regclass)
  and not has_table_privilege('anon','public.reports','SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated','public.reports','INSERT,UPDATE,DELETE'), 'RLS, no guest access or direct writes');
do $$
declare signature text;
begin
  foreach signature in array array['file_report(uuid,text,text)','report_for_request(uuid)',
    'respond_report(uuid,text,integer)','start_report_review(uuid,integer)',
    'resolve_report(uuid,text,text,integer)','admin_reports(text,text,integer)','admin_report_detail(uuid)'] loop
    perform public.p2_report_assert(not has_function_privilege('anon','public.'||signature,'EXECUTE')
      and has_function_privilege('authenticated','public.'||signature,'EXECUTE'), 'RPC grants: '||signature);
  end loop;
  perform public.p2_report_assert(not has_function_privilege('authenticated','public.lock_report(uuid)','EXECUTE'), 'internal lock helper inaccessible');
  perform public.p2_report_assert(not has_function_privilege('authenticated','public.report_trim(text)','EXECUTE'), 'internal text helper inaccessible');
  perform public.p2_report_assert(public.report_trim(E' \t\n'||chr(160)||chr(65279))='', 'Unicode and line whitespace normalize to empty');
end;
$$;

-- Fixture builder is callable only as postgres in this transaction.
create function pg_temp.p2_loan(owner_id uuid, state text default 'handed_over', due_today boolean default false, test_borrower uuid default null)
returns uuid language plpgsql as $$
declare item uuid; loan uuid; due date := (clock_timestamp() at time zone 'Asia/Manila')::date - 2;
begin
  if due_today then due := (clock_timestamp() at time zone 'Asia/Manila')::date; end if;
  insert into public.items(owner_id,title,category,condition_note,listing_type,max_borrow_days,meetup_note)
    values(owner_id,'P2 isolated report fixture','Other','Test only','free',7,'PRIVATE MEETUP SENTINEL') returning id into item;
  insert into public.requests(item_id,owner_id,borrower_id,start_date,end_date,status,message,
    handed_over_at,handover_notes,returned_at,return_condition,return_notes,declined_at,decline_reason,cancelled_at)
  values(item,owner_id,coalesce(test_borrower,current_setting('borrowhood.test_borrower')::uuid),due,due,state,'PRIVATE MESSAGE SENTINEL',
    case when state in ('handed_over','returned') then now()-interval '3 days' end,
    case when state in ('handed_over','returned') then 'PRIVATE HANDOVER SENTINEL' end,
    case when state='returned' then now() end,case when state='returned' then 'damaged' end,'PRIVATE RETURN SENTINEL',
    case when state='declined' then now() end,case when state='declined' then 'Test only' end,
    case when state='cancelled' then now() end) returning id into loan;
  return loan;
end;
$$;
select set_config('borrowhood.p2_loan', pg_temp.p2_loan(current_setting('borrowhood.test_owner')::uuid)::text, true);
select set_config('borrowhood.p2_today', pg_temp.p2_loan(current_setting('borrowhood.test_owner')::uuid,'handed_over',true)::text, true);
select set_config('borrowhood.p2_self_loan', pg_temp.p2_loan(current_setting('borrowhood.test_admin')::uuid)::text, true);
select set_config('borrowhood.p2_admin_borrower_loan', pg_temp.p2_loan(current_setting('borrowhood.test_owner')::uuid,'handed_over',false,current_setting('borrowhood.test_admin')::uuid)::text,true);

set local role anon;
select public.p2_report_expect('select public.admin_reports(''open'')', '42501');
select public.p2_report_expect('select * from public.reports', '42501');
reset role;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_unverified'), true);
set local role authenticated;
select public.p2_report_expect('select public.report_for_request('||quote_literal(current_setting('borrowhood.p2_loan'))||')', 'BH_P2_FORBIDDEN');
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_loan'))||',''other'',''test'')', 'BH_P2_FORBIDDEN');
select public.p2_report_expect('select public.admin_reports(''open'')', 'BH_P2_FORBIDDEN');
select public.p2_report_assert(not exists(select 1 from public.reports), 'unverified RLS hides reports');
reset role;

-- All nonoverdue states fail even for the true owner.
do $$
declare state text; loan uuid;
begin
  foreach state in array array['requested','approved','returned','declined','cancelled'] loop
    loan := pg_temp.p2_loan(current_setting('borrowhood.test_owner')::uuid, state);
    perform set_config('request.jwt.claim.sub',current_setting('borrowhood.test_owner'),true);
    -- The function still performs its own verified/ownership/state checks as definer.
    perform public.p2_report_expect(format('select public.file_report(%L,''not_returned'','''')',loan),'BH_P2_NOT_OVERDUE');
  end loop;
end;
$$;
-- Take the baseline AFTER the returned/damaged eligibility fixture has been seeded.
select set_config('borrowhood.p2_trust_before', public.trust_totals(current_setting('borrowhood.test_borrower')::uuid)::text, true);
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_owner'), true);
set local role authenticated;
select public.p2_report_assert(public.report_for_request(current_setting('borrowhood.p2_loan')::uuid) =
  '{"report":null,"can_file":true}'::jsonb, 'explicit empty and eligible participant read');
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_today'))||',''not_returned'','''')','BH_P2_NOT_OVERDUE');
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_loan'))||',''other'',''   '')','BH_P2_VALIDATION');
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_loan'))||',''other'',chr(10)||chr(160))','BH_P2_VALIDATION');
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_loan'))||',null,'''')','BH_P2_VALIDATION');
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_loan'))||',''damaged'','''')','BH_P2_VALIDATION');
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_loan'))||',''not_returned'',repeat(''x'',1501))','BH_P2_VALIDATION');
select set_config('borrowhood.p2_report', (public.file_report(current_setting('borrowhood.p2_loan')::uuid,'not_returned','Test report')->>'id'), true);
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_loan'))||',''not_returned'','''')','BH_P2_DUPLICATE');
select public.p2_report_expect('update public.reports set status=''resolved''','42501');
select public.p2_report_expect('delete from public.reports','42501');
select public.p2_report_expect('insert into public.reports default values','42501');
select public.p2_report_expect('select public.respond_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''test'',1)','BH_P2_UNAVAILABLE');
select public.p2_report_expect('select public.start_report_review('||quote_literal(current_setting('borrowhood.p2_report'))||',1)','BH_P2_FORBIDDEN');
reset role;

select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_outsider'), true);
set local role authenticated;
select public.p2_report_assert(not exists(select 1 from public.reports where id=current_setting('borrowhood.p2_report')::uuid),'unrelated account RLS denial by known ID');
select public.p2_report_expect('select public.report_for_request('||quote_literal(current_setting('borrowhood.p2_loan'))||')','BH_P2_UNAVAILABLE');
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_loan'))||',''not_returned'','''')','BH_P2_UNAVAILABLE');
select public.p2_report_expect('select public.respond_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''test'',1)','BH_P2_UNAVAILABLE');
select public.p2_report_expect('select public.admin_report_detail('||quote_literal(current_setting('borrowhood.p2_report'))||')','BH_P2_FORBIDDEN');
select public.p2_report_expect('select public.resolve_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''upheld'',''test'',1)','BH_P2_FORBIDDEN');
reset role;

select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_borrower'), true);
set local role authenticated;
select public.p2_report_assert(exists(select 1 from public.reports where id=current_setting('borrowhood.p2_report')::uuid),'borrower report RLS read');
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_loan'))||',''not_returned'','''')','BH_P2_UNAVAILABLE');
select public.p2_report_expect('select public.respond_report('||quote_literal(current_setting('borrowhood.p2_report'))||','' '',1)','BH_P2_VALIDATION');
select public.p2_report_expect('select public.respond_report('||quote_literal(current_setting('borrowhood.p2_report'))||',repeat(''x'',1501),1)','BH_P2_VALIDATION');
select public.p2_report_expect('select public.respond_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''test'',null)','BH_P2_STALE');
select public.respond_report(current_setting('borrowhood.p2_report')::uuid,'Test response',1);
select public.p2_report_expect('select public.respond_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''Second response'',2)','BH_P2_STALE');
reset role;

select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_admin'), true);
set local role authenticated;
select public.p2_report_expect('select public.lock_report('||quote_literal(current_setting('borrowhood.p2_report'))||')','42501');
select public.p2_report_assert(public.request_detail(current_setting('borrowhood.p2_loan')::uuid) is null
  and not exists(select 1 from public.requests where id=current_setting('borrowhood.p2_loan')::uuid), 'admin cannot access unrelated request via RLS or existing detail');
select public.p2_report_expect('select public.report_for_request('||quote_literal(current_setting('borrowhood.p2_loan'))||')','BH_P2_UNAVAILABLE');
select public.p2_report_assert((select array_agg(key order by key) from jsonb_object_keys(public.admin_report_detail(current_setting('borrowhood.p2_report')::uuid)) key) =
  array['borrower','borrower_response','can_resolve','can_review','created_at','details','due_date','id','item','outcome','owner','reason','reference','resolution_note','resolved_at','responded_at','reviewing_at','self_review','status','updated_at','version'], 'admin detail exact top-level allowlist');
select public.p2_report_assert((select array_agg(key order by key) from jsonb_object_keys(public.admin_report_detail(current_setting('borrowhood.p2_report')::uuid)->'owner') key) =
  array['course_year_section','email','name'], 'admin student exact allowlist');
select public.p2_report_assert((select array_agg(key order by key) from jsonb_object_keys(public.admin_report_detail(current_setting('borrowhood.p2_report')::uuid)->'borrower') key) =
  array['course_year_section','email','name'], 'admin borrower exact allowlist');
select public.p2_report_assert((select array_agg(key order by key) from jsonb_object_keys(public.admin_report_detail(current_setting('borrowhood.p2_report')::uuid)->'item') key) =
  array['id','title'], 'admin item exact allowlist');
select public.p2_report_assert(public.admin_report_detail(current_setting('borrowhood.p2_report')::uuid)::text not like '%SENTINEL%', 'private loan text never serialized');
select public.p2_report_expect('select public.admin_reports(null)','BH_P2_VALIDATION');
select public.p2_report_expect('select public.admin_reports(''open'','''',-1)','BH_P2_VALIDATION');
select public.p2_report_expect('select public.admin_reports(''open'','''',100001)','BH_P2_VALIDATION');
select public.p2_report_expect('select public.admin_reports(''open'',repeat(''x'',101),0)','BH_P2_VALIDATION');
select public.p2_report_expect('select public.resolve_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''upheld'',''Test'',2)','BH_P2_STALE');
select public.p2_report_expect('select public.start_report_review('||quote_literal(current_setting('borrowhood.p2_report'))||',1)','BH_P2_STALE');
select public.start_report_review(current_setting('borrowhood.p2_report')::uuid,2);
select public.p2_report_expect('select public.start_report_review('||quote_literal(current_setting('borrowhood.p2_report'))||',3)','BH_P2_STALE');
select public.p2_report_expect('select public.resolve_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''settled'',''Test'',3)','BH_P2_NOT_SETTLED');
select public.p2_report_expect('select public.resolve_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''upheld'','' '',3)','BH_P2_VALIDATION');
select public.p2_report_expect('select public.resolve_report('||quote_literal(current_setting('borrowhood.p2_report'))||',null,''Test'',3)','BH_P2_VALIDATION');
select public.p2_report_expect('select public.resolve_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''dismissed'',repeat(''x'',1001),3)','BH_P2_VALIDATION');
reset role;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_borrower'), true);
set local role authenticated;
select public.p2_report_expect('select public.respond_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''test'',3)','BH_P2_STALE');
reset role;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_second_admin'), true);
set local role authenticated;
select public.resolve_report(current_setting('borrowhood.p2_report')::uuid,'upheld','Test shared resolution',3);
select public.p2_report_expect('select public.resolve_report('||quote_literal(current_setting('borrowhood.p2_report'))||',''dismissed'',''Overwrite'',4)','BH_P2_STALE');
select public.p2_report_expect('update public.reports set resolution_note=''Overwrite''','42501');
reset role;
select public.p2_report_assert(public.trust_totals(current_setting('borrowhood.test_borrower')::uuid) = current_setting('borrowhood.p2_trust_before')::jsonb,
  'filing, response, review and upheld outcome do not affect trust');
select public.p2_report_assert((select status='handed_over' from public.requests where id=current_setting('borrowhood.p2_loan')::uuid), 'upheld leaves overdue loan unchanged');

-- Legacy admin participation: approved admins cannot file, respond or self-moderate.
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_admin'), true);
set local role authenticated;
select public.p2_report_expect('select public.file_report('||quote_literal(current_setting('borrowhood.p2_self_loan'))||',''cannot_reach_borrower'','''')','42501');
reset role;
-- Seed an isolated historical report as postgres, not through an admin student action.
with fixture as (
  insert into public.reports(request_id,reporter_id,borrower_id,reason)
  values(current_setting('borrowhood.p2_self_loan')::uuid,current_setting('borrowhood.test_admin')::uuid,
    current_setting('borrowhood.test_borrower')::uuid,'cannot_reach_borrower') returning id
)
select set_config('borrowhood.p2_self_report',(select id::text from fixture),true);
set local role authenticated;
select public.p2_report_assert((public.admin_report_detail(current_setting('borrowhood.p2_self_report')::uuid)->>'self_review')::boolean,
  'participant admin can read scoped report');
select public.p2_report_expect('select public.start_report_review('||quote_literal(current_setting('borrowhood.p2_self_report'))||',1)','BH_P2_SELF_REVIEW');
select public.p2_report_expect('select public.resolve_report('||quote_literal(current_setting('borrowhood.p2_self_report'))||',''upheld'',''Test'',1)','BH_P2_SELF_REVIEW');
reset role;

select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_owner'), true);
set local role authenticated;
select set_config('borrowhood.p2_admin_borrower_report',(public.file_report(current_setting('borrowhood.p2_admin_borrower_loan')::uuid,'not_returned','')->>'id'),true);
reset role;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_admin'), true);
set local role authenticated;
select public.p2_report_expect('select public.start_report_review('||quote_literal(current_setting('borrowhood.p2_admin_borrower_report'))||',1)','BH_P2_SELF_REVIEW');
select public.p2_report_expect('select public.resolve_report('||quote_literal(current_setting('borrowhood.p2_admin_borrower_report'))||',''dismissed'',''Test'',1)','BH_P2_SELF_REVIEW');
select public.p2_report_expect('select public.respond_report('||quote_literal(current_setting('borrowhood.p2_admin_borrower_report'))||',''Admin response denied'',1)','42501');
reset role;

-- Separate fixtures cover other reasons, all outcomes, response after return, pagination and literal search.
do $$
declare loan uuid; report uuid; i integer; payload jsonb; before_return jsonb; after_return jsonb;
begin
  for i in 1..14 loop
    loan := pg_temp.p2_loan(current_setting('borrowhood.test_owner')::uuid);
    perform set_config('request.jwt.claim.sub',current_setting('borrowhood.test_owner'),true);
    report := (public.file_report(loan,case when i=1 then 'other' else 'cannot_reach_borrower' end,'Isolated test details')->>'id')::uuid;
    if i <= 2 then
      if i=1 then
        before_return := public.trust_totals(current_setting('borrowhood.test_borrower')::uuid);
        perform public.transition_request(loan,'return',jsonb_build_object('condition','good'));
        after_return := public.trust_totals(current_setting('borrowhood.test_borrower')::uuid);
        perform public.p2_report_assert((after_return->>'completed')::int=(before_return->>'completed')::int+1
          and (after_return->>'late')::int=(before_return->>'late')::int+1,'ordinary late return changes trust once');
        perform set_config('request.jwt.claim.sub',current_setting('borrowhood.test_borrower'),true);
        perform public.respond_report(report,'Response after return while report is open',1);
      end if;
      perform set_config('request.jwt.claim.sub',current_setting('borrowhood.test_admin'),true);
      perform public.start_report_review(report,case when i=1 then 2 else 1 end);
      perform public.resolve_report(report,case when i=1 then 'settled' else 'dismissed' end,'Test shared resolution',case when i=1 then 3 else 2 end);
      if i=1 then perform public.p2_report_assert(public.trust_totals(current_setting('borrowhood.test_borrower')::uuid)=after_return,'settled adds no second trust change'); end if;
      perform set_config('request.jwt.claim.sub',current_setting('borrowhood.test_owner'),true);
      perform public.p2_report_expect(format('select public.file_report(%L,''other'',''test'')',loan),'BH_P2_DUPLICATE');
    end if;
  end loop;
end;
$$;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_admin'), true);
set local role authenticated;
select public.p2_report_assert(jsonb_array_length(public.admin_reports('open','P2 isolated report fixture',0)->'entries')=12
  and jsonb_array_length(public.admin_reports('open','P2 isolated report fixture',12)->'entries')>=1, 'fixed twelve-item pagination');
select public.p2_report_assert(public.admin_reports('open','%_',0)->'entries'='[]'::jsonb
  and (public.admin_reports('open','%_',0)->>'total')::int=0, 'literal search and explicit empty total');
select public.p2_report_assert(public.admin_report_detail('00000000-0000-0000-0000-000000000000') is null,'missing detail safely null');
select public.p2_report_assert((select array_agg(key order by key)
  from jsonb_object_keys(public.admin_reports('open','P2 isolated report fixture',0)->'entries'->0) key) =
  array['borrower_name','created_at','due_date','id','item_title','owner_name','reason','reference','status'], 'queue exact allowlist');
reset role;

-- All fixtures, temporary assertion functions and account-local changes are rolled back.
rollback;
