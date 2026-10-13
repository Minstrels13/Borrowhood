-- Disposable application reset. Run only in the project's SQL editor.
-- Preserves auth.users/passwords/email confirmation. Removes application tables,
-- their policies and dependencies. Existing photos are retained as unused objects.
-- Take a database backup first if any application data needs to be kept.
begin;

-- Remove old app signup hooks, without touching Supabase's Auth-owned hooks.
do $$
declare
  hook record;
begin
  for hook in
    select t.tgname from pg_trigger t join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal and n.nspname = 'public'
  loop
    execute format('drop trigger %I on auth.users', hook.tgname);
  end loop;
end;
$$;

-- These are the Borrowhood application tables; no Auth/Storage tables are dropped.
drop table if exists public.comments, public.item_photos, public.requests, public.items, public.profiles cascade;
-- Old security-definer RPCs must not survive and write into the rebuilt table.
-- In this disposable app project, remove custom public routines, retaining
-- extension-owned routines (for example pgcrypto).
do $$
declare
  routine record;
begin
  for routine in
    select p.oid, p.proname, p.prokind, pg_get_function_identity_arguments(p.oid) as arguments
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind in ('f','p')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass
        and d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('drop %s if exists public.%I(%s) cascade',
      case when routine.prokind = 'p' then 'procedure' else 'function' end,
      routine.proname, routine.arguments);
  end loop;
end;
$$;

-- Reset disposable application Storage policies, including broad old policies
-- that could otherwise accidentally expose the new private bucket. Files stay.
do $$
declare
  rule record;
begin
  for rule in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', rule.policyname);
  end loop;
end;
$$;

commit;

-- NEXT: execute migrations/001_profiles.sql, 002_profile_access.sql, and
-- 003_profile_storage.sql in that order. Then execute backfill-preserved-auth.sql.
