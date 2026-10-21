-- Admin profile reads and explicit student-write separation. Apply once after 046.
-- Source only: do not apply to hosted data from this task.
begin;

-- Preserve the existing projection/business rules from 030_profile_history.sql; change caller access only.
create or replace function public.student_profile(p_user uuid)
  returns jsonb
  language plpgsql stable security definer set search_path = ''
  as $$
  begin
    if not (public.is_admin() or public.is_verified()) then raise exception 'Verified students or admins only.'; end if;
    return (select jsonb_build_object('id', p.id, 'full_name', p.full_name,
      'course_year_section', p.course_year_section, 'photo_path', p.photo_path,
      'created_at', p.created_at, 'trust', public.trust_totals(p.id))
      from public.profiles p join auth.users u on u.id = p.id
      where p.id = p_user and p.verification_status = 'approved' and p.photo_path is not null
        and p.submitted_at is not null and u.email_confirmed_at is not null
        and lower(u.email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$');
  end;
  $$;

-- Preserve the existing projection/business rules from 011_item_access.sql; change caller access only.
create or replace function public.save_item(p_id uuid, p_values jsonb, p_photos text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  item_owner uuid;
begin
  -- Role is independent of verification; even an approved admin cannot act as a student.
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin accounts cannot use student actions.' using errcode = '42501';
  end if;
  if not public.is_verified() then
    raise exception 'Complete verification before posting or editing items.';
  end if;

  if p_photos is null or cardinality(p_photos) > 3 then
    raise exception 'Choose up to three photos.';
  end if;
  if (select count(distinct path) from unnest(p_photos) as paths(path)) <> cardinality(p_photos) then
    raise exception 'Choose different photos for each position.';
  end if;

  if p_id is not null then
    select owner_id into item_owner from public.items
    where id = p_id and deleted_at is null for update;
    if not found or item_owner <> auth.uid() then
      raise exception 'Only the owner can edit this listing.';
    end if;
  end if;

  if exists (
    select 1 from unnest(p_photos) as paths(path)
    where not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'item-photos' and o.name = path
        and o.owner_id = auth.uid()::text
        and split_part(o.name, '/', 1) = auth.uid()::text
    )
    or exists (
      select 1 from public.item_photos ip
      where ip.storage_path = path and (p_id is null or ip.item_id <> p_id)
    )
  ) then
    raise exception 'Upload your own photos; a photo cannot belong to two listings.';
  end if;

  if p_id is null then
    insert into public.items (
      owner_id, title, category, description, condition_note,
      listing_type, price_label, max_borrow_days, meetup_note
    ) values (
      auth.uid(), trim(p_values->>'title'), p_values->>'category',
      coalesce(trim(p_values->>'description'), ''), trim(p_values->>'condition_note'),
      p_values->>'listing_type',
      case when p_values->>'listing_type' = 'rent' then trim(p_values->>'price_label') else null end,
      (p_values->>'max_borrow_days')::integer, coalesce(trim(p_values->>'meetup_note'), '')
    ) returning id into saved_id;
  else
    saved_id := p_id;
    update public.items set
      title = trim(p_values->>'title'),
      category = p_values->>'category',
      description = coalesce(trim(p_values->>'description'), ''),
      condition_note = trim(p_values->>'condition_note'),
      listing_type = p_values->>'listing_type',
      price_label = case when p_values->>'listing_type' = 'rent' then trim(p_values->>'price_label') else null end,
      max_borrow_days = (p_values->>'max_borrow_days')::integer,
      meetup_note = coalesce(trim(p_values->>'meetup_note'), ''),
      updated_at = now()
    where id = saved_id;
    delete from public.item_photos where item_id = saved_id;
  end if;

  insert into public.item_photos(item_id, storage_path, position)
  select saved_id, path, ordinal::integer
  from unnest(p_photos) with ordinality as paths(path, ordinal);
  return saved_id;
end;
$$;

-- Preserve the existing projection/business rules from 021_request_access.sql; change caller access only.
create or replace function public.create_request(p_item uuid, p_start date, p_end date, p_message text default '')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  listing public.items;
  saved_id uuid;
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  -- Role is independent of verification; even an approved admin cannot act as a student.
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin accounts cannot use student actions.' using errcode = '42501';
  end if;
  if not public.is_verified() then
    raise exception 'Complete verification before requesting an item.';
  end if;
  select * into listing from public.items where id = p_item for update;
  if not found or not listing.is_active or listing.deleted_at is not null then
    raise exception 'This item is unavailable.';
  end if;
  if listing.owner_id = auth.uid() then
    raise exception 'You cannot borrow your own item.';
  end if;
  if p_start is null or p_end is null or not isfinite(p_start) or not isfinite(p_end)
    or p_start < today or p_end < p_start then
    raise exception 'Choose valid dates starting today or later.';
  end if;
  if p_end - p_start + 1 > listing.max_borrow_days then
    raise exception 'These dates exceed the listing maximum borrow length.';
  end if;
  if exists (
    select 1 from public.requests where item_id = p_item
    and status in ('approved', 'handed_over')
    and daterange(start_date, end_date, '[]') && daterange(p_start, p_end, '[]')
  ) then
    raise exception 'These dates are unavailable. Choose another range.';
  end if;
  insert into public.requests(item_id, owner_id, borrower_id, start_date, end_date, message)
  values (p_item, listing.owner_id, auth.uid(), p_start, p_end, coalesce(trim(p_message), ''))
  returning id into saved_id;
  return saved_id;
end;
$$;

-- Preserve the existing projection/business rules from 024_item_requests.sql; change caller access only.
create or replace function public.transition_request(p_request uuid, p_action text, p_values jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  loan public.requests;
  listing public.items;
  listing_id uuid;
  photo text := nullif(p_values->>'photo_path', '');
  notes text := coalesce(trim(p_values->>'notes'), '');
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  -- Role is independent of verification; even an approved admin cannot act as a student.
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin accounts cannot use student actions.' using errcode = '42501';
  end if;
  if not public.is_verified() then
    raise exception 'Complete verification before changing a request.';
  end if;
  select item_id into listing_id from public.requests where id = p_request
    and auth.uid() in (owner_id, borrower_id);
  if not found then
    raise exception 'Request unavailable.';
  end if;
  -- Every action locks the listing before the request, serializing approvals and deletion.
  select * into listing from public.items where id = listing_id for update;
  select * into loan from public.requests where id = p_request for update;

  if p_action = 'cancel' then
    if auth.uid() <> loan.borrower_id or loan.status not in ('requested', 'approved') then
      raise exception 'Only the borrower can cancel a requested or approved loan.';
    end if;
    update public.requests set status = 'cancelled', cancelled_at = now(),
      cancel_reason = notes, updated_at = now() where id = p_request;
    return;
  end if;
  if auth.uid() <> loan.owner_id then
    raise exception 'Only the owner can perform this action.';
  end if;

  if p_action = 'approve' then
    if loan.status <> 'requested' then
      raise exception 'Only a requested loan can be approved.';
    end if;
    if not listing.is_active or listing.deleted_at is not null then
      raise exception 'This item is unavailable.';
    end if;
    if loan.start_date < today or loan.end_date - loan.start_date + 1 > listing.max_borrow_days then
      raise exception 'The dates are stale or exceed the current maximum. Decline and ask for a new request.';
    end if;
    update public.requests set status = 'approved', approved_at = now(), updated_at = now()
    where id = p_request;
    update public.requests set status = 'declined', declined_at = now(), updated_at = now(),
      decline_reason = 'This item is no longer available for your selected dates because another request was approved.',
      decline_note = ''
    where item_id = loan.item_id and id <> loan.id and status = 'requested'
      and daterange(start_date, end_date, '[]') && daterange(loan.start_date, loan.end_date, '[]');
  elsif p_action = 'decline' then
    if loan.status <> 'requested' then
      raise exception 'Only a requested loan can be declined.';
    end if;
    if coalesce(trim(p_values->>'reason'), '') = '' then
      raise exception 'Enter a reason for declining.';
    end if;
    update public.requests set status = 'declined', declined_at = now(),
      decline_reason = trim(p_values->>'reason'), decline_note = notes, updated_at = now()
    where id = p_request;
  elsif p_action in ('handover', 'return') then
    if (p_action = 'handover' and loan.status <> 'approved')
      or (p_action = 'return' and loan.status <> 'handed_over') then
      raise exception 'The request changed. Refresh it before trying again.';
    end if;
    if photo is not null and not exists (
      select 1 from storage.objects o where o.bucket_id = 'condition-photos' and o.name = photo
        and o.owner_id = auth.uid()::text
        and split_part(o.name, '/', 1) = auth.uid()::text
        and split_part(o.name, '/', 2) = p_request::text
        and split_part(o.name, '/', 3) = p_action
    ) then
      raise exception 'Upload your own photo for this request and event.';
    end if;
    if p_action = 'handover' then
      if notes = '' or coalesce((p_values->>'confirmed')::boolean, false) is not true then
        raise exception 'Add condition notes and confirm the item was handed over in person.';
      end if;
      update public.requests set status = 'handed_over', handed_over_at = now(),
        handover_notes = notes, handover_photo_path = photo, updated_at = now()
      where id = p_request;
    else
      if coalesce(p_values->>'condition', '') not in ('good', 'minor_wear', 'damaged') then
        raise exception 'Choose the return condition.';
      end if;
      update public.requests set status = 'returned', returned_at = now(),
        return_condition = p_values->>'condition', return_notes = notes,
        return_photo_path = photo, updated_at = now() where id = p_request;
    end if;
  else
    raise exception 'Unknown request action.';
  end if;
exception
  when exclusion_violation then
    raise exception 'These dates were reserved by another request. Decline this request or choose different dates.';
end;
$$;

-- Preserve the existing projection/business rules from 042_delete_listing_decline_pending.sql; change caller access only.
create or replace function public.delete_item(p_item uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  listing public.items;
begin
  -- Role is independent of verification; even an approved admin cannot act as a student.
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin accounts cannot use student actions.' using errcode = '42501';
  end if;
  if not public.is_verified() then raise exception 'Complete verification first.'; end if;
  select * into listing from public.items where id = p_item for update;
  if not found or listing.owner_id <> auth.uid() or listing.deleted_at is not null then
    raise exception 'Only the owner can delete an existing listing.';
  end if;
  if exists (
    select 1 from public.requests where item_id = p_item and status in ('approved', 'handed_over')
  ) then
    raise exception 'Complete or cancel approved loans and confirm return of ongoing loans before deleting this listing.';
  end if;

  update public.requests
  set status = 'declined', decline_reason = 'Listing removed by owner.', decline_note = '',
    declined_at = now(), updated_at = now()
  where item_id = p_item and status = 'requested';

  update public.items set deleted_at = now(), is_active = false, updated_at = now()
  where id = p_item;
end;
$$;

-- Preserve the existing projection/business rules from 040_comments.sql; change caller access only.
create or replace function public.post_comment(p_item uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare saved uuid;
begin
  -- Role is independent of verification; even an approved admin cannot act as a student.
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin accounts cannot use student actions.' using errcode = '42501';
  end if;
  if not public.is_verified() then raise exception 'Complete verification before commenting.'; end if;
  perform 1 from public.items where id = p_item and is_active and deleted_at is null for update;
  if not found then raise exception 'This listing is unavailable.'; end if;
  if p_body is null or char_length(trim(p_body)) not between 1 and 1500 then
    raise exception 'Write a comment between 1 and 1500 characters.';
  end if;
  insert into public.comments(item_id, author_id, body) values (p_item, auth.uid(), trim(p_body)) returning id into saved;
  return saved;
end;
$$;

-- Preserve the existing projection/business rules from 044_profile_change_approval.sql; change caller access only.
create or replace function public.save_my_profile(p_full_name text, p_course text, p_photo_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  student public.profiles;
begin
  -- Role is independent of verification; even an approved admin cannot act as a student.
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin accounts cannot use student actions.' using errcode = '42501';
  end if;
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

-- Preserve the existing projection/business rules from 002_profile_access.sql; change caller access only.
create or replace function public.submit_my_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  -- Role is independent of verification; even an approved admin cannot act as a student.
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin accounts cannot use student actions.' using errcode = '42501';
  end if;
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

-- Preserve the existing projection/business rules from 044_profile_change_approval.sql; change caller access only.
create or replace function public.submit_profile_change(
  p_full_name text, p_photo_path text, p_course text, p_expected_name text, p_expected_photo text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  student public.profiles;
  saved_id uuid;
begin
  -- Role is independent of verification; even an approved admin cannot act as a student.
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin accounts cannot use student actions.' using errcode = '42501';
  end if;
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

-- Preserve the existing projection/business rules from 045_reports_core.sql; change caller access only.
create or replace function public.file_report(p_request uuid, p_reason text, p_details text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  loan public.requests;
  listing public.items;
  listing_id uuid;
  saved public.reports;
  details text := public.report_trim(p_details);
begin
  -- Role is independent of verification; even an approved admin cannot act as a student.
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin accounts cannot use student actions.' using errcode = '42501';
  end if;
  if not public.is_verified() then raise exception 'BH_P2_FORBIDDEN'; end if;
  select item_id into listing_id from public.requests where id = p_request and owner_id = auth.uid();
  if not found then raise exception 'BH_P2_UNAVAILABLE'; end if;
  -- Same item -> request lock order as transition_request. Time checked after waiting.
  select * into listing from public.items where id = listing_id for update;
  select * into loan from public.requests where id = p_request for update;
  if loan.id is null or loan.owner_id <> auth.uid() or listing.owner_id <> auth.uid() then
    raise exception 'BH_P2_UNAVAILABLE';
  end if;
  if exists (select 1 from public.reports where request_id = p_request) then
    raise exception 'BH_P2_DUPLICATE';
  end if;
  if loan.status <> 'handed_over' or loan.end_date >= (clock_timestamp() at time zone 'Asia/Manila')::date then
    raise exception 'BH_P2_NOT_OVERDUE';
  end if;
  if p_reason is null or p_reason not in ('not_returned', 'cannot_reach_borrower', 'other')
    or char_length(details) > 1500 or (p_reason = 'other' and details = '') then
    raise exception 'BH_P2_VALIDATION';
  end if;
  insert into public.reports(request_id, reporter_id, borrower_id, reason, details)
  values (loan.id, loan.owner_id, loan.borrower_id, p_reason, details) returning * into saved;
  return jsonb_build_object('id', saved.id, 'version', saved.version);
exception when unique_violation then
  raise exception 'BH_P2_DUPLICATE';
end;
$$;

-- Preserve the existing projection/business rules from 046_reports_review.sql; change caller access only.
create or replace function public.respond_report(p_report uuid, p_response text, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare report public.reports; response text := public.report_trim(p_response);
begin
  -- Role is independent of verification; even an approved admin cannot act as a student.
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin accounts cannot use student actions.' using errcode = '42501';
  end if;
  if not public.is_verified() then raise exception 'BH_P2_FORBIDDEN'; end if;
  -- Deny outsiders before acquiring unrelated loan locks.
  if not exists (select 1 from public.reports where id = p_report and borrower_id = auth.uid()) then
    raise exception 'BH_P2_UNAVAILABLE';
  end if;
  report := public.lock_report(p_report);
  if report.borrower_id <> auth.uid() then raise exception 'BH_P2_UNAVAILABLE'; end if;
  if report.version is distinct from p_expected_version or report.status <> 'open'
    or report.borrower_response is not null then raise exception 'BH_P2_STALE'; end if;
  if char_length(response) not between 1 and 1500 then raise exception 'BH_P2_VALIDATION'; end if;
  update public.reports set borrower_response = response, responded_at = clock_timestamp(),
    updated_at = clock_timestamp(), version = version + 1 where id = report.id;
  return jsonb_build_object('id', report.id, 'version', report.version + 1);
end;
$$;

comment on function public.student_profile(uuid) is
  'Verified students and confirmed admins receive the same verified profile/trust projection. No email, review metadata or private evidence. Verification semantics are unchanged.';
-- profile_history delegates to student_profile: its existing pagination, projection and
-- participant-only request IDs remain unchanged. trust_totals stays internal-only.
-- CREATE OR REPLACE preserves existing function ACLs; no new browser grants.

-- Make the upload predicate accurately reflect the separate student/admin roles too.
create or replace function public.can_upload_condition(p_path text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_verified() and not public.is_admin()
    and split_part(p_path, '/', 1) = auth.uid()::text
    and exists (
      select 1 from public.requests r where r.id::text = split_part(p_path, '/', 2)
        and r.owner_id = auth.uid() and (
          (split_part(p_path, '/', 3) = 'handover' and r.status = 'approved')
          or (split_part(p_path, '/', 3) = 'return' and r.status = 'handed_over')
        )
    );
$$;

-- Restrictive write-only overlays cannot grant access. Keep existing folder, owner,
-- verification, lifecycle and reference-protection policies, and every read policy.
-- Include unconfirmed admin-role accounts; onboarding/cleanup stays available to students.
create policy student_media_insert_admin_denial on storage.objects as restrictive
for insert to authenticated with check (
  bucket_id not in ('profile-photos', 'item-photos', 'condition-photos')
  or not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
create policy student_media_update_admin_denial on storage.objects as restrictive
for update to authenticated using (
  bucket_id not in ('profile-photos', 'item-photos', 'condition-photos')
  or not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
) with check (
  bucket_id not in ('profile-photos', 'item-photos', 'condition-photos')
  or not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
create policy student_media_delete_admin_denial on storage.objects as restrictive
for delete to authenticated using (
  bucket_id not in ('profile-photos', 'item-photos', 'condition-photos')
  or not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);

commit;
