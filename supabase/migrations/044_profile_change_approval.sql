begin;

-- Keep proposed identity separate from the approved profile used everywhere else.
create table public.profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  previous_full_name text not null,
  previous_photo_path text not null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  photo_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default clock_timestamp(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  constraint profile_change_review_complete check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null)
    or (status = 'approved' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null)
    or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null
      and rejection_reason is not null and char_length(trim(rejection_reason)) between 1 and 1000)
  ),
  constraint profile_change_has_changes check (
    full_name is distinct from previous_full_name or photo_path is distinct from previous_photo_path
  )
);
create unique index profile_change_one_pending on public.profile_change_requests(student_id)
  where status = 'pending';
create index profile_change_queue_order on public.profile_change_requests(status, created_at, id);
create index profile_change_student_history on public.profile_change_requests(student_id, created_at desc, id desc);
alter table public.profile_change_requests enable row level security;
revoke all on public.profile_change_requests from anon, authenticated;
grant select on public.profile_change_requests to authenticated;
create policy profile_change_read_self_or_admin on public.profile_change_requests
  for select to authenticated using (student_id = (select auth.uid()) or (select public.is_admin()));

-- Close the existing RPC bypass, while preserving onboarding and direct course edits.
create or replace function public.save_my_profile(p_full_name text, p_course text, p_photo_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  student public.profiles;
begin
  if auth.uid() is null then raise exception 'Log in to update your details.'; end if;
  select * into student from public.profiles where id = auth.uid() for update;
  if not exists (select 1 from auth.users where id = auth.uid()
    and lower(email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$') then
    raise exception 'Use your @ms.bulsu.edu.ph student email.';
  end if;
  if coalesce(char_length(trim(p_full_name)), 0) not between 2 and 100
    or coalesce(char_length(trim(p_course)), 0) not between 2 and 100 then
    raise exception 'Enter a full name and course, year and section between 2 and 100 characters.';
  end if;
  if student.verification_status = 'approved' then
    if trim(p_full_name) is distinct from student.full_name or p_photo_path is distinct from student.photo_path then
      raise exception 'Name and photo changes require admin approval. Refresh your profile and submit them for review.';
    end if;
    update public.profiles set course_year_section = trim(p_course), updated_at = now() where id = auth.uid();
    return;
  end if;
  if p_photo_path is not null and not exists (
    select 1 from storage.objects where bucket_id = 'profile-photos' and name = p_photo_path
      and owner_id = auth.uid()::text and split_part(name, '/', 1) = auth.uid()::text
  ) then raise exception 'Upload your own profile photo first.'; end if;
  if student.id is null then
    insert into public.profiles(id, full_name, course_year_section, photo_path)
    values (auth.uid(), trim(p_full_name), trim(p_course), p_photo_path);
    return;
  end if;
  if student.photo_path is not null and p_photo_path is null then raise exception 'A profile photo is required.'; end if;
  update public.profiles set full_name = trim(p_full_name), course_year_section = trim(p_course),
    photo_path = p_photo_path, updated_at = now(), submitted_at = null where id = auth.uid();
end;
$$;
comment on function public.save_my_profile(text, text, text) is
  'Approved students edit course directly; name/photo edits require a separate reviewed proposal. Onboarding/resubmission is unchanged.';

create function public.submit_profile_change(
  p_full_name text, p_photo_path text, p_course text, p_expected_name text, p_expected_photo text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  student public.profiles;
  saved_id uuid;
begin
  select * into student from public.profiles where id = auth.uid() for update;
  if not public.is_verified() then raise exception 'Verified students only.'; end if;
  if student.full_name is distinct from p_expected_name or student.photo_path is distinct from p_expected_photo then
    raise exception 'Your approved profile has changed. Refresh it before submitting changes.';
  end if;
  if exists (select 1 from public.profile_change_requests where student_id = auth.uid() and status = 'pending') then
    raise exception 'A name or photo change is already awaiting review. You can still update your course.';
  end if;
  if coalesce(char_length(trim(p_full_name)), 0) not between 2 and 100
    or coalesce(char_length(trim(p_course)), 0) not between 2 and 100 then
    raise exception 'Enter a full name and course, year and section between 2 and 100 characters.';
  end if;
  if p_photo_path is null or not exists (
    select 1 from storage.objects where bucket_id = 'profile-photos' and name = p_photo_path
      and owner_id = auth.uid()::text and split_part(name, '/', 1) = auth.uid()::text
  ) then raise exception 'Upload your own profile photo first.'; end if;
  if trim(p_full_name) = student.full_name and p_photo_path = student.photo_path then
    raise exception 'Change your name or photo before submitting for review.';
  end if;
  insert into public.profile_change_requests(student_id, previous_full_name, previous_photo_path, full_name, photo_path)
  values (auth.uid(), student.full_name, student.photo_path, trim(p_full_name), p_photo_path) returning id into saved_id;
  -- Course changes take effect immediately; verification and the approved identity stay intact.
  update public.profiles set course_year_section = trim(p_course), updated_at = now() where id = auth.uid();
  return saved_id;
end;
$$;

create function public.review_profile_change(p_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  student public.profiles;
  proposal public.profile_change_requests;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then raise exception 'Invalid review decision.'; end if;
  select student_id into target_id from public.profile_change_requests where id = p_id;
  if target_id is null then raise exception 'Profile change unavailable. Refresh the queue.'; end if;
  if target_id = auth.uid() then raise exception 'You cannot review your own profile changes.'; end if;
  -- Same lock order as submission prevents concurrent reviews/submissions from racing.
  select * into student from public.profiles where id = target_id for update;
  select * into proposal from public.profile_change_requests where id = p_id for update;
  if proposal.id is null or proposal.status <> 'pending' then
    raise exception 'Refresh the queue; this profile change is no longer pending.';
  end if;
  if p_decision = 'rejected' and coalesce(char_length(trim(p_reason)), 0) not between 1 and 1000 then
    raise exception 'Enter a rejection reason (up to 1000 characters).';
  end if;
  if p_decision = 'approved' then
    if student.verification_status <> 'approved' or student.photo_path is null or student.submitted_at is null
      or not exists (select 1 from auth.users where id = target_id and email_confirmed_at is not null
        and lower(email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$') then
      raise exception 'This student is no longer verified. Reject this proposal instead.';
    end if;
    if student.full_name is distinct from proposal.previous_full_name
      or student.photo_path is distinct from proposal.previous_photo_path then
      raise exception 'The approved identity has changed. Reject this stale proposal and ask the student to resubmit.';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'profile-photos' and name = proposal.photo_path
      and owner_id = target_id::text and split_part(name, '/', 1) = target_id::text) then
      raise exception 'The proposed photo is unavailable. Reject this proposal and ask the student to upload it again.';
    end if;
    update public.profiles set full_name = proposal.full_name, photo_path = proposal.photo_path,
      updated_at = now() where id = target_id;
  end if;
  update public.profile_change_requests set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(),
    rejection_reason = case when p_decision = 'rejected' then trim(p_reason) else null end where id = p_id;
end;
$$;

create function public.profile_change_queue(p_status text, p_search text default '', p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  entries jsonb;
  total_count bigint;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_status is null or p_status not in ('pending', 'approved', 'rejected') then raise exception 'Invalid review status.'; end if;
  if p_offset is null or p_offset < 0 then raise exception 'Invalid queue offset.'; end if;
  select count(*) into total_count from public.profile_change_requests c join auth.users u on u.id = c.student_id
    where c.status = p_status and (c.full_name ilike '%' || left(coalesce(p_search, ''), 100) || '%'
      or c.previous_full_name ilike '%' || left(coalesce(p_search, ''), 100) || '%'
      or u.email ilike '%' || left(coalesce(p_search, ''), 100) || '%');
  select coalesce(jsonb_agg(entry order by created_at, id), '[]'::jsonb) into entries from (
    select c.id, c.created_at, to_jsonb(c) || jsonb_build_object('email', u.email,
      'course_year_section', p.course_year_section) as entry
    from public.profile_change_requests c join auth.users u on u.id = c.student_id
      join public.profiles p on p.id = c.student_id
    where c.status = p_status and (c.full_name ilike '%' || left(coalesce(p_search, ''), 100) || '%'
      or c.previous_full_name ilike '%' || left(coalesce(p_search, ''), 100) || '%'
      or u.email ilike '%' || left(coalesce(p_search, ''), 100) || '%')
    order by c.created_at, c.id limit 12 offset p_offset
  ) page;
  return jsonb_build_object('entries', entries, 'total', total_count);
end;
$$;

-- Pending and historical proposal photos remain private and cannot be removed
-- through unused-upload cleanup. Existing public-photo rules still expose only profiles.photo_path.
drop policy profile_photo_delete on storage.objects;
create policy profile_photo_delete on storage.objects for delete to authenticated using (
  bucket_id = 'profile-photos' and owner_id = (select auth.uid())::text
  and not exists (select 1 from public.profiles where id = auth.uid() and photo_path = name)
  and not exists (select 1 from public.profile_change_requests where student_id = auth.uid()
    and (photo_path = name or previous_photo_path = name))
);

revoke execute on function public.submit_profile_change(text,text,text,text,text),
  public.review_profile_change(uuid,text,text), public.profile_change_queue(text,text,integer) from public, anon;
grant execute on function public.submit_profile_change(text,text,text,text,text),
  public.review_profile_change(uuid,text,text), public.profile_change_queue(text,text,integer) to authenticated;

commit;
