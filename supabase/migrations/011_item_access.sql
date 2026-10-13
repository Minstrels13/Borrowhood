begin;

create policy items_read on public.items
for select to anon, authenticated
using (is_active and deleted_at is null);
comment on policy items_read on public.items is
  'Anyone reads published listings; this policy never calls an authenticated-only verification helper.';

create policy items_read_own on public.items
for select to authenticated
using (owner_id = (select auth.uid()) and (select public.is_verified()));
comment on policy items_read_own on public.items is
  'Verified owners also read their own hidden listings; anonymous callers do not evaluate this policy.';

create policy item_photos_read on public.item_photos
for select to anon, authenticated
using (exists (select 1 from public.items where id = item_id));
comment on policy item_photos_read on public.item_photos is
  'Photo references follow the parent listing visibility through its RLS policy.';

create function public.owner_summary(p_owner uuid)
returns table(id uuid, full_name text, photo_path text, trust_level text, trust_score integer)
language sql stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.photo_path, 'new'::text, 100
  from public.profiles p
  where p.id = p_owner and (
    exists (
      select 1 from public.items i
      where i.owner_id = p.id and i.is_active and i.deleted_at is null
    )
    or (p.id = auth.uid() and public.is_verified())
  );
$$;
comment on function public.owner_summary(uuid) is
  'Public listing-owner identity only; no course, email or review data. No borrowing outcomes exist before Phase 4/5, so trust is New.';

create function public.save_item(p_id uuid, p_values jsonb, p_photos text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  item_owner uuid;
begin
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
comment on function public.save_item(uuid, jsonb, text[]) is
  'Verified owner-only atomic listing/photo save. Accepts content fields only; owner, visibility, deletion and timestamps are server-controlled.';

revoke execute on function public.owner_summary(uuid), public.save_item(uuid, jsonb, text[])
from public, anon, authenticated;
grant execute on function public.owner_summary(uuid) to anon, authenticated;
grant execute on function public.save_item(uuid, jsonb, text[]) to authenticated;

commit;
