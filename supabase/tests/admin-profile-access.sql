-- LOCAL DISPOSABLE DATABASE ONLY, after migrations 001 through 047.
-- Run as postgres with ON_ERROR_STOP. Never run against hosted data.
-- Explicit opt-in: SET borrowhood.local_qa = 'on'; then run this file.
-- Synthetic Auth/profile/Storage fixtures and helpers roll back; no real accounts required.
begin;
do $$ begin
  if current_setting('borrowhood.local_qa', true) is distinct from 'on' then
    raise exception 'Local disposable QA opt-in required; never run against hosted data.';
  end if;
end $$;

create function public.admin_profile_assert(ok boolean, label text) returns void
language plpgsql set search_path = '' as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end;
$$;
create function public.admin_profile_expect(command text, expected text) returns void
language plpgsql set search_path = '' as $$
begin
  begin execute command;
  exception when others then
    if sqlerrm = expected or sqlstate = expected then return; end if;
    raise;
  end;
  raise exception 'FAIL: expected denial % for %', expected, command;
end;
$$;
revoke all on function public.admin_profile_assert(boolean,text), public.admin_profile_expect(text,text) from public;
grant execute on function public.admin_profile_assert(boolean,text), public.admin_profile_expect(text,text) to anon, authenticated;

do $$
declare actor text; member uuid; item uuid; loan uuid; report uuid; bucket text;
  owner_id uuid; borrower_id uuid; admin_id uuid;
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  foreach actor in array array['owner','borrower','admin','unverified'] loop
    member := gen_random_uuid();
    perform set_config('borrowhood.ap_' || actor, member::text, true);
    insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at)
    values (member, 'local-qa-' || member || '@ms.bulsu.edu.ph', now(),
      jsonb_build_object('full_name', 'Local QA ' || actor, 'course_year_section', 'QA Course 1-A'),
      '{}'::jsonb, 'authenticated', 'authenticated', now(), now());
    if actor in ('owner','borrower') then
      update public.profiles set verification_status = 'approved', submitted_at = now(),
        photo_path = member || '/current.jpg' where id = member;
    elsif actor = 'admin' then
      update public.profiles set role = 'admin' where id = member;
    end if;
    insert into storage.objects(bucket_id, name, owner_id)
      values ('profile-photos', member || '/current.jpg', member::text);
  end loop;
  owner_id := current_setting('borrowhood.ap_owner')::uuid;
  borrower_id := current_setting('borrowhood.ap_borrower')::uuid;
  admin_id := current_setting('borrowhood.ap_admin')::uuid;
  insert into public.items(owner_id,title,category,condition_note,listing_type,max_borrow_days)
    values(owner_id,'Local QA published item','Other','QA condition','free',7) returning id into item;
  perform set_config('borrowhood.ap_item', item::text, true);
  insert into public.items(owner_id,title,category,condition_note,listing_type,max_borrow_days,is_active)
    values(owner_id,'Local QA hidden item','Other','QA condition','free',7,false);
  insert into public.requests(item_id,owner_id,borrower_id,start_date,end_date,status,message,
    handed_over_at,handover_notes,returned_at,return_condition,return_notes,return_photo_path)
    values(item,owner_id,borrower_id,today-2,today-1,'returned','PRIVATE MESSAGE SENTINEL',
      now()-interval '2 days','PRIVATE HANDOVER SENTINEL',now(),'minor_wear',
      'PRIVATE RETURN SENTINEL',owner_id || '/private-return.jpg') returning id into loan;
  perform set_config('borrowhood.ap_history_loan', loan::text, true);
  insert into storage.objects(bucket_id,name,owner_id)
    values('condition-photos',owner_id || '/private-return.jpg',owner_id::text);
  insert into public.items(owner_id,title,category,condition_note,listing_type,max_borrow_days)
    values(admin_id,'Local QA legacy admin item','Other','QA condition','free',7) returning id into item;
  perform set_config('borrowhood.ap_admin_item', item::text, true);
  insert into public.requests(item_id,owner_id,borrower_id,start_date,end_date,status,handed_over_at,handover_notes)
    values(item,admin_id,borrower_id,today-2,today-1,'handed_over',now()-interval '2 days','Legacy QA handover') returning id into loan;
  perform set_config('borrowhood.ap_admin_loan', loan::text, true);
  insert into public.items(owner_id,title,category,condition_note,listing_type,max_borrow_days)
    values(owner_id,'Local QA legacy admin borrow','Other','QA condition','free',7) returning id into item;
  insert into public.requests(item_id,owner_id,borrower_id,start_date,end_date,status,handed_over_at,handover_notes)
    values(item,owner_id,admin_id,today-2,today-1,'handed_over',now()-interval '2 days','Legacy QA handover') returning id into loan;
  insert into public.reports(request_id,reporter_id,borrower_id,reason)
    values(loan,owner_id,admin_id,'not_returned') returning id into report;
  perform set_config('borrowhood.ap_admin_report',report::text,true);
  foreach bucket in array array['profile-photos','item-photos','condition-photos'] loop
    insert into storage.objects(bucket_id,name,owner_id)
      values(bucket,admin_id || '/unused-' || bucket || '.jpg',admin_id::text);
  end loop;
end;
$$;

-- Verified nonparticipant baseline: exactly the profile/history/listing view an admin may read.
select set_config('request.jwt.claim.sub', current_setting('borrowhood.ap_borrower'), true);
set local role authenticated;
select public.admin_profile_assert(public.is_verified() and not public.is_admin(), 'verified student remains verified');
select set_config('borrowhood.ap_profile', public.student_profile(current_setting('borrowhood.ap_owner')::uuid)::text, true);
-- Use another verified viewer who is not a participant in the history fixture.
reset role;
do $$ declare viewer uuid := gen_random_uuid(); begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    values(viewer,'local-qa-' || viewer || '@ms.bulsu.edu.ph',now(),
      '{"full_name":"Local QA outsider","course_year_section":"QA Course 1-A"}'::jsonb);
  update public.profiles set verification_status='approved',submitted_at=now(),photo_path=viewer || '/current.jpg' where id=viewer;
  perform set_config('borrowhood.ap_outsider',viewer::text,true);
end $$;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.ap_outsider'), true);
set local role authenticated;
select set_config('borrowhood.ap_history', public.profile_history(current_setting('borrowhood.ap_owner')::uuid)::text, true);
select set_config('borrowhood.ap_listing_ids', (select coalesce(jsonb_agg(id order by id),'[]'::jsonb)::text
  from public.items where owner_id=current_setting('borrowhood.ap_owner')::uuid and deleted_at is null), true);
reset role;

-- Invoker helper: all operations below execute with authenticated privileges and the current JWT.
create function public.admin_profile_check_admin() returns void
language plpgsql set search_path = '' as $$
declare target_user uuid := current_setting('borrowhood.ap_owner')::uuid;
  admin_id uuid := current_setting('borrowhood.ap_admin')::uuid;
  item uuid := current_setting('borrowhood.ap_item')::uuid;
  admin_item uuid := current_setting('borrowhood.ap_admin_item')::uuid;
  loan uuid := current_setting('borrowhood.ap_admin_loan')::uuid;
  values_json jsonb := '{"title":"QA edited item","category":"Other","condition_note":"QA condition","listing_type":"free","max_borrow_days":7}';
  denied text := 'Admin accounts cannot use student actions.';
  action text; bucket text; affected integer; result jsonb;
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  perform public.admin_profile_assert(public.is_admin(), 'confirmed admin role recognized');
  result := public.student_profile(target_user);
  perform public.admin_profile_assert(result=current_setting('borrowhood.ap_profile')::jsonb, 'admin and verified profile payloads match exactly');
  perform public.admin_profile_assert(public.student_profile(current_setting('borrowhood.ap_unverified')::uuid) is null, 'admin profile read keeps verified-target prerequisites');
  perform public.admin_profile_assert((select array_agg(key order by key) from jsonb_object_keys(result) key)
    = array['course_year_section','created_at','full_name','id','photo_path','trust'], 'profile exact allowlist');
  result := public.profile_history(target_user);
  perform public.admin_profile_assert(result=current_setting('borrowhood.ap_history')::jsonb, 'admin and verified nonparticipant history match exactly');
  perform public.admin_profile_assert(result::text not like '%SENTINEL%' and not exists (
    select 1 from jsonb_array_elements(result->'entries') entry where entry->>'request_id' is not null
      or entry ?| array['message','handover_notes','return_notes','handover_photo_path','return_photo_path','email','reviewer_note']
  ), 'history has no private evidence or unrelated request IDs');
  perform public.admin_profile_assert((select coalesce(jsonb_agg(id order by id),'[]'::jsonb) from public.items
    where owner_id=target_user and deleted_at is null)
    = current_setting('borrowhood.ap_listing_ids')::jsonb, 'same published listing visibility');
  perform public.admin_profile_assert(exists(select 1 from storage.objects
    where bucket_id='profile-photos' and name=target_user || '/current.jpg'), 'existing admin avatar policy works');
  perform public.admin_profile_assert(public.request_detail(current_setting('borrowhood.ap_history_loan')::uuid) is null
    and not exists(select 1 from public.requests where id=current_setting('borrowhood.ap_history_loan')::uuid)
    and not exists(select 1 from storage.objects where bucket_id='condition-photos' and name=target_user || '/private-return.jpg'),
    'unrelated request and condition evidence remain private');
  perform public.admin_profile_expect(format('select public.post_comment(%L,''Denied QA comment'')',item),denied);
  perform public.admin_profile_expect(format('select public.create_request(%L,%L,%L,''Denied QA request'')',item,today,today),denied);
  perform public.admin_profile_expect(format('select public.save_item(null,%L::jsonb,''{}''::text[])',values_json),denied);
  perform public.admin_profile_expect(format('select public.save_item(%L,%L::jsonb,''{}''::text[])',admin_item,values_json),denied);
  perform public.admin_profile_expect(format('select public.delete_item(%L)',admin_item),denied);
  foreach action in array array['approve','decline','cancel','handover','return'] loop
    perform public.admin_profile_expect(format('select public.transition_request(%L,%L,''{"notes":"QA notes","confirmed":true,"condition":"good","reason":"QA reason"}''::jsonb)',loan,action),denied);
  end loop;
  perform public.admin_profile_expect(format('select public.save_my_profile(''Local QA admin'',''QA Course 1-A'',%L)',admin_id || '/current.jpg'),denied);
  perform public.admin_profile_expect('select public.submit_my_profile()',denied);
  perform public.admin_profile_expect('select public.submit_profile_change(''QA edited admin'',null,''QA Course 1-A'',''Local QA admin'',null)',denied);
  perform public.admin_profile_expect(format('select public.file_report(%L,''not_returned'','''')',loan),denied);
  perform public.admin_profile_expect(format('select public.respond_report(%L,''Denied QA response'',1)',current_setting('borrowhood.ap_admin_report')),denied);
  perform public.admin_profile_assert(not public.can_upload_condition(admin_id || '/' || loan || '/return/qa.jpg'), 'admin condition upload predicate denied');
  foreach bucket in array array['profile-photos','item-photos','condition-photos'] loop
    perform public.admin_profile_expect(format('insert into storage.objects(bucket_id,name,owner_id) values(%L,%L,%L)',
      bucket,admin_id || '/denied-' || bucket || '.jpg',admin_id::text),'42501');
    delete from storage.objects where bucket_id=bucket and name=admin_id || '/unused-' || bucket || '.jpg';
    get diagnostics affected=row_count;
    perform public.admin_profile_assert(affected=0,'admin cannot clean up ' || bucket);
    update storage.objects set name=admin_id || '/renamed-' || bucket || '.jpg'
      where bucket_id=bucket and name=admin_id || '/unused-' || bucket || '.jpg';
    get diagnostics affected=row_count;
    perform public.admin_profile_assert(affected=0,'admin cannot overwrite ' || bucket);
  end loop;
  perform public.admin_profile_expect(format('insert into public.comments(item_id,author_id,body) values(%L,%L,''Denied'')',item,admin_id),'42501');
  perform public.admin_profile_expect('insert into public.requests default values','42501');
  perform public.admin_profile_expect('insert into public.items default values','42501');
  perform public.admin_profile_expect(format('update public.items set title=''Denied edit'' where id=%L',admin_item),'42501');
  perform public.admin_profile_expect(format('delete from public.items where id=%L',admin_item),'42501');
  perform public.admin_profile_assert(not has_function_privilege('authenticated','public.trust_totals(uuid)','EXECUTE'), 'trust helper remains internal');
end;
$$;
revoke all on function public.admin_profile_check_admin() from public;
grant execute on function public.admin_profile_check_admin() to authenticated;

-- Ordinary admin: read succeeds without marking the admin verified.
select set_config('request.jwt.claim.sub',current_setting('borrowhood.ap_admin'),true);
set local role authenticated;
select public.admin_profile_assert(not public.is_verified(), 'unapproved admin is not made verified');
select public.admin_profile_check_admin();
reset role;
-- Regression: approval prerequisites alone must never allow admin student writes.
update public.profiles set verification_status='approved',submitted_at=now(),photo_path=id || '/current.jpg'
  where id=current_setting('borrowhood.ap_admin')::uuid;
set local role authenticated;
select public.admin_profile_assert(public.is_verified(), 'existing verification semantics retained for overlapping admin');
select public.admin_profile_check_admin();
reset role;
-- Unconfirmed admin-role accounts are denied onboarding writes too.
update auth.users set email_confirmed_at=null where id=current_setting('borrowhood.ap_admin')::uuid;
set local role authenticated;
select public.admin_profile_expect('select public.submit_my_profile()','Admin accounts cannot use student actions.');
select public.admin_profile_expect('select public.save_my_profile(''Local QA admin'',''QA Course 1-A'',null)','Admin accounts cannot use student actions.');
select public.admin_profile_expect(format('select public.student_profile(%L)',current_setting('borrowhood.ap_owner')),'Verified students or admins only.');
reset role;

-- Unverified and guest profile/history denial and unverified onboarding regression.
select set_config('request.jwt.claim.sub',current_setting('borrowhood.ap_unverified'),true);
set local role authenticated;
select public.admin_profile_expect(format('select public.student_profile(%L)',current_setting('borrowhood.ap_owner')),'Verified students or admins only.');
select public.admin_profile_expect(format('select public.profile_history(%L)',current_setting('borrowhood.ap_owner')),'Verified students or admins only.');
select public.admin_profile_expect(format('select public.post_comment(%L,''Denied'')',current_setting('borrowhood.ap_item')),'Complete verification before commenting.');
select public.save_my_profile('Local QA unverified','QA Updated Course',current_setting('borrowhood.ap_unverified') || '/current.jpg');
select public.submit_my_profile();
select public.admin_profile_expect(format('select public.student_profile(%L)',current_setting('borrowhood.ap_unverified')),'Verified students or admins only.');
insert into storage.objects(bucket_id,name,owner_id) values('profile-photos',
  current_setting('borrowhood.ap_unverified') || '/unused.jpg',current_setting('borrowhood.ap_unverified'));
delete from storage.objects where bucket_id='profile-photos' and name=current_setting('borrowhood.ap_unverified') || '/unused.jpg';
select public.admin_profile_assert(not exists(select 1 from storage.objects where bucket_id='profile-photos'
  and name=current_setting('borrowhood.ap_unverified') || '/unused.jpg'),'unverified student upload cleanup retained');
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select public.admin_profile_expect(format('select public.student_profile(%L)',current_setting('borrowhood.ap_owner')),'42501');
select public.admin_profile_expect(format('select public.profile_history(%L)',current_setting('borrowhood.ap_owner')),'42501');
reset role;

-- Verified student positive paths retain real RPC behavior (no direct-write bypass).
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claim.sub',current_setting('borrowhood.ap_borrower'),true);
set local role authenticated;
select public.admin_profile_assert(public.student_profile(current_setting('borrowhood.ap_owner')::uuid)=current_setting('borrowhood.ap_profile')::jsonb,'verified profile unchanged');
select public.post_comment(current_setting('borrowhood.ap_item')::uuid,'Local QA allowed comment');
select set_config('borrowhood.ap_created_item',public.save_item(null,
  '{"title":"Local QA created item","category":"Other","condition_note":"QA condition","listing_type":"free","max_borrow_days":7}'::jsonb,'{}'::text[])::text,true);
select public.save_item(current_setting('borrowhood.ap_created_item')::uuid,
  '{"title":"Local QA edited item","category":"Other","condition_note":"QA condition","listing_type":"free","max_borrow_days":7}'::jsonb,'{}'::text[]);
select public.delete_item(current_setting('borrowhood.ap_created_item')::uuid);
select set_config('borrowhood.ap_created_request',public.create_request(current_setting('borrowhood.ap_item')::uuid,
  (now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date,'Local QA allowed request')::text,true);
reset role;
select set_config('request.jwt.claim.sub',current_setting('borrowhood.ap_owner'),true);
set local role authenticated;
select public.transition_request(current_setting('borrowhood.ap_created_request')::uuid,'approve');
select public.transition_request(current_setting('borrowhood.ap_created_request')::uuid,'handover','{"notes":"QA handover","confirmed":true}'::jsonb);
select public.transition_request(current_setting('borrowhood.ap_created_request')::uuid,'return','{"notes":"QA return","condition":"good"}'::jsonb);
reset role;
select public.admin_profile_assert((select status='returned' from public.requests where id=current_setting('borrowhood.ap_created_request')::uuid),'verified lifecycle still works');
select public.admin_profile_assert((select deleted_at is not null from public.items where id=current_setting('borrowhood.ap_created_item')::uuid),'verified listing create/edit/delete works');
select public.admin_profile_assert(not exists(select 1 from public.comments where author_id=current_setting('borrowhood.ap_admin')::uuid),'admin comments never inserted');
select public.admin_profile_assert((select borrower_response is null and version=1 from public.reports where id=current_setting('borrowhood.ap_admin_report')::uuid),'admin response never changed report');
rollback;
