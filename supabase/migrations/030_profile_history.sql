  begin;

  create function public.trust_totals(p_user uuid)
  returns jsonb
  language sql stable security definer set search_path = ''
  as $$
    with outcomes as (
      select count(*)::integer as completed,
        count(*) filter (where (returned_at at time zone 'Asia/Manila')::date > end_date)::integer as late,
        count(*) filter (where return_condition = 'damaged')::integer as damaged
      from public.requests where borrower_id = p_user and status = 'returned'
    ), scored as (
      select *, greatest(0, 100 - 8 * late - 15 * damaged) as score from outcomes
    )
    select jsonb_build_object('completed', completed, 'on_time', completed - late, 'late', late,
      'damaged', damaged, 'score', score, 'level', case when completed = 0 then 'new'
        when score < 70 then 'needs_attention' when completed >= 5 and score >= 90 then 'trusted'
        else 'reliable' end) from scored;
  $$;
  comment on function public.trust_totals(uuid) is
    'Internal DB-authoritative borrowing outcomes only: cumulative penalties of 8 per late and 15 per damaged return; minor wear has no penalty.';
  revoke execute on function public.trust_totals(uuid) from public, anon, authenticated;

  create or replace function public.owner_summary(p_owner uuid)
  returns table(id uuid, full_name text, photo_path text, trust_level text, trust_score integer)
  language sql stable security definer set search_path = ''
  as $$
    select p.id, p.full_name, p.photo_path, t.value->>'level', (t.value->>'score')::integer
    from public.profiles p cross join lateral (select public.trust_totals(p.id) as value) t
    where p.id = p_owner and (exists (
      select 1 from public.items i where i.owner_id = p.id and i.is_active and i.deleted_at is null
    ) or (p.id = auth.uid() and public.is_verified()));
  $$;
  comment on function public.owner_summary(uuid) is
    'Public listing owner name/photo and calculated trust badge/score only; no course, email, counts or private review fields.';

  create function public.student_profile(p_user uuid)
  returns jsonb
  language plpgsql stable security definer set search_path = ''
  as $$
  begin
    if not public.is_verified() then raise exception 'Verified students only.'; end if;
    return (select jsonb_build_object('id', p.id, 'full_name', p.full_name,
      'course_year_section', p.course_year_section, 'photo_path', p.photo_path,
      'created_at', p.created_at, 'trust', public.trust_totals(p.id))
      from public.profiles p join auth.users u on u.id = p.id
      where p.id = p_user and p.verification_status = 'approved' and p.photo_path is not null
        and p.submitted_at is not null and u.email_confirmed_at is not null
        and lower(u.email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$');
  end;
  $$;
  comment on function public.student_profile(uuid) is
    'Verified viewers receive a verified student profile and trust counts, never email, admin notes, roles or verification review fields.';

  create function public.profile_history(p_user uuid, p_offset integer default 0)
  returns jsonb
  language plpgsql stable security definer set search_path = ''
  as $$
  declare entries jsonb; total_count bigint;
  begin
    if public.student_profile(p_user) is null then raise exception 'Profile unavailable.'; end if;
    if p_offset is null or p_offset < 0 then raise exception 'Invalid history offset.'; end if;
    select count(*) into total_count from public.requests
      where p_user in (owner_id, borrower_id) and status = 'returned';
    select coalesce(jsonb_agg(entry order by returned_at desc, id desc), '[]'::jsonb) into entries
    from (
      select r.id, r.returned_at, jsonb_build_object(
        'request_id', case when auth.uid() in (r.owner_id, r.borrower_id) then r.id else null end,
        'title', i.title, 'role', case when r.borrower_id = p_user then 'borrowed' else 'lent' end,
        'other_name', other.full_name, 'start_date', r.start_date, 'end_date', r.end_date,
        'returned_at', r.returned_at, 'condition', r.return_condition,
        'late', (r.returned_at at time zone 'Asia/Manila')::date > r.end_date) as entry
      from public.requests r join public.items i on i.id = r.item_id
      join public.profiles other on other.id = case when r.borrower_id = p_user then r.owner_id else r.borrower_id end
      where p_user in (r.owner_id, r.borrower_id) and r.status = 'returned'
      order by r.returned_at desc, r.id desc limit 12 offset p_offset
    ) page;
    return jsonb_build_object('entries', entries, 'total', total_count);
  end;
  $$;
  comment on function public.profile_history(uuid, integer) is
    'Verified-only completed borrowing/lending summaries, twelve per page. Excludes messages, notes, media paths and nonparticipant request IDs; evidence remains participant-only.';

  create function public.verified_profile_photo(p_path text)
  returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select public.is_verified() and exists (
      select 1 from public.profiles p join auth.users u on u.id = p.id
      where p.photo_path = p_path and p.verification_status = 'approved'
        and p.submitted_at is not null and u.email_confirmed_at is not null
        and lower(u.email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$'
    );
  $$;
  comment on function public.verified_profile_photo(text) is
    'Verified viewers recognize verified students on full profiles/comments; pending or rejected account photos remain private.';
  create policy verified_student_photo_read on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos' and public.verified_profile_photo(name));
  comment on policy verified_student_photo_read on storage.objects is
    'Read current verified-student avatars only; does not widen condition-photo or unverified profile-photo access.';

  create function public.request_counts(p_item public.items)
  returns jsonb
  language sql stable security definer set search_path = ''
  as $$
    select case when public.is_verified() and exists (select 1 from public.items i
      where i.id = (p_item).id and i.owner_id = auth.uid()) then
      jsonb_build_object('pending', count(*) filter (where status = 'requested'),
        'active', count(*) filter (where status in ('requested', 'approved', 'handed_over')),
        'agreement_locked', count(*) filter (where status in ('approved', 'handed_over')) > 0)
      else null end
    from public.requests where item_id = (p_item).id;
  $$;
  comment on function public.request_counts(public.items) is
    'Owner-only computed listing field for pending badges and deletion/active agreement controls; no request identities or counts for other viewers.';

  create function public.delete_item(p_item uuid)
  returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare listing public.items;
  begin
    if not public.is_verified() then raise exception 'Complete verification first.'; end if;
    select * into listing from public.items where id = p_item for update;
    if not found or listing.owner_id <> auth.uid() or listing.deleted_at is not null then
      raise exception 'Only the owner can delete an existing listing.';
    end if;
    update public.items set deleted_at = now(), is_active = false, updated_at = now() where id = p_item;
  end;
  $$;
  comment on function public.delete_item(uuid) is
    'Verified owner-only soft deletion under the existing active-request trigger. Listing/media/request history is retained; item locking serializes creation and approval.';

  revoke execute on function public.student_profile(uuid), public.profile_history(uuid, integer),
    public.verified_profile_photo(text), public.request_counts(public.items), public.delete_item(uuid)
    from public, anon, authenticated;
  grant execute on function public.student_profile(uuid), public.profile_history(uuid, integer),
    public.verified_profile_photo(text), public.request_counts(public.items), public.delete_item(uuid)
    to authenticated;

  commit;
