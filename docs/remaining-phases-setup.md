# Phases 5–7 setup and handoff

Implementation was authorized together on 14 October 2026. This is additive: keep existing Auth accounts, profiles, listings, requests and photos. No database reset, remote migration, push or deployment was performed by the agent.

## Database application order

First confirm that migrations 001–003, 010–012 and 020–024 have already succeeded. Apply missing files once in numerical order; do not rerun successful migrations. In Supabase SQL Editor, run each **complete** new file separately:

1. `supabase/migrations/030_profile_history.sql`
2. `supabase/migrations/031_listing_agreements.sql`
3. `supabase/migrations/040_comments.sql`
4. `supabase/migrations/041_cancelled_request_retry.sql` — allows a fresh request after cancellation, retaining the earlier request in history. Required for the cancellation retry update.
5. `supabase/migrations/042_delete_listing_decline_pending.sql` — owner deletion automatically declines pending requests. Approved and ongoing loans still prevent deletion. Apply before using the updated delete controls.

Paste plain SQL starting with `begin;`, without Markdown fences or a preceding backslash. Each file is transactional. On an error, preserve the full message; an unsuccessful transaction should not be treated as installed. A successful file should not be rerun. SQL Editor may flag UPDATE/REVOKE/function definitions; these files do not reset tables or purge data.

030 calculates the approved trust formula, adds verified-only profiles/completed history, owner-only listing request counts and soft deletion. Public owner summaries retain their existing narrow interface with real trust results. Private messages/notes/photos are not exposed through profile history. 031 preserves rental type/label and meetup details while an approved or handed-over loan exists. It does not reconstruct earlier edited values. 040 adds public listing Q&A with verified-only posting and no browser edit/delete.

No new npm packages, environment variables, scheduled jobs or service-role key are required. The existing native dialog and photo-compression infrastructure is reused. React Router's data router provides one shared navigation blocker for all dirty forms; there is no extra routing dependency.

## Local verification

```sh
pnpm check:tokens
pnpm check:requests
pnpm check:trust
pnpm build
```

The trust helper checks the agreed badge/penalty boundaries. Displayed trust is computed by the database, never saved from the browser. In SQL Editor after installation, run `supabase/tests/phase-5-6-security.sql`. It has ten focused checks and needs three existing verified team accounts. Temporary listing/request/comment fixtures roll back; request-counter gaps are normal. The earlier security, duplicate-request and overlapping-date scripts remain relevant.

Local builds, source checks and isolated component previews do not prove live SQL execution, RLS, Storage denial or simultaneous approval safety. Those need the real-account tests in `qa-review-gate.md`. No security script was run remotely by the agent.

## Vercel QA preparation

Push the reviewed source and migrations through your normal team workflow. Vercel uses `pnpm build` and `dist`. Set only the existing Supabase URL and anon/publishable key environment variables. Keep `.env`, private keys, `node_modules`, `dist` and local screenshots out of Git.

Configure the deployed origin and `/pending` confirmation redirect in Supabase Auth as described in Phase 2 setup. `vercel.json` rewrites application routes to the SPA entry. Confirm hosted refreshes of `/items/:id`, `/requests/:id`, `/profile`, `/users/:id` and `/activity`; configuration presence is not a hosted test result.

Wake a paused Supabase project before QA/demo. Allow for email sending limits. Use real team accounts and UI-entered content, never generated demo history. The overdue demo remains the trusted SQL-editor procedure in `manual-tests.md`, with no app override.

## Current review status

The remaining features and review fixes are implemented locally. Build/token/request/trust checks passed. The Supabase client is split into a separate cached chunk, removing the previous oversized main-chunk warning. Private layout checks used temporary local adapters under Strict Mode and made no Supabase mutations. Team acceptance, Storage tests, applied migration status, email delivery and Vercel validation remain open.

Use **`qa-review-gate.md`** for the full Phases 1–7 checklist and current request/deletion behavior. Superseded plans, reviews and duplicate phase checklists have been removed. Phase 2–4 setup guides retain the original database/bootstrap instructions; later migrations in this guide supersede their original request rules. The latest proposed UX work is in `ux-plan.md`, supported by `ux-audit.md`.

### Local evidence — 14 October 2026

- Actual guest landing fits 1440 × 768 without vertical overflow. At 768px the Shelf uses two approximately 240px cards instead of three approximately 155px cards.
- Actual guest photo viewing works at 390/767/768/1440px with fitting controls, Escape dismissal and Next photo navigation. Invalid/expired confirmation URLs show the recovery message on login.
- Eight private screen variants were checked at all four widths under Strict Mode without horizontal overflow. Own profile editing, completed history, other-profile restrictions, empty history and the guest comment wall were exercised with local adapters.
- Draft confirmation preserves edited profile fields and posting inputs; Discard completes navigation. Simulated failed saves retain the draft. A successful local profile save closes its dialog. Comments render HTML-like input as text rather than markup.
- Delete confirmation opens and dismisses through native dialog behavior. Actual soft deletion, trust SQL results, comment posting, Storage permissions and concurrent approvals require the live gate after migration installation.
- Temporary adapters used no real account credentials, database writes or uploads and were removed after testing.
