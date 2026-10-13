begin;

-- Storage policies cannot read auth.users directly as an authenticated role.
create function public.has_confirmed_email()
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and email_confirmed_at is not null
      and lower(email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$'
  );
$$;
comment on function public.has_confirmed_email() is 'Checks email confirmation without granting clients access to auth.users.';

create function public.is_admin()
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid()
      and p.role = 'admin'
      and u.email_confirmed_at is not null
      and lower(u.email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$'
  );
$$;
comment on function public.is_admin() is 'Checks the protected admin role and confirmed Auth email.';

create function public.is_verified()
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid()
      and p.verification_status = 'approved'
      and p.photo_path is not null
      and p.submitted_at is not null
      and u.email_confirmed_at is not null
      and lower(u.email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$'
  );
$$;
comment on function public.is_verified() is 'Requires email confirmation, photo, submission, and admin approval.';

create policy profiles_read_self_or_admin on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));
comment on policy profiles_read_self_or_admin on public.profiles is 'Private profile fields are readable only by their owner or a confirmed admin.';

-- No write policies or grants: all changes go through these narrow functions.
create function public.save_my_profile(p_full_name text, p_course text, p_photo_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  select * into result from public.profiles where id = auth.uid() for update;
  if auth.uid() is null then
    raise exception 'Log in to update your details.';
  end if;
  if not exists (select 1 from auth.users where id = auth.uid()
    and lower(email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$') then
    raise exception 'Use your @ms.bulsu.edu.ph student email.';
  end if;
  if p_photo_path is not null and not exists (
    select 1 from storage.objects where bucket_id = 'profile-photos' and name = p_photo_path
    and owner_id = auth.uid()::text and split_part(name, '/', 1) = auth.uid()::text
  ) then
    raise exception 'Upload your own profile photo first.';
  end if;
  -- Preserved Auth accounts from a disposable reset may not have a profile yet.
  if result.id is null then
    insert into public.profiles(id, full_name, course_year_section, photo_path)
    values (auth.uid(), trim(p_full_name), trim(p_course), p_photo_path);
    return;
  end if;
  if result.photo_path is not null and p_photo_path is null then
    raise exception 'A profile photo is required.';
  end if;
  update public.profiles set full_name = trim(p_full_name), course_year_section = trim(p_course),
    photo_path = p_photo_path, updated_at = now(),
    submitted_at = case when verification_status = 'approved' then submitted_at else null end
  where id = auth.uid() returning * into result;
end;
$$;
comment on function public.save_my_profile(text, text, text) is 'Edits only the caller name, course and owned photo; approval is retained, other edits need resubmission.';

create function public.submit_my_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  select * into result from public.profiles where id = auth.uid() for update;
  if not found or result.verification_status = 'approved' then
    raise exception 'This account cannot be submitted.';
  end if;
  if not public.has_confirmed_email() or result.photo_path is null then
    raise exception 'Confirm your email and add your photo first.';
  end if;
  update public.profiles set verification_status = 'pending', submitted_at = now(), updated_at = now(),
    rejection_reason = null, reviewer_note = null, reviewed_by = null, reviewed_at = null
  where id = auth.uid() returning * into result;
end;
$$;
comment on function public.submit_my_profile() is 'Confirmed students with a photo can submit or resubmit; clears the previous review.';

-- Lock the profile so concurrent approval/correction cannot approve stale details.
create function public.review_student(
  p_id uuid,
  p_decision text,
  p_reason text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  student public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;
  if p_id = auth.uid() then
    raise exception 'You cannot review yourself.';
  end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision.';
  end if;
  select * into student from public.profiles where id = p_id for update;
  if not found or student.verification_status <> 'pending' then
    raise exception 'Refresh the queue; this student is no longer pending.';
  end if;
  if p_decision = 'approved' and (student.submitted_at is null or student.photo_path is null or not exists (
    select 1 from auth.users where id = p_id and email_confirmed_at is not null
    and lower(email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$'
  )) then
    raise exception 'Email, photo and submission must be complete before approval.';
  end if;
  if p_decision = 'rejected' and coalesce(char_length(trim(p_reason)), 0) not between 1 and 1000 then
    raise exception 'Enter a rejection reason (up to 1000 characters).';
  end if;
  if char_length(p_note) > 1000 then
    raise exception 'Keep the note under 1000 characters.';
  end if;
  update public.profiles set verification_status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(),
    updated_at = now(), rejection_reason = case when p_decision = 'rejected' then trim(p_reason) else null end,
    reviewer_note = nullif(trim(p_note), '') where id = p_id;
end;
$$;
comment on function public.review_student(uuid, text, text, text) is 'Only confirmed admins review pending students; approval checks all onboarding prerequisites.';

create function public.verification_queue(
  p_status text,
  p_search text default '',
  p_offset integer default 0
)
returns table(
  id uuid,
  full_name text,
  course_year_section text,
  photo_path text,
  email text,
  email_confirmed boolean,
  submitted_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
language plpgsql stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;
  return query
  select
    p.id,
    p.full_name,
    p.course_year_section,
    p.photo_path,
    u.email::text,
    u.email_confirmed_at is not null,
    p.submitted_at,
    p.created_at,
    count(*) over()
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.verification_status = p_status
    and p.role = 'student'
    and (
      p.full_name ilike '%' || left(p_search, 100) || '%'
      or u.email ilike '%' || left(p_search, 100) || '%'
    )
  order by p.created_at, p.id
  limit 12
  offset greatest(0, p_offset);
end;
$$;
comment on function public.verification_queue(text, text, integer) is 'Admin-only searched queue, twelve real profiles per page with filtered total count.';

revoke execute on function
  public.has_confirmed_email(),
  public.is_admin(),
  public.is_verified(),
  public.save_my_profile(text, text, text),
  public.submit_my_profile(),
  public.review_student(uuid, text, text, text),
  public.verification_queue(text, text, integer)
from public, anon;

grant execute on function
  public.has_confirmed_email(),
  public.is_admin(),
  public.is_verified(),
  public.save_my_profile(text, text, text),
  public.submit_my_profile(),
  public.review_student(uuid, text, text, text),
  public.verification_queue(text, text, integer)
to authenticated;

commit;
