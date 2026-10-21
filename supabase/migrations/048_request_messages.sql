-- Phase 3: private, refresh-only request threads. Apply once after 047; no backfill.
begin;

create table public.messages (
  id uuid primary key,
  request_id uuid not null references public.requests(id) on delete restrict,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (body = public.report_trim(body) and char_length(body) between 1 and 1000),
  created_at timestamptz not null default clock_timestamp()
);
create index messages_request_order on public.messages(request_id, created_at desc, id desc);
alter table public.messages enable row level security;
revoke all on public.messages from public, anon, authenticated;
grant select (id, request_id, sender_id, body, created_at) on public.messages to authenticated;
create policy messages_participant_read on public.messages for select to authenticated using (
  (select public.is_verified()) and not (select public.is_admin())
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student')
  and exists (select 1 from public.requests q where q.id = request_id
    and (select auth.uid()) in (q.owner_id, q.borrower_id))
);

-- Close the original M02 opening-message read paths to every admin, even a legacy participant.
create policy requests_no_admin_read on public.requests as restrictive for select to authenticated
using (not (select public.is_admin()) and exists (
  select 1 from public.profiles where id = (select auth.uid()) and role = 'student'
));

create function public.send_request_message(p_request uuid, p_body text, p_client_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  loan public.requests; saved public.messages; content text := public.report_trim(p_body);
  total bigint; sent_at timestamptz;
begin
  if not public.is_verified() or public.is_admin() or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'student'
  ) then raise exception 'BH_THREAD_FORBIDDEN'; end if;
  if p_request is null or p_client_id is null or p_body is null
    or char_length(content) not between 1 and 1000 then raise exception 'BH_THREAD_VALIDATION'; end if;
  select * into loan from public.requests where id = p_request
    and auth.uid() in (owner_id, borrower_id) for update;
  if not found then raise exception 'BH_THREAD_UNAVAILABLE'; end if;
  if not public.is_verified() or public.is_admin() or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'student'
  ) then raise exception 'BH_THREAD_FORBIDDEN'; end if;
  -- The request lock serializes both senders, counting and lifecycle eligibility.
  -- Never acquire an item/report/profile lock after this lock.
  select * into saved from public.messages where id = p_client_id;
  if found then
    if saved.request_id <> loan.id or saved.sender_id <> auth.uid() or saved.body <> content then
      raise exception 'BH_THREAD_STALE';
    end if;
    return jsonb_build_object('entry', jsonb_build_object('kind','message','id',saved.id,
      'sender_id',saved.sender_id,'body',saved.body,'created_at',saved.created_at), 'created',false);
  end if;
  if loan.status not in ('requested','approved','handed_over') then raise exception 'BH_THREAD_READ_ONLY'; end if;
  select count(*) + case when public.report_trim(loan.message) <> '' then 1 else 0 end,
    greatest(clock_timestamp(), max(created_at) + interval '1 microsecond')
    into total, sent_at from public.messages where request_id = loan.id;
  if total >= 200 then raise exception 'BH_THREAD_LIMIT'; end if;
  insert into public.messages(id,request_id,sender_id,body,created_at)
    values(p_client_id,loan.id,auth.uid(),content,sent_at) returning * into saved;
  return jsonb_build_object('entry', jsonb_build_object('kind','message','id',saved.id,
    'sender_id',saved.sender_id,'body',saved.body,'created_at',saved.created_at), 'created',true);
exception when unique_violation then raise exception 'BH_THREAD_STALE';
end;
$$;

create function public.request_thread(p_request uuid, p_before_kind text default null,
  p_before_at timestamptz default null, p_before_id uuid default null, p_client_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare loan public.requests; page jsonb; earlier boolean; cursor jsonb; total bigint; submission jsonb;
  before_rank integer;
begin
  if not public.is_verified() or public.is_admin() or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'student'
  ) then raise exception 'BH_THREAD_FORBIDDEN'; end if;
  select * into loan from public.requests where id = p_request and auth.uid() in (owner_id,borrower_id);
  if not found then raise exception 'BH_THREAD_UNAVAILABLE'; end if;
  if num_nonnulls(p_before_kind,p_before_at,p_before_id) not in (0,3) then
    raise exception 'BH_THREAD_VALIDATION'; end if;
  if p_before_kind is not null then
    if p_before_kind not in ('opening','message') or not isfinite(p_before_at) then
      raise exception 'BH_THREAD_VALIDATION'; end if;
    if p_before_kind = 'opening' then
      if p_before_id <> loan.id or p_before_at <> loan.created_at or public.report_trim(loan.message) = '' then
        raise exception 'BH_THREAD_VALIDATION'; end if;
      before_rank := 0;
    else
      if not exists (select 1 from public.messages where request_id = loan.id
        and id = p_before_id and created_at = p_before_at) then raise exception 'BH_THREAD_VALIDATION'; end if;
      before_rank := 1;
    end if;
  end if;
  with timeline as (
    select 0 as rank, 'opening'::text as kind, loan.id as id, loan.borrower_id as sender_id,
      loan.message as body, loan.created_at as created_at where public.report_trim(loan.message) <> ''
    union all
    select 1, 'message', m.id, m.sender_id, m.body, m.created_at from public.messages m where m.request_id = loan.id
  ), candidates as (
    select * from timeline where p_before_kind is null or (rank,created_at,id) < (before_rank,p_before_at,p_before_id)
    order by rank desc,created_at desc,id desc limit 51
  ), visible as (
    select * from candidates order by rank desc,created_at desc,id desc limit 50
  )
  select coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'id',id,'sender_id',sender_id,
      'body',body,'created_at',created_at) order by rank,created_at,id) from visible),'[]'::jsonb),
    (select count(*) > 50 from candidates),
    (select jsonb_build_object('kind',kind,'at',created_at,'id',id) from visible order by rank,created_at,id limit 1)
    into page,earlier,cursor;
  select count(*) + case when public.report_trim(loan.message) <> '' then 1 else 0 end
    into total from public.messages where request_id = loan.id;
  select jsonb_build_object('kind','message','id',id,'sender_id',sender_id,'body',body,'created_at',created_at)
    into submission from public.messages where id = p_client_id and request_id = loan.id and sender_id = auth.uid();
  return jsonb_build_object('entries',page,'has_earlier',earlier,'next_before',case when earlier then cursor else null end,
    'request_status',loan.status,'can_send',loan.status in ('requested','approved','handed_over') and total < 200,
    'message_count',total,'limit',200,'submission',submission);
end;
$$;
revoke execute on function public.send_request_message(uuid,text,uuid),
  public.request_thread(uuid,text,timestamptz,uuid,uuid) from public,anon,authenticated;
grant execute on function public.send_request_message(uuid,text,uuid),
  public.request_thread(uuid,text,timestamptz,uuid,uuid) to authenticated;
comment on table public.messages is 'Immutable participant-only request text. No admin access, direct browser writes, attachments or realtime.';

create or replace function public.request_detail(p_request uuid)
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
    and public.is_verified() and not public.is_admin()
    and exists (select 1 from public.profiles actor where actor.id = auth.uid() and actor.role = 'student');
$$;
comment on function public.request_detail(uuid) is
  'Verified participants get request, item and meetup identities/course only; no email or private verification fields, administrators are denied including historical participants.';


create or replace function public.item_requests(p_item uuid, p_status text default 'requested', p_offset integer default 0)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  listing public.items;
  entries jsonb;
  total_count bigint;
  pending_count bigint;
begin
  if not public.is_verified() or public.is_admin() or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'student'
  ) then
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


commit;
