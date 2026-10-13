begin;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos','profile-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy profile_photo_insert on storage.objects for insert to authenticated
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_confirmed_email()));
comment on policy profile_photo_insert on storage.objects is 'Confirmed students upload only into their own folder; bucket limits JPEG size/type.';

create policy profile_photo_read on storage.objects for select to authenticated
using (bucket_id = 'profile-photos' and (owner_id = (select auth.uid())::text or (select public.is_admin())));
comment on policy profile_photo_read on storage.objects is 'Only owner/admin can read onboarding photos; no public bucket or guest access.';

create policy profile_photo_delete on storage.objects for delete to authenticated
using (bucket_id = 'profile-photos' and owner_id = (select auth.uid())::text
  and not exists (select 1 from public.profiles where id = auth.uid() and photo_path = name));
comment on policy profile_photo_delete on storage.objects is 'Owners clean up unused uploads; a referenced required photo cannot be deleted.';
-- Deliberately no UPDATE policy: clients cannot overwrite a reviewed photo in place.
commit;
