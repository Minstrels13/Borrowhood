-- Approved P2 Reports, slice 2. Apply once after 045. Never expands request/Storage access.
begin;

-- Internal locking only; no browser execution. Callers check role before invoking.
create function public.lock_report(p_report uuid)
returns public.reports language plpgsql security definer set search_path = '' as $$
declare target record; result public.reports;
begin
  select r.request_id, q.item_id into target from public.reports r
    join public.requests q on q.id = r.request_id where r.id = p_report;
  if not found then raise exception 'BH_P2_UNAVAILABLE'; end if;
  perform 1 from public.items where id = target.item_id for update;
  perform 1 from public.requests where id = target.request_id for update;
  select * into result from public.reports where id = p_report for update;
  if not found then raise exception 'BH_P2_UNAVAILABLE'; end if;
  return result;
end;
$$;
revoke execute on function public.lock_report(uuid) from public, anon, authenticated;

create function public.respond_report(p_report uuid, p_response text, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare report public.reports; response text := public.report_trim(p_response);
begin
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

create function public.start_report_review(p_report uuid, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare report public.reports;
begin
  if not public.is_admin() then raise exception 'BH_P2_FORBIDDEN'; end if;
  report := public.lock_report(p_report);
  if auth.uid() in (report.reporter_id, report.borrower_id) then raise exception 'BH_P2_SELF_REVIEW'; end if;
  if report.version is distinct from p_expected_version or report.status <> 'open' then
    raise exception 'BH_P2_STALE';
  end if;
  update public.reports set status = 'reviewing', reviewed_by = auth.uid(), reviewing_at = clock_timestamp(),
    updated_at = clock_timestamp(), version = version + 1 where id = report.id;
  return jsonb_build_object('id', report.id, 'version', report.version + 1);
end;
$$;

create function public.resolve_report(p_report uuid, p_outcome text, p_note text, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare report public.reports; note text := public.report_trim(p_note);
begin
  if not public.is_admin() then raise exception 'BH_P2_FORBIDDEN'; end if;
  report := public.lock_report(p_report);
  if auth.uid() in (report.reporter_id, report.borrower_id) then raise exception 'BH_P2_SELF_REVIEW'; end if;
  if report.version is distinct from p_expected_version or report.status <> 'reviewing' then
    raise exception 'BH_P2_STALE';
  end if;
  if p_outcome is null or p_outcome not in ('settled', 'upheld', 'dismissed')
    or char_length(note) not between 1 and 1000 then raise exception 'BH_P2_VALIDATION'; end if;
  if p_outcome = 'settled' and not exists (select 1 from public.requests
    where id = report.request_id and status = 'returned') then raise exception 'BH_P2_NOT_SETTLED'; end if;
  update public.reports set status = 'resolved', outcome = p_outcome, resolution_note = note,
    resolved_by = auth.uid(), resolved_at = clock_timestamp(), updated_at = clock_timestamp(),
    version = version + 1 where id = report.id;
  return jsonb_build_object('id', report.id, 'version', report.version + 1);
end;
$$;

create function public.admin_report_detail(p_report uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'BH_P2_FORBIDDEN'; end if;
  -- Explicit allowlist. Never serialize a request/profile or disclose evidence/media/return state.
  return (select jsonb_build_object(
    'id', r.id, 'reason', r.reason, 'details', r.details, 'status', r.status,
    'borrower_response', r.borrower_response, 'responded_at', r.responded_at,
    'reviewing_at', r.reviewing_at, 'outcome', r.outcome, 'resolution_note', r.resolution_note,
    'resolved_at', r.resolved_at, 'created_at', r.created_at, 'updated_at', r.updated_at, 'version', r.version,
    'reference', q.reference, 'item', jsonb_build_object('id', i.id, 'title', i.title), 'due_date', q.end_date,
    'owner', jsonb_build_object('name', owner.full_name, 'course_year_section', owner.course_year_section, 'email', ou.email),
    'borrower', jsonb_build_object('name', borrower.full_name, 'course_year_section', borrower.course_year_section, 'email', bu.email),
    'can_review', r.status = 'open' and auth.uid() not in (r.reporter_id, r.borrower_id),
    'can_resolve', r.status = 'reviewing' and auth.uid() not in (r.reporter_id, r.borrower_id),
    'self_review', auth.uid() in (r.reporter_id, r.borrower_id))
    from public.reports r join public.requests q on q.id = r.request_id join public.items i on i.id = q.item_id
    join public.profiles owner on owner.id = r.reporter_id join auth.users ou on ou.id = owner.id
    join public.profiles borrower on borrower.id = r.borrower_id join auth.users bu on bu.id = borrower.id
    where r.id = p_report);
end;
$$;

create function public.admin_reports(p_status text, p_search text default '', p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare entries jsonb; total_count bigint; totals jsonb; search text := public.report_trim(p_search);
begin
  if not public.is_admin() then raise exception 'BH_P2_FORBIDDEN'; end if;
  if p_status is null or p_status not in ('open', 'reviewing', 'resolved') or char_length(search) > 100
    or p_offset is null or p_offset < 0 or p_offset > 100000 then raise exception 'BH_P2_VALIDATION'; end if;
  -- strpos is literal substring search: %, _ and backslash are never wildcards.
  select count(*) into total_count from public.reports r join public.requests q on q.id = r.request_id
    join public.items i on i.id = q.item_id where r.status = p_status
    and (search = '' or strpos(lower(q.reference), lower(search)) > 0 or strpos(lower(i.title), lower(search)) > 0);
  select jsonb_build_object('open', count(*) filter (where r.status = 'open'),
    'reviewing', count(*) filter (where r.status = 'reviewing'), 'resolved', count(*) filter (where r.status = 'resolved'))
    into totals from public.reports r join public.requests q on q.id = r.request_id join public.items i on i.id = q.item_id
    where search = '' or strpos(lower(q.reference), lower(search)) > 0 or strpos(lower(i.title), lower(search)) > 0;
  select coalesce(jsonb_agg(entry order by created_at, id), '[]'::jsonb) into entries from (
    select r.created_at, r.id, jsonb_build_object('id', r.id, 'reference', q.reference,
      'item_title', i.title, 'owner_name', owner.full_name, 'borrower_name', borrower.full_name,
      'reason', r.reason, 'due_date', q.end_date, 'status', r.status, 'created_at', r.created_at) as entry
    from public.reports r join public.requests q on q.id = r.request_id join public.items i on i.id = q.item_id
    join public.profiles owner on owner.id = r.reporter_id join public.profiles borrower on borrower.id = r.borrower_id
    where r.status = p_status and (search = '' or strpos(lower(q.reference), lower(search)) > 0
      or strpos(lower(i.title), lower(search)) > 0)
    order by r.created_at, r.id limit 12 offset p_offset
  ) page;
  return jsonb_build_object('entries', entries, 'total', total_count, 'status_totals', totals);
end;
$$;
comment on function public.admin_report_detail(uuid) is
  'Admin-only report/student contact/item/due-date allowlist; no private request lifecycle, messages, notes, photos, paths or trust. Participant admins read but cannot moderate.';
comment on function public.resolve_report(uuid,text,text,integer) is
  'Locked nonparticipant admin resolution only. Shared note; settled checks confirmed return internally. No loan/trust/account mutation or reopen.';
revoke execute on function public.respond_report(uuid,text,integer), public.start_report_review(uuid,integer),
  public.resolve_report(uuid,text,text,integer), public.admin_report_detail(uuid), public.admin_reports(text,text,integer)
  from public, anon, authenticated;
grant execute on function public.respond_report(uuid,text,integer), public.start_report_review(uuid,integer),
  public.resolve_report(uuid,text,text,integer), public.admin_report_detail(uuid), public.admin_reports(text,text,integer)
  to authenticated;

commit;
