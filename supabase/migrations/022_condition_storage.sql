begin;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('condition-photos', 'condition-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function public.can_upload_condition(p_path text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_verified() and split_part(p_path, '/', 1) = auth.uid()::text
    and exists (
      select 1 from public.requests r where r.id::text = split_part(p_path, '/', 2)
        and r.owner_id = auth.uid() and (
          (split_part(p_path, '/', 3) = 'handover' and r.status = 'approved')
          or (split_part(p_path, '/', 3) = 'return' and r.status = 'handed_over')
        )
    );
$$;
comment on function public.can_upload_condition(text) is
  'Only a verified request owner uploads to their UUID/request/event folder in the matching lifecycle state; arbitrary/borrower uploads fail.';

create function public.condition_photo_access(p_path text, p_read boolean)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.requests r
    where p_path in (r.handover_photo_path, r.return_photo_path)
      and (not p_read or (auth.uid() in (r.owner_id, r.borrower_id) and public.is_verified()))
  );
$$;
comment on function public.condition_photo_access(text, boolean) is
  'Read mode allows verified participants only; reference mode protects all recorded condition images from deletion and exposes no record data.';

create function public.request_profile_photo(p_path text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_verified() and exists (
    select 1 from public.requests r join public.profiles p on p.id in (r.owner_id, r.borrower_id)
    where auth.uid() in (r.owner_id, r.borrower_id) and p.photo_path = p_path
  );
$$;
comment on function public.request_profile_photo(text) is
  'Verified request participants can recognize each other through current profile photos, without exposing unrelated private onboarding photos.';

create function public.request_item_access(p_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_verified() and exists (
    select 1 from public.requests r where r.item_id = p_item
      and auth.uid() in (r.owner_id, r.borrower_id)
  );
$$;
comment on function public.request_item_access(uuid) is
  'Historical participants can read their listing/media after soft deletion; unrelated students and anonymous callers cannot.';

revoke execute on function public.can_upload_condition(text),
  public.condition_photo_access(text, boolean), public.request_profile_photo(text),
  public.request_item_access(uuid) from public, anon, authenticated;
grant execute on function public.can_upload_condition(text),
  public.condition_photo_access(text, boolean), public.request_profile_photo(text),
  public.request_item_access(uuid) to authenticated;

create policy condition_photo_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'condition-photos' and public.can_upload_condition(name));
comment on policy condition_photo_insert on storage.objects is
  'Owned request/event upload only; bucket enforces JPEG/1 MB. No UPDATE policy means no overwriting recorded evidence.';

create policy condition_photo_read on storage.objects
for select to authenticated
using (bucket_id = 'condition-photos' and (
  owner_id = (select auth.uid())::text or public.condition_photo_access(name, true)
));
comment on policy condition_photo_read on storage.objects is
  'Uploader reads pending uploads; verified request participants read referenced handover/return photos. Guests and unrelated users cannot.';

create policy condition_photo_delete on storage.objects
for delete to authenticated
using (bucket_id = 'condition-photos' and owner_id = (select auth.uid())::text
  and not public.condition_photo_access(name, false));
comment on policy condition_photo_delete on storage.objects is
  'Only owned unreferenced uploads can be cleaned up; recorded evidence is immutable through Storage APIs.';

create policy participant_profile_photo_read on storage.objects
for select to authenticated
using (bucket_id = 'profile-photos' and public.request_profile_photo(name));
comment on policy participant_profile_photo_read on storage.objects is
  'Meetup participants can read each other current avatars, even when the borrower has no public listings.';

create policy items_read_participant on public.items
for select to authenticated using (public.request_item_access(id));
comment on policy items_read_participant on public.items is
  'Historical request participants retain listing reads after soft deletion without making the listing public.';

create policy participant_item_photo_read on storage.objects
for select to authenticated
using (bucket_id = 'item-photos' and exists (
  select 1 from public.item_photos ip where ip.storage_path = name
    and public.request_item_access(ip.item_id)
));
comment on policy participant_item_photo_read on storage.objects is
  'Historical participants retain referenced item photo reads after listing removal; unused photos stay private.';

commit;
