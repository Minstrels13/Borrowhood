-- Run manually in the Supabase SQL Editor after 044. No new accounts/content.
-- Requires an existing admin and two confirmed, approved students; one has no pending proposal.
-- Existing values are changed only inside this transaction, which always rolls back.
begin;

create function public.profile_change_assert(ok boolean, label text) returns void
language plpgsql set search_path = '' as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end;
$$;
revoke execute on function public.profile_change_assert(boolean,text) from public, anon;
grant execute on function public.profile_change_assert(boolean,text) to authenticated;

select public.profile_change_assert(
  (select relrowsecurity from pg_class where oid = 'public.profile_change_requests'::regclass)
  and not has_table_privilege('authenticated','public.profile_change_requests','INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon','public.profile_change_requests','SELECT,INSERT,UPDATE,DELETE'),
  'RLS and no direct client writes or guest reads');
select public.profile_change_assert(
  not has_function_privilege('anon','public.submit_profile_change(text,text,text,text,text)','EXECUTE')
  and not has_function_privilege('anon','public.review_profile_change(uuid,text,text)','EXECUTE')
  and not has_function_privilege('anon','public.profile_change_queue(text,text,integer)','EXECUTE'),
  'guest RPC access denied');

do $$
declare student public.profiles; admin_id uuid; outsider_id uuid;
begin
  select p.* into student from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'student' and p.verification_status = 'approved' and p.submitted_at is not null
      and p.photo_path is not null and u.email_confirmed_at is not null and p.full_name ~ '[A-Za-z]'
      and not exists (select 1 from public.profile_change_requests c where c.student_id = p.id and c.status = 'pending')
      and exists (select 1 from storage.objects o where o.bucket_id = 'profile-photos'
        and o.name = p.photo_path and o.owner_id = p.id::text)
    order by p.id limit 1;
  select p.id into admin_id from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'admin' and u.email_confirmed_at is not null order by p.id limit 1;
  select p.id into outsider_id from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'student' and p.id <> student.id and p.verification_status = 'approved'
      and u.email_confirmed_at is not null order by p.id limit 1;
  if student.id is null or admin_id is null or outsider_id is null then
    raise exception 'An admin and two existing verified students are required; one student needs an owned photo and no pending change.';
  end if;
  perform set_config('borrowhood.test_student', student.id::text, true);
  perform set_config('borrowhood.test_admin', admin_id::text, true);
  perform set_config('borrowhood.test_outsider', outsider_id::text, true);
  perform set_config('borrowhood.test_name', student.full_name, true);
  perform set_config('borrowhood.test_photo', student.photo_path, true);
  perform set_config('borrowhood.test_course', student.course_year_section, true);
  perform set_config('borrowhood.test_changed_name', case when upper(student.full_name) <> student.full_name
    then upper(student.full_name) else lower(student.full_name) end, true);
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_student'), true);
set local role authenticated;

-- Calling the old RPC directly cannot bypass review.
do $$
begin
  begin
    perform public.save_my_profile(current_setting('borrowhood.test_changed_name'),
      current_setting('borrowhood.test_course'), current_setting('borrowhood.test_photo'));
    raise exception 'FAIL: legacy RPC changed approved identity';
  exception when others then
    if sqlerrm not like 'Name and photo changes require admin approval.%' then raise; end if;
  end;
  begin
    perform public.save_my_profile(current_setting('borrowhood.test_name'),
      current_setting('borrowhood.test_course'), null);
    raise exception 'FAIL: legacy RPC removed approved photo';
  exception when others then
    if sqlerrm not like 'Name and photo changes require admin approval.%' then raise; end if;
  end;
end;
$$;

select public.save_my_profile(current_setting('borrowhood.test_name'),
  lower(current_setting('borrowhood.test_course')), current_setting('borrowhood.test_photo'));
select public.profile_change_assert(
  (select course_year_section = lower(current_setting('borrowhood.test_course'))
    from public.profiles where id = auth.uid()) and public.is_verified(), 'course edits apply immediately and retain verification');

select set_config('borrowhood.test_change', public.submit_profile_change(
  current_setting('borrowhood.test_changed_name'), current_setting('borrowhood.test_photo'),
  current_setting('borrowhood.test_course'), current_setting('borrowhood.test_name'),
  current_setting('borrowhood.test_photo'))::text, true);
select public.profile_change_assert(
  (select full_name = current_setting('borrowhood.test_name') and photo_path = current_setting('borrowhood.test_photo')
    from public.profiles where id = auth.uid()) and public.is_verified()
  and (select status = 'pending' from public.profile_change_requests where id = current_setting('borrowhood.test_change')::uuid),
  'pending proposal retains approved identity, verification and student visibility');

do $$
begin
  begin
    perform public.submit_profile_change(current_setting('borrowhood.test_changed_name'), current_setting('borrowhood.test_photo'),
      current_setting('borrowhood.test_course'), current_setting('borrowhood.test_name'), current_setting('borrowhood.test_photo'));
    raise exception 'FAIL: duplicate pending proposal accepted';
  exception when others then
    if sqlerrm not like 'A name or photo change is already awaiting review.%' then raise; end if;
  end;
  begin
    perform public.review_profile_change(current_setting('borrowhood.test_change')::uuid, 'approved');
    raise exception 'FAIL: student approved a proposal';
  exception when others then
    if sqlerrm <> 'Admin access required.' then raise; end if;
  end;
end;
$$;
select public.save_my_profile(current_setting('borrowhood.test_name'),
  lower(current_setting('borrowhood.test_course')), current_setting('borrowhood.test_photo'));
with removed as (delete from storage.objects where bucket_id = 'profile-photos'
  and name = current_setting('borrowhood.test_photo') returning name)
select public.profile_change_assert(not exists (select 1 from removed), 'referenced photo cannot be deleted');

reset role;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_outsider'), true);
set local role authenticated;
select public.profile_change_assert(not exists (select 1 from public.profile_change_requests
  where student_id = current_setting('borrowhood.test_student')::uuid), 'other students cannot read proposals');
do $$
begin
  begin
    perform public.profile_change_queue('pending');
    raise exception 'FAIL: student accessed admin queue';
  exception when others then
    if sqlerrm <> 'Admin access required.' then raise; end if;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_admin'), true);
set local role authenticated;
do $$
begin
  begin
    perform public.review_profile_change(current_setting('borrowhood.test_change')::uuid, 'rejected', ' ');
    raise exception 'FAIL: empty rejection accepted';
  exception when others then
    if sqlerrm <> 'Enter a rejection reason (up to 1000 characters).' then raise; end if;
  end;
end;
$$;
select public.review_profile_change(current_setting('borrowhood.test_change')::uuid, 'rejected', 'Please check the proposed name.');
select public.profile_change_assert((select status = 'rejected' and rejection_reason = 'Please check the proposed name.'
  from public.profile_change_requests where id = current_setting('borrowhood.test_change')::uuid), 'rejection records student-visible reason');

reset role;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_student'), true);
set local role authenticated;
select public.profile_change_assert((select full_name = current_setting('borrowhood.test_name')
  and course_year_section = lower(current_setting('borrowhood.test_course')) from public.profiles where id = auth.uid())
  and public.is_verified(), 'rejection preserves identity, latest course and access');
do $$
begin
  begin
    perform public.submit_profile_change(current_setting('borrowhood.test_changed_name'), current_setting('borrowhood.test_photo'),
      current_setting('borrowhood.test_course'), current_setting('borrowhood.test_changed_name'), current_setting('borrowhood.test_photo'));
    raise exception 'FAIL: stale base identity accepted';
  exception when others then
    if sqlerrm <> 'Your approved profile has changed. Refresh it before submitting changes.' then raise; end if;
  end;
  begin
    perform public.submit_profile_change(current_setting('borrowhood.test_changed_name'), current_setting('borrowhood.test_outsider') || '/missing.jpg',
      current_setting('borrowhood.test_course'), current_setting('borrowhood.test_name'), current_setting('borrowhood.test_photo'));
    raise exception 'FAIL: foreign photo accepted';
  exception when others then
    if sqlerrm <> 'Upload your own profile photo first.' then raise; end if;
  end;
end;
$$;
select set_config('borrowhood.test_approved_change', public.submit_profile_change(
  current_setting('borrowhood.test_changed_name'), current_setting('borrowhood.test_photo'),
  current_setting('borrowhood.test_course'), current_setting('borrowhood.test_name'), current_setting('borrowhood.test_photo'))::text, true);
select public.save_my_profile(current_setting('borrowhood.test_name'), lower(current_setting('borrowhood.test_course')), current_setting('borrowhood.test_photo'));

reset role;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_admin'), true);
set local role authenticated;
select public.review_profile_change(current_setting('borrowhood.test_approved_change')::uuid, 'approved');
select public.profile_change_assert((select full_name = current_setting('borrowhood.test_changed_name')
  and photo_path = current_setting('borrowhood.test_photo') and verification_status = 'approved'
  and course_year_section = lower(current_setting('borrowhood.test_course'))
  from public.profiles where id = current_setting('borrowhood.test_student')::uuid),
  'approval replaces identity without reverting course or verification');
do $$
begin
  begin
    perform public.review_profile_change(current_setting('borrowhood.test_approved_change')::uuid, 'approved');
    raise exception 'FAIL: repeated review accepted';
  exception when others then
    if sqlerrm <> 'Refresh the queue; this profile change is no longer pending.' then raise; end if;
  end;
end;
$$;

reset role;
select set_config('borrowhood.test_alternate_photo', coalesce((select name from storage.objects o
  where bucket_id = 'profile-photos' and owner_id = current_setting('borrowhood.test_student')
    and split_part(name, '/', 1) = current_setting('borrowhood.test_student')
    and name <> current_setting('borrowhood.test_photo')
    and not exists (select 1 from public.profiles p where p.photo_path = o.name)
  order by name limit 1), ''), true);
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_student'), true);
set local role authenticated;
do $$
declare proposal_id uuid; deleted_count integer;
begin
  if current_setting('borrowhood.test_alternate_photo') = '' then
    raise notice 'NOT VERIFIED: photo replacement requires a second existing owned upload. Test with an actual replacement photo in the browser.';
    return;
  end if;
  proposal_id := public.submit_profile_change(current_setting('borrowhood.test_changed_name'),
    current_setting('borrowhood.test_alternate_photo'), current_setting('borrowhood.test_course'),
    current_setting('borrowhood.test_changed_name'), current_setting('borrowhood.test_photo'));
  perform set_config('borrowhood.test_photo_change', proposal_id::text, true);
  delete from storage.objects where bucket_id = 'profile-photos' and name = current_setting('borrowhood.test_alternate_photo');
  get diagnostics deleted_count = row_count;
  perform public.profile_change_assert(deleted_count = 0, 'pending replacement photo cannot be deleted');
  perform public.profile_change_assert((select photo_path = current_setting('borrowhood.test_photo')
    from public.profiles where id = auth.uid()), 'photo-only proposal keeps approved photo visible');
end;
$$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_outsider'), true);
set local role authenticated;
do $$
begin
  if current_setting('borrowhood.test_alternate_photo') <> '' then
    perform public.profile_change_assert(not public.verified_profile_photo(current_setting('borrowhood.test_alternate_photo')),
      'pending replacement photo is not a publicly approved avatar');
  end if;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('borrowhood.test_admin'), true);
set local role authenticated;
do $$
declare own_profile record; proposal_id uuid;
begin
  if current_setting('borrowhood.test_alternate_photo') <> '' then
    perform public.review_profile_change(current_setting('borrowhood.test_photo_change')::uuid, 'approved');
    perform public.profile_change_assert((select photo_path = current_setting('borrowhood.test_alternate_photo')
      from public.profiles where id = current_setting('borrowhood.test_student')::uuid), 'photo approval replaces the approved avatar');
  end if;
  if public.is_verified()
    and exists (select 1 from storage.objects o join public.profiles p on p.id = auth.uid()
      where o.bucket_id = 'profile-photos' and o.name = p.photo_path and o.owner_id = auth.uid()::text)
    and not exists (select 1 from public.profile_change_requests where student_id = auth.uid() and status = 'pending') then
    select full_name, photo_path, course_year_section into own_profile from public.profiles where id = auth.uid();
    if own_profile.full_name ~ '[A-Za-z]' then
      proposal_id := public.submit_profile_change(case when upper(own_profile.full_name) <> own_profile.full_name
        then upper(own_profile.full_name) else lower(own_profile.full_name) end, own_profile.photo_path,
        own_profile.course_year_section, own_profile.full_name, own_profile.photo_path);
      begin
        perform public.review_profile_change(proposal_id, 'approved');
        raise exception 'FAIL: admin approved own changes';
      exception when others then
        if sqlerrm <> 'You cannot review your own profile changes.' then raise; end if;
      end;
      raise notice 'PASS: admin cannot self-review';
    end if;
  else
    raise notice 'NOT VERIFIED: self-review case needs an approved admin with no pending proposal.';
  end if;
end;
$$;
reset role;
rollback;
