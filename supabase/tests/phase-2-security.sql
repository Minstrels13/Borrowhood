-- Run in SQL editor after migration and creation of at least one real student.
-- Ten checks, no test accounts/content. Everything rolls back; a failure raises.
begin;

create function public.phase2_assert(ok boolean, label text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if ok is distinct from true then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end;
$$;
comment on function public.phase2_assert(boolean, text) is 'Temporary transaction-only security assertion for manual SQL checks.';

grant execute on function public.phase2_assert(boolean, text) to anon, authenticated;

-- 1: RLS is enabled.
select public.phase2_assert((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), '1 profile RLS');

-- 2: Browser roles cannot write protected profile fields directly.
select public.phase2_assert(not has_table_privilege('authenticated','public.profiles','UPDATE')
  and not has_table_privilege('authenticated','public.profiles','INSERT')
  and not has_table_privilege('authenticated','public.profiles','DELETE'), '2 no direct profile writes');

-- 3: Guest profile reads and function execution are denied.
select public.phase2_assert(not has_any_column_privilege('anon','public.profiles','SELECT')
  and not has_function_privilege('anon','public.save_my_profile(text,text,text)','EXECUTE')
  and not has_function_privilege('anon','public.review_student(uuid,text,text,text)','EXECUTE'), '3 guest privacy');

-- 4: Admin notes cannot be read via direct student queries.
select public.phase2_assert(not has_column_privilege('authenticated','public.profiles','reviewer_note','SELECT'), '4 private admin notes');

-- 5: Outside-domain email rejected by the same trigger used on signup.
do $$
declare
  student_id uuid;
begin
  select p.id into student_id from public.profiles p where p.role = 'student' limit 1;
  if student_id is null then
    raise exception 'Create a real student account before running these checks.';
  end if;
  perform set_config('request.jwt.claim.sub', student_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', student_id,'role','authenticated')::text, true);
  begin
    update auth.users set email = 'domain-check@example.invalid' where id = student_id;
    raise exception 'Domain guard did not reject the change';
  exception when raise_exception then
    if sqlerrm <> 'Use your @ms.bulsu.edu.ph student email.' then
      raise;
    end if;
  end;
  raise notice 'PASS: 5 email domain boundary';
end;
$$;

set local role authenticated;

-- 6: Student sees only own private profile.
select public.phase2_assert(not exists (select 1 from public.profiles where id <> auth.uid()), '6 own-only private profile read');

-- 7: A student cannot invoke an admin review even to self-approve.
do $$
begin
  begin
    perform public.review_student(auth.uid(),'approved');
    raise exception 'Student review was allowed';
  exception when raise_exception then
    if sqlerrm <> 'Admin access required.' then
      raise;
    end if;
  end;
  raise notice 'PASS: 7 no self approval';
end;
$$;
reset role;

-- 8: Storage bucket is private and size/type constrained.
select public.phase2_assert(exists (select 1 from storage.buckets where id = 'profile-photos'
  and public = false and file_size_limit = 1048576 and allowed_mime_types = array['image/jpeg']), '8 private constrained photo bucket');

-- 9: No overwrite policy exists for this bucket; unique upload paths are required.
select public.phase2_assert(not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
  and cmd in ('UPDATE','ALL')), '9 no in-place photo overwrite');

-- 10: Both server-side Auth hooks are installed.
select public.phase2_assert((select count(*) = 2 from pg_trigger where tgrelid = 'auth.users'::regclass
  and tgname in ('borrowhood_email_guard','borrowhood_profile_created')), '10 Auth guards installed');

rollback;
