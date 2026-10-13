# Phase 2 database setup and review gate

The current Supabase application schema is disposable. This setup preserves Auth accounts, passwords and email confirmation. Community rules are available in the signup modal.

## Apply the disposable reset

The compatibility check found an existing `profiles` endpoint, missing Phase 2 columns (`42703`) and a missing confirmation helper (`PGRST202`). Do not run the fresh-install migration over the old table. The reset and migrations have not been applied to the live database.

Open this project's Supabase dashboard → SQL editor. Run each complete file separately, in this order:

1. `supabase/reset-disposable.sql` — removes Borrowhood app tables/dependencies, custom public Auth hooks, **all custom public functions/procedures** (preserving extension-owned routines) and **all existing Storage object policies**. Removing old RPCs prevents stale permission bypasses against the rebuilt table. Auth accounts and stored files remain. This is for the disposable Borrowhood project only; it removes existing app listings/requests/history.
2. `supabase/migrations/001_profiles.sql`
3. `supabase/migrations/002_profile_access.sql`
4. `supabase/migrations/003_profile_storage.sql`
5. `supabase/backfill-preserved-auth.sql`

For a new project without app tables, skip the reset. If a SQL file fails, stop and retain its exact error; do not disable constraints/RLS or grant broad permissions. An unusual old dependency may need inspection rather than further blanket deletion.

Existing Auth users with valid name/course metadata receive a pending profile. Others enter their actual details and photo in `/pending` after login; no substitute names are generated. Old approval/admin roles are not carried over. Old stored files remain unused; storage cleanup is outside this reset.

## Configure Auth

- Auth → Providers → Email: enable email signups and **Confirm email**. Set minimum password length to 8 or higher.
- Auth → URL configuration: set Site URL to the actual deployment origin. Add `http://localhost:5173/pending`, `http://127.0.0.1:5173/pending`, the printed local preview origin plus `/pending` (currently `http://127.0.0.1:5174/pending`), and your exact production `/pending` URL to allowed redirects.
- Keep `.env` limited to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Restart Vite after changing it. Never send or add a service-role key.
- Confirmation-email rate limits still apply. Use the three real team BulSU accounts; check spam and allow time before resending.

## Designate the real admin

Log in once with the team's confirmed BulSU admin account. If its profile was not backfilled, complete its real details/photo through `/pending`. Then run this in SQL editor with the actual admin email:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = (
  select id from auth.users
  where lower(email) = lower('REPLACE_WITH_REAL_TEAM_ADMIN@ms.bulsu.edu.ph')
    and email_confirmed_at is not null
);
```

Expect exactly one updated row. Refresh the app or log in again, then open `/admin/verification`. Admin access requires its confirmed email and protected role; a role value in user metadata has no effect. The admin cannot approve itself. There is no admin signup, verification revocation or account-restriction UI.

## Review gate

Run `supabase/tests/phase-2-security.sql` in SQL editor after at least one real student profile exists. It runs ten checks and rolls back; it does not create demo accounts. Then complete the Phase 2 scenarios in `docs/manual-tests.md` using separate owner, borrower and admin browser sessions.

The app code can be reviewed locally now. Database checks, actual confirmation delivery, photo uploads and admin approve/reject remain unverified until these files are applied and the real accounts are tested. Phase 3 has not started; `/shelf` is an explicit Phase 3 destination with no fabricated listings.
