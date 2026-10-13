begin;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function public.item_photo_referenced(p_path text, p_public_only boolean)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.item_photos ip
    join public.items i on i.id = ip.item_id
    where ip.storage_path = p_path
      and (not p_public_only or (i.is_active and i.deleted_at is null))
  );
$$;
comment on function public.item_photo_referenced(text, boolean) is
  'Checks reference existence without exposing hidden listings; protects referenced objects from cleanup and allows public listing photo reads.';

create function public.public_owner_photo(p_path text)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    join public.items i on i.owner_id = p.id
    where p.photo_path = p_path and i.is_active and i.deleted_at is null
  );
$$;
comment on function public.public_owner_photo(text) is
  'Only current avatars of owners with published listings are public; other onboarding photos remain private.';

revoke execute on function public.item_photo_referenced(text, boolean), public.public_owner_photo(text)
from public, anon, authenticated;
grant execute on function public.item_photo_referenced(text, boolean), public.public_owner_photo(text)
to anon, authenticated;

create policy item_photo_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.is_verified())
);
comment on policy item_photo_insert on storage.objects is
  'Verified students upload JPEGs only into their own UUID folder; bucket enforces type and 1 MB.';

create policy item_photo_read on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'item-photos'
  and (owner_id = (select auth.uid())::text or public.item_photo_referenced(name, true))
);
comment on policy item_photo_read on storage.objects is
  'Owner reads their uploads; anyone can read photos referenced by published listings.';

create policy item_photo_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'item-photos'
  and owner_id = (select auth.uid())::text
  and not public.item_photo_referenced(name, false)
);
comment on policy item_photo_delete on storage.objects is
  'Owners delete only unused uploads, including old photos after a successful replacement; no overwrite policy exists.';

create policy public_listing_owner_photo_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'profile-photos' and public.public_owner_photo(name));
comment on policy public_listing_owner_photo_read on storage.objects is
  'Makes the current owner avatar readable for public listing cards without exposing other private profile photos.';

commit;
