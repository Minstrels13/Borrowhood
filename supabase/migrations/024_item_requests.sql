begin;

create index requests_item_order on public.requests(item_id, reference_number desc);

create function public.item_requests(p_item uuid, p_status text default 'requested', p_offset integer default 0)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  listing public.items;
  entries jsonb;
  total_count bigint;
  pending_count bigint;
begin
  if not public.is_verified() then
    raise exception 'Complete verification before viewing requests.';
  end if;
  select * into listing from public.items where id = p_item and owner_id = auth.uid();
  if not found then
    raise exception 'Only the item owner can view these requests.';
  end if;
  if p_status is null or p_status not in ('requested', 'all') or p_offset is null or p_offset < 0 then
    raise exception 'Choose a valid request filter and offset.';
  end if;
  select count(*) into total_count from public.requests r
    where r.item_id = p_item and (p_status = 'all' or r.status = p_status);
  select count(*) into pending_count from public.requests r
    where r.item_id = p_item and r.status = 'requested';
  select coalesce(jsonb_agg(entry order by reference_number desc), '[]'::jsonb) into entries
  from (
    select r.reference_number, to_jsonb(r) || jsonb_build_object(
      'borrower', jsonb_build_object('id', b.id, 'full_name', b.full_name, 'photo_path', b.photo_path),
      'item', jsonb_build_object('id', listing.id, 'title', listing.title)
    ) as entry
    from public.requests r join public.profiles b on b.id = r.borrower_id
    where r.item_id = p_item and (p_status = 'all' or r.status = p_status)
    order by r.reference_number desc limit 12 offset p_offset
  ) page;
  return jsonb_build_object('item', jsonb_build_object('id', listing.id, 'title', listing.title),
    'requests', entries, 'total', total_count, 'pending_count', pending_count);
end;
$$;
comment on function public.item_requests(uuid, text, integer) is
  'Verified item owner only: paginated requests and borrower name/photo, with no email or private verification fields. Retains access to history for hidden listings.';
revoke execute on function public.item_requests(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.item_requests(uuid, text, integer) to authenticated;

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
comment on function public.transition_request(uuid, text, jsonb) is
  'Locked participant transitions. Approval atomically declines overlapping pending requests using inclusive dates; condition events require owned request-specific photos.';

commit;
