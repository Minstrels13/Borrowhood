-- SQL Editor postgres role, after 030/031/040. Uses three existing verified accounts; all fixture rows roll back.
begin;

do $$
declare
  members uuid[];
  listing uuid;
  late_item uuid;
  wear_item uuid;
  pending uuid;
  comment_id uuid;
  forged public.items;
  before_trust jsonb;
  after_trust jsonb;
  result jsonb;
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.comments'::regclass)
    or has_table_privilege('authenticated', 'public.comments', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('anon', 'public.comments', 'INSERT,UPDATE,DELETE') then
    raise exception 'FAIL: comment RLS/write grants';
  end if;
  raise notice 'PASS: 1 comments have RLS and no direct browser mutations';
  if has_function_privilege('anon', 'public.student_profile(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.profile_history(uuid,integer)', 'EXECUTE')
    or has_function_privilege('anon', 'public.delete_item(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.post_comment(uuid,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.trust_totals(uuid)', 'EXECUTE') then
    raise exception 'FAIL: private function grants';
  end if;
  raise notice 'PASS: 2 private profile/history/delete/post and internal trust grants';
  select array_agg(id) into members from (
    select p.id from public.profiles p join auth.users u on u.id = p.id
    where p.verification_status = 'approved' and p.photo_path is not null and p.submitted_at is not null
      and u.email_confirmed_at is not null and lower(u.email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$'
    order by p.id limit 3
  ) accounts;
  if coalesce(array_length(members, 1), 0) < 3 then raise exception 'Three verified team accounts are required.'; end if;
  insert into public.items(owner_id,title,category,condition_note,listing_type,max_borrow_days)
    values (members[1],'Rollback active','Other','Test only','free',7) returning id into listing;
  insert into public.items(owner_id,title,category,condition_note,listing_type,max_borrow_days)
    values (members[1],'Rollback trust late','Other','Test only','free',7) returning id into late_item;
  insert into public.items(owner_id,title,category,condition_note,listing_type,max_borrow_days)
    values (members[1],'Rollback minor wear','Other','Test only','free',7) returning id into wear_item;
  before_trust := public.trust_totals(members[2]);
  insert into public.requests(item_id,owner_id,borrower_id,start_date,end_date,status,handed_over_at,handover_notes,returned_at,return_condition)
    values (late_item,members[1],members[2],today-1,today-1,'returned',now()-interval '1 day','Private handover',now(),'damaged'),
      (wear_item,members[1],members[2],today,today,'returned',now(),'Private handover',now(),'minor_wear');
  after_trust := public.trust_totals(members[2]);
  if (after_trust->>'completed')::integer <> (before_trust->>'completed')::integer + 2
    or (after_trust->>'late')::integer <> (before_trust->>'late')::integer + 1
    or (after_trust->>'damaged')::integer <> (before_trust->>'damaged')::integer + 1
    or (after_trust->>'score')::integer <> greatest(0,100-8*((before_trust->>'late')::integer+1)-15*((before_trust->>'damaged')::integer+1)) then
    raise exception 'FAIL: Manila trust outcomes/minor wear';
  end if;
  raise notice 'PASS: 3 trust uses real return outcomes, Manila dates and cumulative penalties';
  perform set_config('request.jwt.claim.sub', members[1]::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',members[1],'role','authenticated')::text,true);
  result := public.student_profile(members[2]);
  if result is null or result ? 'email' or result ? 'role' or result ? 'reviewer_note' then
    raise exception 'FAIL: profile projection';
  end if;
  raise notice 'PASS: 4 verified profile excludes private account fields';
  comment_id := public.post_comment(listing, 'Rollback public question');
  if not exists (select 1 from public.comments where id = comment_id and author_id = members[1]) then
    raise exception 'FAIL: comment actor';
  end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}',true);
  begin
    perform public.post_comment(listing,'Must fail');
    raise exception 'FAIL: unverified comment';
  exception when raise_exception then
    if sqlerrm <> 'Complete verification before commenting.' then raise; end if;
  end;
  raise notice 'PASS: 5 comment author is server-controlled and unverified posting fails';
  result := public.comment_list(listing);
  if jsonb_array_length(result->'entries') <> 1 or result->'entries'->0->'author' ? 'email' then
    raise exception 'FAIL: public comment projection';
  end if;
  raise notice 'PASS: 6 public Q&A exposes narrow author fields';
  perform set_config('request.jwt.claim.sub', members[3]::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',members[3],'role','authenticated')::text,true);
  result := public.profile_history(members[2]);
  if not exists (select 1 from jsonb_array_elements(result->'entries') entry
    where entry->>'title' = 'Rollback trust late' and entry->>'request_id' is null
      and not entry ? 'message' and not entry ? 'handover_notes' and not entry ? 'return_photo_path') then
    raise exception 'FAIL: nonparticipant history projection';
  end if;
  raise notice 'PASS: 7 other verified students see summaries without private evidence or request IDs';
  select * into forged from public.items where id = listing;
  forged.owner_id := members[3];
  if public.request_counts(forged) is not null then raise exception 'FAIL: forged composite ownership'; end if;
  begin
    perform public.delete_item(listing);
    raise exception 'FAIL: nonowner delete';
  exception when raise_exception then
    if sqlerrm <> 'Only the owner can delete an existing listing.' then raise; end if;
  end;
  raise notice 'PASS: 8 listing counts and deletion verify actual ownership';
  perform set_config('request.jwt.claim.sub', members[1]::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',members[1],'role','authenticated')::text,true);
  insert into public.requests(item_id,owner_id,borrower_id,start_date,end_date)
    values (listing,members[1],members[2],today+5,today+6) returning id into pending;
  begin
    perform public.delete_item(listing);
    raise exception 'FAIL: active request deletion';
  exception when raise_exception then
    if sqlerrm <> 'Complete or close active requests before hiding or deleting this listing.' then raise; end if;
  end;
  raise notice 'PASS: 9 pending requests block soft deletion';
  perform public.transition_request(pending,'approve');
  begin
    update public.items set meetup_note = 'Changed agreement' where id = listing;
    raise exception 'FAIL: approved agreement changed';
  exception when raise_exception then
    if sqlerrm <> 'Rental terms and meetup details cannot change during an approved or ongoing loan.' then raise; end if;
  end;
  update public.requests set status='declined',decline_reason='Rollback test',declined_at=now() where id=pending;
  perform public.delete_item(listing);
  begin
    perform public.comment_list(listing);
    raise exception 'FAIL: deleted public comments';
  exception when raise_exception then
    if sqlerrm <> 'This listing is unavailable.' then raise; end if;
  end;
  if not exists (select 1 from public.requests where id=pending) then raise exception 'FAIL: history removed'; end if;
  raise notice 'PASS: 10 active agreements protected; soft deletion hides public Q&A and retains history';
end;
$$;

rollback;
