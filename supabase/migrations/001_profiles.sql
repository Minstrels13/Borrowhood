begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  course_year_section text not null check (char_length(trim(course_year_section)) between 2 and 100),
  photo_path text,
  role text not null default 'student' check (role in ('student', 'admin')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approved_profile_complete check (verification_status <> 'approved' or (photo_path is not null and submitted_at is not null)),
  constraint rejected_profile_reason check (verification_status <> 'rejected' or char_length(trim(rejection_reason)) > 0)
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;

grant select (id, full_name, course_year_section, photo_path, role, verification_status,
 submitted_at, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at) on public.profiles to authenticated;

create function public.guard_student_email() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) !~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$' or new.email is null then
    raise exception 'Use your @ms.bulsu.edu.ph student email.';
  end if;
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    raise exception 'Student email cannot be changed.';
  end if;
  return new;
end;
$$;
comment on function public.guard_student_email() is 'Enforces BulSU emails and immutable account email, including direct Auth API calls.';

create trigger borrowhood_email_guard before insert or update of email on auth.users
for each row execute function public.guard_student_email();

create function public.create_student_profile() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, course_year_section)
  values (new.id, trim(new.raw_user_meta_data->>'full_name'), trim(new.raw_user_meta_data->>'course_year_section'));
  return new;
end;
$$;
comment on function public.create_student_profile() is 'Creates a pending student profile; metadata cannot assign privileges.';

create trigger borrowhood_profile_created after insert on auth.users
for each row execute function public.create_student_profile();

revoke execute on function public.guard_student_email(), public.create_student_profile() from public, anon, authenticated;

commit;
