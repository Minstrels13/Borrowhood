begin;

create function public.item_availability(p_item uuid)
returns table(start_date date, end_date date)
language sql stable security definer set search_path = ''
as $$
  select r.start_date, r.end_date from public.requests r
  join public.items i on i.id = r.item_id
  where r.item_id = p_item and i.is_active and i.deleted_at is null
    and r.status in ('approved', 'handed_over')
  order by r.start_date;
$$;
comment on function public.item_availability(uuid) is
  'Public calendar projection: reserved dates only for published items, never request IDs, identities or messages.';

create function public.item_available(p_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.items i where i.id = p_item and i.is_active and i.deleted_at is null
    and not exists (
      select 1 from public.requests r where r.item_id = i.id
        and r.status in ('approved', 'handed_over')
        and (now() at time zone 'Asia/Manila')::date between r.start_date and r.end_date
    )
  );
$$;
comment on function public.item_available(uuid) is
  'Returns only whether an active listing is unreserved today in Manila; overdue does not extend the agreed booking range.';

create function public.available_now(p_item public.items)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select public.item_available((p_item).id);
$$;
comment on function public.available_now(public.items) is
  'PostgREST computed listing field keeps card availability labels consistent with the Manila-today filter without fetching private requests.';

create function public.available_items()
returns setof public.items
language sql stable security invoker set search_path = ''
as $$
  select i.* from public.items i where public.item_available(i.id);
$$;
comment on function public.available_items() is
  'Availability-aware shelf source retains item RLS and PostgREST filtering/count/pagination.';

create function public.create_request(p_item uuid, p_start date, p_end date, p_message text default '')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  listing public.items;
  saved_id uuid;
  today date := (now() at time zone 'Asia/Manila')::date;
begin
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
comment on function public.create_request(uuid, date, date, text) is
  'Verified non-owner creation locks/rechecks listing, inclusive Manila dates, duration and reservations. IDs/status/reference/timestamps come from the database.';

create function public.transition_request(p_request uuid, p_action text, p_values jsonb default '{}'::jsonb)
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
comment on function public.transition_request(uuid, text, jsonb) is
  'Locked actor/state transitions only. Dates and identities cannot be edited by browser callers; owner condition events are recorded once with owned request-specific photos.';

create function public.request_detail(p_request uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select to_jsonb(r) || jsonb_build_object(
    'item', jsonb_build_object('id', i.id, 'title', i.title, 'listing_type', i.listing_type,
      'price_label', i.price_label, 'meetup_note', i.meetup_note, 'deleted_at', i.deleted_at),
    'owner', jsonb_build_object('id', o.id, 'full_name', o.full_name,
      'course_year_section', o.course_year_section, 'photo_path', o.photo_path),
    'borrower', jsonb_build_object('id', b.id, 'full_name', b.full_name,
      'course_year_section', b.course_year_section, 'photo_path', b.photo_path)
  ) from public.requests r
  join public.items i on i.id = r.item_id
  join public.profiles o on o.id = r.owner_id
  join public.profiles b on b.id = r.borrower_id
  where r.id = p_request and auth.uid() in (r.owner_id, r.borrower_id)
    and public.is_verified();
$$;
comment on function public.request_detail(uuid) is
  'Verified participants get request, item and meetup identities/course only; no email or private verification fields, even for an administrator.';

create function public.guard_item_deletion()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (new.deleted_at is not null or not new.is_active) and exists (
    select 1 from public.requests where item_id = old.id
      and status in ('requested', 'approved', 'handed_over')
  ) then
    raise exception 'Complete or close active requests before hiding or deleting this listing.';
  end if;
  return new;
end;
$$;
comment on function public.guard_item_deletion() is
  'Active requests include requested, approved and handed_over. Soft deletion/visibility changes retain history and cannot strand an active loan.';
create trigger item_active_request_guard before update of deleted_at, is_active on public.items
for each row execute function public.guard_item_deletion();

revoke execute on function public.item_availability(uuid), public.item_available(uuid), public.available_now(public.items),
  public.available_items(), public.create_request(uuid, date, date, text),
  public.transition_request(uuid, text, jsonb), public.request_detail(uuid),
  public.guard_item_deletion() from public, anon, authenticated;
grant execute on function public.item_availability(uuid), public.item_available(uuid), public.available_now(public.items),
  public.available_items() to anon, authenticated;
grant execute on function public.create_request(uuid, date, date, text),
  public.transition_request(uuid, text, jsonb), public.request_detail(uuid) to authenticated;

commit;
