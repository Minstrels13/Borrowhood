-- Run after 010–012 and real listings from two verified team students. No test records are inserted.
begin;

do $$
begin
  if (select count(*) from pg_class where oid in ('public.items'::regclass, 'public.item_photos'::regclass) and relrowsecurity) <> 2
    or has_table_privilege('authenticated', 'public.items', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.item_photos', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('anon', 'public.items', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('anon', 'public.item_photos', 'INSERT,UPDATE,DELETE') then
    raise exception 'FAIL: listing RLS/direct-write privileges';
  end if;
  raise notice 'PASS: 1 listing RLS and no direct browser writes';

  if has_function_privilege('anon', 'public.save_item(uuid,jsonb,text[])', 'EXECUTE')
    or has_any_column_privilege('anon', 'public.profiles', 'SELECT')
    or not has_function_privilege('anon', 'public.owner_summary(uuid)', 'EXECUTE') then
    raise exception 'FAIL: public identity/save privileges';
  end if;
  raise notice 'PASS: 2 public owner summary without private profiles or anonymous saves';

  if not exists (
    select 1 from storage.buckets where id = 'item-photos' and not public
      and file_size_limit = 1048576 and allowed_mime_types = array['image/jpeg']
  ) then
    raise exception 'FAIL: item bucket constraints';
  end if;
  raise notice 'PASS: 3 private constrained item-photo bucket';
end;
$$;

set local role anon;

do $$
begin
  perform count(*) from public.items;
  perform count(*) from public.item_photos;
  if exists (select 1 from public.items where not is_active or deleted_at is not null) then
    raise exception 'FAIL: anonymous hidden listing read';
  end if;
  raise notice 'PASS: 4 anonymous public reads without authenticated-helper permissions';
end;
$$;

reset role;

do $$
declare
  student_id uuid;
begin
  select p.id into student_id
  from public.profiles p join auth.users u on u.id = p.id
  where p.role = 'student' and p.verification_status = 'approved'
    and u.email_confirmed_at is not null and p.photo_path is not null and p.submitted_at is not null
    and exists (select 1 from public.items i where i.owner_id = p.id and i.deleted_at is null)
    and exists (select 1 from public.items i where i.owner_id <> p.id and i.deleted_at is null)
  limit 1;
  if student_id is null then
    raise exception 'Create real listings under two verified team students before these checks.';
  end if;
  perform set_config('request.jwt.claim.sub', student_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', student_id, 'role', 'authenticated')::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  own_id uuid;
  other_id uuid;
begin
  select id into own_id from public.items where owner_id = auth.uid() and deleted_at is null limit 1;
  select id into other_id from public.items where owner_id <> auth.uid() and is_active and deleted_at is null limit 1;
  if own_id is null or other_id is null then
    raise exception 'Both team listings must be published for these checks.';
  end if;

  begin
    perform public.save_item(other_id, '{}'::jsonb, array[]::text[]);
    raise exception 'Cross-owner edit was allowed';
  exception when raise_exception then
    if sqlerrm <> 'Only the owner can edit this listing.' then
      raise;
    end if;
  end;
  raise notice 'PASS: 5 cross-owner edit denied';

  begin
    perform public.save_item(own_id, '{}'::jsonb, array['a', 'b', 'c', 'd']);
    raise exception 'Four photos were allowed';
  exception when raise_exception then
    if sqlerrm <> 'Choose up to three photos.' then
      raise;
    end if;
  end;
  raise notice 'PASS: 6 server photo-count limit';

  begin
    perform public.save_item(own_id, '{}'::jsonb, array['missing-photo.jpg']);
    raise exception 'An unowned or missing photo was allowed';
  exception when raise_exception then
    if sqlerrm <> 'Upload your own photos; a photo cannot belong to two listings.' then
      raise;
    end if;
  end;
  raise notice 'PASS: 7 photo-reference ownership/existence check';
end;
$$;

reset role;
rollback;
