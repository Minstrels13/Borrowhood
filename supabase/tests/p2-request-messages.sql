-- DISPOSABLE LOCAL DATABASE ONLY after 001 through 048. Run as postgres with ON_ERROR_STOP.
-- Explicit opt-in: SET borrowhood.local_qa = 'on'; then include this file. All fixtures roll back.
begin;
do $$ begin
  if current_setting('borrowhood.local_qa',true) is distinct from 'on' then
    raise exception 'Local disposable QA opt-in required; never run against hosted data.';
  end if;
end $$;
create function public.thread_assert(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %',label; end if;
  raise notice 'PASS: %',label;
end $$;
create function public.thread_expect(command text, expected text) returns void language plpgsql as $$
begin
  begin execute command;
  exception when others then if sqlerrm = expected or sqlstate = expected then return; else raise; end if; end;
  raise exception 'FAIL: expected %',expected;
end $$;
revoke all on function public.thread_assert(boolean,text), public.thread_expect(text,text) from public;
grant execute on function public.thread_assert(boolean,text), public.thread_expect(text,text) to anon,authenticated;

do $$ declare actor text; member uuid; item uuid; loan uuid; state text; owner_id uuid; borrower uuid;
begin
  foreach actor in array array['owner','borrower','outsider','unverified','admin','approved_admin'] loop
    member := gen_random_uuid();
    perform set_config('borrowhood.thread_'||actor,member::text,true);
    insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data,aud,role,created_at,updated_at)
      values(member,'local-thread-'||member||'@ms.bulsu.edu.ph',now(),
        jsonb_build_object('full_name','Local QA '||actor,'course_year_section','QA Course 1-A'),
        '{}'::jsonb,'authenticated','authenticated',now(),now());
    if actor <> 'unverified' and actor <> 'admin' then
      update public.profiles set verification_status='approved',photo_path=member||'/qa.jpg',submitted_at=now() where id=member;
    end if;
    if actor in ('admin','approved_admin') then update public.profiles set role='admin' where id=member; end if;
  end loop;
  owner_id := current_setting('borrowhood.thread_owner')::uuid;
  borrower := current_setting('borrowhood.thread_borrower')::uuid;
  foreach state in array array['requested','approved','handed_over','returned','declined','cancelled'] loop
    insert into public.items(owner_id,title,category,condition_note,listing_type,max_borrow_days)
      values(owner_id,'Local thread QA','Other','QA condition','free',7) returning id into item;
    insert into public.requests(item_id,owner_id,borrower_id,start_date,end_date,status,message,
      handed_over_at,handover_notes,returned_at,return_condition,decline_reason,declined_at,cancelled_at)
      values(item,owner_id,borrower,current_date-2,current_date-1,state,repeat('x',1500),
        case when state in ('handed_over','returned') then now()-interval '2 days' end,
        case when state in ('handed_over','returned') then 'QA handover' end,
        case when state='returned' then now() end,case when state='returned' then 'good' end,
        case when state='declined' then 'QA decline' end,case when state='declined' then now() end,
        case when state='cancelled' then now() end) returning id into loan;
    perform set_config('borrowhood.thread_'||state,loan::text,true);
    if state = 'requested' then perform set_config('borrowhood.thread_item',item::text,true); end if;
  end loop;
  -- Historical admin participant fixture: both raw and SECURITY DEFINER opening reads must deny.
  insert into public.items(owner_id,title,category,condition_note,listing_type,max_borrow_days)
    values(current_setting('borrowhood.thread_approved_admin')::uuid,'Local legacy admin thread','Other','QA','free',7) returning id into item;
  insert into public.requests(item_id,owner_id,borrower_id,start_date,end_date,status,message)
    values(item,current_setting('borrowhood.thread_approved_admin')::uuid,borrower,current_date,current_date,'requested','PRIVATE OPENING') returning id into loan;
  perform set_config('borrowhood.thread_admin_loan',loan::text,true);
  perform set_config('borrowhood.thread_admin_item',item::text,true);
end $$;

select set_config('borrowhood.thread_initial_requests',(
  select jsonb_agg(to_jsonb(q) order by id)::text from public.requests q
  where owner_id=current_setting('borrowhood.thread_owner')::uuid),true);
select set_config('borrowhood.thread_initial_trust',public.trust_totals(current_setting('borrowhood.thread_borrower')::uuid)::text,true);

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('borrowhood.thread_owner'),true);
do $$ declare state text; loan uuid; reply jsonb; key uuid; first_reply jsonb;
begin
  foreach state in array array['requested','approved','handed_over','returned','declined','cancelled'] loop
    loan := current_setting('borrowhood.thread_'||state)::uuid;
    reply := public.request_thread(loan);
    perform public.thread_assert(reply->>'request_status'=state,'reads all six statuses');
    perform public.thread_assert(length(reply->'entries'->0->>'body')=1500,'legacy opening preserved');
    if state in ('requested','approved','handed_over') then
      key := gen_random_uuid();
      first_reply := public.send_request_message(loan,E'  Hi\nthere  ',key);
      perform public.thread_assert(first_reply->'entry'->>'body'=E'Hi\nthere','trim preserves newlines');
      reply := public.send_request_message(loan,E'Hi\nthere',key);
      perform public.thread_assert(reply->>'created'='false' and reply->'entry'=first_reply->'entry','idempotent acknowledgment');
      perform public.thread_expect(format('select public.send_request_message(%L,%L,%L)',loan,'changed',key),'BH_THREAD_STALE');
    else
      perform public.thread_expect(format('select public.send_request_message(%L,%L,%L)',loan,'hello',gen_random_uuid()),'BH_THREAD_READ_ONLY');
    end if;
  end loop;
  loan := current_setting('borrowhood.thread_requested')::uuid;
  perform public.thread_expect(format('select public.send_request_message(%L,%L,%L)',loan,'   ',gen_random_uuid()),'BH_THREAD_VALIDATION');
  perform public.thread_expect(format('select public.send_request_message(%L,%L,%L)',loan,repeat('x',1001),gen_random_uuid()),'BH_THREAD_VALIDATION');
  perform public.send_request_message(loan,repeat('😀',1000),gen_random_uuid());
  perform public.thread_expect(format('select public.request_thread(%L,%L,null,null)',loan,'message'),'BH_THREAD_VALIDATION');
  perform public.thread_expect(format('select public.request_thread(%L,%L,now(),%L)',loan,'message',gen_random_uuid()),'BH_THREAD_VALIDATION');
  perform public.thread_assert(public.request_detail(loan) is not null,'student legacy detail unchanged');
  perform public.thread_assert(public.item_requests(current_setting('borrowhood.thread_item')::uuid)->>'total'='1','owner list unchanged');
  perform public.thread_expect('insert into public.messages(id,request_id,sender_id,body) values(gen_random_uuid(),null,null,''x'')','42501');
  perform public.thread_expect('update public.messages set body=''changed''','42501');
  perform public.thread_expect('delete from public.messages','42501');
end $$;
select set_config('request.jwt.claim.sub',current_setting('borrowhood.thread_borrower'),true);
select public.send_request_message(current_setting('borrowhood.thread_requested')::uuid,'Borrower reply',gen_random_uuid());
do $$ declare actor text; loan uuid := current_setting('borrowhood.thread_requested')::uuid;
begin
  foreach actor in array array['outsider','unverified','admin','approved_admin'] loop
    perform set_config('request.jwt.claim.sub',current_setting('borrowhood.thread_'||actor),true);
    perform public.thread_assert((select count(*) from public.messages)=0,'RLS denies '||actor);
    perform public.thread_expect(format('select public.request_thread(%L)',loan),case when actor='outsider' then 'BH_THREAD_UNAVAILABLE' else 'BH_THREAD_FORBIDDEN' end);
    perform public.thread_expect(format('select public.send_request_message(%L,%L,%L)',loan,'hello',gen_random_uuid()),case when actor='outsider' then 'BH_THREAD_UNAVAILABLE' else 'BH_THREAD_FORBIDDEN' end);
    if actor='approved_admin' then
      perform public.thread_assert(public.request_detail(current_setting('borrowhood.thread_admin_loan')::uuid) is null,'legacy admin detail denied');
      perform public.thread_assert((select count(*) from public.requests)=0,'legacy admin raw opening denied');
      perform public.thread_expect(format('select public.item_requests(%L)',current_setting('borrowhood.thread_admin_item')),'Complete verification before viewing requests.');
    end if;
  end loop;
end $$;
set local role anon;
select public.thread_expect('select * from public.messages','42501');
select public.thread_expect(format('select public.request_thread(%L)',current_setting('borrowhood.thread_requested')),'42501');
select public.thread_expect(format('select public.send_request_message(%L,%L,%L)',current_setting('borrowhood.thread_requested'),'x',gen_random_uuid()),'42501');
reset role;
select public.thread_assert((select jsonb_agg(to_jsonb(q) order by id)::text from public.requests q
  where owner_id=current_setting('borrowhood.thread_owner')::uuid)=current_setting('borrowhood.thread_initial_requests'),
  'thread sends do not change requests or reservations');
select public.thread_assert(public.trust_totals(current_setting('borrowhood.thread_borrower')::uuid)::text=current_setting('borrowhood.thread_initial_trust'),
  'thread sends do not affect trust totals');

-- Reports keep their projection and work independently of messages/B25.
insert into public.reports(request_id,reporter_id,borrower_id,reason)
  values(current_setting('borrowhood.thread_handed_over')::uuid,current_setting('borrowhood.thread_owner')::uuid,
    current_setting('borrowhood.thread_borrower')::uuid,'not_returned');
select set_config('borrowhood.thread_report',(select id::text from public.reports
  where request_id=current_setting('borrowhood.thread_handed_over')::uuid),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('borrowhood.thread_admin'),true);
select public.thread_assert(public.admin_report_detail(current_setting('borrowhood.thread_report')::uuid)->>'reason'='not_returned','admin report read unaffected');
select public.thread_assert(not (public.admin_report_detail(current_setting('borrowhood.thread_report')::uuid)
  ?| array['messages','message','thread','message_count','request_status','handover_notes','return_notes','photo_path']),
  'admin projection has no thread or evidence fields');
select public.start_report_review(current_setting('borrowhood.thread_report')::uuid,1);
select public.resolve_report(current_setting('borrowhood.thread_report')::uuid,'upheld','QA resolution',2);
select set_config('request.jwt.claim.sub',current_setting('borrowhood.thread_owner'),true);
select public.thread_assert((public.request_thread(current_setting('borrowhood.thread_handed_over')::uuid)->>'can_send')::boolean,
  'report review/resolution cannot close an active request thread');
select public.thread_assert(public.report_for_request(current_setting('borrowhood.thread_handed_over')::uuid)->'report'->>'status'='resolved',
  'participant report read unaffected');
reset role;

-- Fill through the real controlled send path as both participants; cap includes opening.
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('borrowhood.thread_owner'),true);
do $$ declare loan uuid := current_setting('borrowhood.thread_requested')::uuid; reply jsonb; cursor jsonb;
  count_seen integer := 0; seen uuid[] := '{}'; entry jsonb; first_key uuid; first_body text;
begin
  while (public.request_thread(loan)->>'message_count')::int < 200 loop
    perform public.send_request_message(loan,'Cap test',gen_random_uuid());
  end loop;
  perform public.thread_expect(format('select public.send_request_message(%L,%L,%L)',loan,'overflow',gen_random_uuid()),'BH_THREAD_LIMIT');
  loop
    reply := public.request_thread(loan,cursor->>'kind',(cursor->>'at')::timestamptz,(cursor->>'id')::uuid);
    perform public.thread_assert(jsonb_array_length(reply->'entries')<=50,'bounded page');
    for entry in select * from jsonb_array_elements(reply->'entries') loop
      perform public.thread_assert(not (entry->>'id')::uuid=any(seen),'no duplicate across pages');
      seen := array_append(seen,(entry->>'id')::uuid); count_seen := count_seen+1;
    end loop;
    exit when not (reply->>'has_earlier')::boolean;
    cursor := reply->'next_before';
  end loop;
  perform public.thread_assert(count_seen=200,'complete cap timeline including opening');
  select id,body into first_key,first_body from public.messages where request_id=loan and sender_id=auth.uid() order by created_at limit 1;
  perform public.thread_assert(public.request_thread(loan,null,null,null,first_key)->'submission'->>'body'=first_body,'nonce lookup outside latest50');
  perform public.thread_assert(public.send_request_message(loan,first_body,first_key)->>'created'='false','retry at cap succeeds');
end $$;
reset role;
-- No opening: exactly 200 new messages; terminal retry acknowledges only an existing saved send.
update public.requests set message=' ' where id=current_setting('borrowhood.thread_approved')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('borrowhood.thread_owner'),true);
do $$ declare loan uuid := current_setting('borrowhood.thread_approved')::uuid;
begin
  while (public.request_thread(loan)->>'message_count')::int < 200 loop
    perform public.send_request_message(loan,'No opening cap',gen_random_uuid());
  end loop;
  perform public.thread_assert((select count(*) from public.messages where request_id=loan)=200,'200 new rows without opening');
end $$;
reset role;
update public.requests set status='cancelled',cancelled_at=now() where id=current_setting('borrowhood.thread_requested')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('borrowhood.thread_owner'),true);
do $$ declare saved public.messages;
begin
  select * into saved from public.messages where request_id=current_setting('borrowhood.thread_requested')::uuid and sender_id=auth.uid() limit 1;
  perform public.thread_assert(public.send_request_message(saved.request_id,saved.body,saved.id)->>'created'='false','terminal acknowledgment');
end $$;
reset role;
update public.profiles set verification_status='pending' where id=current_setting('borrowhood.thread_owner')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('borrowhood.thread_owner'),true);
select public.thread_assert((select count(*) from public.messages)=0,'verification loss removes read access');
select public.thread_expect(format('select public.request_thread(%L)',current_setting('borrowhood.thread_requested')),'BH_THREAD_FORBIDDEN');
reset role;
rollback;
