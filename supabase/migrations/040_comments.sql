begin;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(trim(body)) between 1 and 1500),
  created_at timestamptz not null default now()
);
create index comments_item_order on public.comments(item_id, created_at desc, id desc);
alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
create policy comments_public_read on public.comments for select to anon, authenticated
using (exists (select 1 from public.items i where i.id = item_id and i.is_active and i.deleted_at is null));
comment on policy comments_public_read on public.comments is
  'Public Q&A on published listings only. Hidden/deleted listing comments do not remain publicly readable.';

create function public.comment_list(p_item uuid, p_offset integer default 0)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare entries jsonb; total_count bigint;
begin
  if p_offset is null or p_offset < 0 then raise exception 'Invalid comment offset.'; end if;
  if not exists (select 1 from public.items where id = p_item and is_active and deleted_at is null) then
    raise exception 'This listing is unavailable.';
  end if;
  select count(*) into total_count from public.comments where item_id = p_item;
  select coalesce(jsonb_agg(entry order by created_at desc, id desc), '[]'::jsonb) into entries
  from (
    select c.id, c.created_at, jsonb_build_object('id', c.id, 'body', c.body, 'created_at', c.created_at,
      'author', jsonb_build_object('id', p.id, 'full_name', p.full_name, 'photo_path', case when p.verification_status = 'approved' then p.photo_path else null end)) as entry
    from public.comments c join public.profiles p on p.id = c.author_id
    where c.item_id = p_item order by c.created_at desc, c.id desc limit 12 offset p_offset
  ) page;
  return jsonb_build_object('entries', entries, 'total', total_count);
end;
$$;
comment on function public.comment_list(uuid, integer) is
  'Public paginated listing Q&A and author name/photo only; never email, course, admin fields or request data.';

create function public.post_comment(p_item uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare saved uuid;
begin
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
comment on function public.post_comment(uuid, text) is
  'Verified-only comment creation with server-controlled author/time and active listing lock. No browser editing or deletion is permitted.';

create function public.public_comment_photo(p_path text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.comments c join public.items i on i.id = c.item_id
    join public.profiles p on p.id = c.author_id
    where p.photo_path = p_path and p.verification_status = 'approved'
      and p.submitted_at is not null and i.is_active and i.deleted_at is null);
$$;
comment on function public.public_comment_photo(text) is
  'Public current avatar only for authors of comments on published listings; no unreferenced onboarding photo access.';
create policy comment_author_photo_read on storage.objects for select to anon, authenticated
using (bucket_id = 'profile-photos' and public.public_comment_photo(name));
comment on policy comment_author_photo_read on storage.objects is
  'Public Q&A author avatars only, scoped to current comments on active listings.';

revoke execute on function public.comment_list(uuid, integer), public.post_comment(uuid, text), public.public_comment_photo(text)
  from public, anon, authenticated;
grant execute on function public.comment_list(uuid, integer), public.public_comment_photo(text) to anon, authenticated;
grant execute on function public.post_comment(uuid, text) to authenticated;

commit;
