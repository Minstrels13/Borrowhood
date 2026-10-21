-- Approved P2 Reports, slice 1. Apply once after 044; no P1 access/trust changes.
begin;

-- Match JavaScript String.trim (including Unicode whitespace) at the database boundary.
create function public.report_trim(p_value text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select btrim(coalesce(p_value, ''), E' \t\n\r\f' || chr(11) || chr(160) || chr(5760)
    || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197)
    || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232)
    || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279));
$$;
revoke execute on function public.report_trim(text) from public, anon, authenticated;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id),
  reporter_id uuid not null references public.profiles(id),
  borrower_id uuid not null references public.profiles(id),
  reason text not null check (reason in ('not_returned', 'cannot_reach_borrower', 'other')),
  details text not null default '' check (char_length(details) <= 1500 and details = public.report_trim(details)),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved')),
  borrower_response text,
  responded_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewing_at timestamptz,
  outcome text check (outcome in ('settled', 'upheld', 'dismissed')),
  resolution_note text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  version integer not null default 1 check (version > 0),
  constraint reports_one_per_request unique (request_id),
  check (reporter_id <> borrower_id),
  check (reason <> 'other' or char_length(details) > 0),
  check ((borrower_response is null and responded_at is null) or
    (borrower_response is not null and responded_at is not null
      and char_length(borrower_response) between 1 and 1500
      and borrower_response = public.report_trim(borrower_response))),
  check ((status = 'open' and reviewed_by is null and reviewing_at is null) or
    (status in ('reviewing', 'resolved') and reviewed_by is not null and reviewing_at is not null)),
  check ((status <> 'resolved' and outcome is null and resolution_note is null
      and resolved_by is null and resolved_at is null) or
    (status = 'resolved' and outcome is not null and resolution_note is not null
      and resolved_by is not null and resolved_at is not null
      and char_length(resolution_note) between 1 and 1000
      and resolution_note = public.report_trim(resolution_note))),
  check (reviewed_by is null or reviewed_by not in (reporter_id, borrower_id)),
  check (resolved_by is null or resolved_by not in (reporter_id, borrower_id))
);
create index reports_queue_order on public.reports(status, created_at, id);
create index reports_reporter_order on public.reports(reporter_id, created_at desc, id desc);
create index reports_borrower_order on public.reports(borrower_id, created_at desc, id desc);
alter table public.reports enable row level security;
revoke all on public.reports from public, anon, authenticated;
grant select on public.reports to authenticated;
create policy reports_read_participant_or_admin on public.reports for select to authenticated
  using ((select public.is_admin()) or
    ((select public.is_verified()) and (select auth.uid()) in (reporter_id, borrower_id)));
comment on table public.reports is
  'Retained overdue-owner reports only. No private admin/evidence fields or trust effects. All browser writes use checked functions.';

create function public.file_report(p_request uuid, p_reason text, p_details text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  loan public.requests;
  listing public.items;
  listing_id uuid;
  saved public.reports;
  details text := public.report_trim(p_details);
begin
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

create function public.report_for_request(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare loan public.requests; report public.reports;
begin
  if not public.is_verified() then raise exception 'BH_P2_FORBIDDEN'; end if;
  select * into loan from public.requests where id = p_request and auth.uid() in (owner_id, borrower_id);
  if not found then raise exception 'BH_P2_UNAVAILABLE'; end if;
  select * into report from public.reports where request_id = loan.id;
  return jsonb_build_object('can_file', report.id is null and loan.owner_id = auth.uid()
    and loan.status = 'handed_over' and loan.end_date < (now() at time zone 'Asia/Manila')::date,
    'report', case when report.id is null then null else jsonb_build_object(
      'id', report.id, 'reason', report.reason, 'details', report.details, 'status', report.status,
      'borrower_response', report.borrower_response, 'responded_at', report.responded_at,
      'reviewing_at', report.reviewing_at, 'outcome', report.outcome,
      'resolution_note', report.resolution_note, 'resolved_at', report.resolved_at,
      'created_at', report.created_at, 'updated_at', report.updated_at, 'version', report.version) end);
end;
$$;
comment on function public.report_for_request(uuid) is
  'Verified actual request participants only. An unrelated admin cannot use this participant read. Failure is distinct from no report.';
revoke execute on function public.file_report(uuid,text,text), public.report_for_request(uuid)
  from public, anon, authenticated;
grant execute on function public.file_report(uuid,text,text), public.report_for_request(uuid) to authenticated;

commit;
