# Phase 3 setup and review gate

Phase 3 is additive. Keep the existing Phase 2 database and Auth accounts. Do not run the disposable reset.

## Apply in Supabase SQL editor

Run each complete file separately, in order:

1. `supabase/migrations/010_items.sql`
2. `supabase/migrations/011_item_access.sql`
3. `supabase/migrations/012_item_storage.sql`

Paste the SQL itself, beginning with `begin;`, without Markdown fences or a leading backslash. Each file is a transaction. These are one-time migrations: do not rerun a successful file. If a file errors, keep the message and fix the failed file before continuing. No migration has been applied remotely by the agent.

No new environment variables or packages are needed. The existing project URL and anon key are sufficient. Restart the dev server if environment values changed.

## Manual acceptance

Use verified owner and borrower accounts, plus a logged-out session. Create all listing content yourself through the form.

1. Owner: open Post an item. Enter a title, category, honest condition, maximum borrow days and optional description/meetup note. Free needs no price; For rent requires a nonblank text price label. No payment calculation exists. Zero to three photos are supported, matching the optional wireframe photo field.
2. Choose actual JPEG/PNG/WebP files under 10 MB each. Preview/remove before saving. A fourth photo is rejected without losing the first three. Invalid files, oversized files and failed uploads show errors. Uploaded photos become JPEGs no larger than 1 MB and 800 pixels on the longest edge.
3. Publish. Check the success toast and `/activity?tab=listings`; the actual listing appears. Open it and refresh its detail URL. Check all photos, description, condition, meetup, owner name/photo and New badge. There are no completed borrowing records yet; Phase 5 will replace the initial trust projection with real aggregates.
4. Edit from My listings or your item detail. Update fields, add/remove/replace photos, save and refresh. Owner ID and creation time remain unchanged. Cancel returns to item detail without saving (new-form Cancel returns to the shelf). Failed saves keep form values and file selections for retry.
5. Guest: browse `/shelf` and open item detail. Confirm owner name/photo/trust are visible but email, course, verification notes and history are absent. View profile and Request to borrow open M01. A pending/rejected student receives the same wall. A verified student sees an honest later-phase notice for unimplemented requests/full profiles.
6. Borrower: try another owner's `/items/:id/edit`; no edit form is exposed. QA must also call `save_item` directly with that listing ID and confirm server rejection. Pending/rejected and anonymous callers cannot save even through direct API calls. Direct items/item_photos INSERT/UPDATE/DELETE are denied for browser roles.
7. Search by title, combine categories and free/rent, clear filters, and sort newest/title. Counts reflect filters. Before requests exist, every active listing is unreserved, so Available now returns active listings; reservation-aware availability is Phase 4. If the team manually creates more than twelve listings, verify Load more, no duplicate rows, and reset after changing filters.
8. Check 390/767/768/1440 pixels: mobile thumbnail rows and Filters bottom sheet; desktop sidebar and three-column cards. Detail is mobile single-column with a sticky action and no bottom tabs; desktop photos/details are beside the summary. Click the main detail photo: the viewer fits the whole image without scrolling, fills the screen below 768 pixels, and is centered from 768 pixels. Test portrait and landscape photos, Actual size scrolling, Fit to screen, visible controls, X/Escape dismissal, desktop backdrop dismissal and focus returning to the main photo button. Reopening resets to fit mode. Mobile Post has Preview your listing opening a bottom sheet; desktop preview sits beside the form. No horizontal overflow. Keyboard labels, native dialog dismissal and focus return work.
9. QA: test item-photo uploads to foreign UUIDs, overwrite, more than three references, missing/foreign paths, cross-listing photo reuse, unreferenced private uploads and deletion of referenced photos. Only the owner can clean up unused uploads. Public reads work only after reference by a published listing. Phase 2 step 9 remains separately deferred to QA.
10. Test empty shelf/search and empty My listings, failed listing fetch/retry, failed photo fetch/retry on detail, unknown/deleted item, logout, and private-route refresh. Confirm no generated records. Run build/token checks and `supabase/tests/phase-3-security.sql` after manually creating listings under two verified owners.

Borrowing/Lending tabs are placeholders for the planned lifecycle/activity phases. Delete UI and active-request deletion guards arrive with those phases; Phase 3 has no delete or hide action. The schema already has soft-deletion fields and hides deleted listings from public reads.

## Verification limits

Build, token audit, source checks and guest/browser layout checks can run locally before database installation. Creation/editing/storage RLS and authenticated acceptance require the migrations and real team accounts. Local checks do not establish that live policies passed. Stop at this review gate before Phase 4.

### Local evidence — 10 October 2026

- Production build, formatting check, design-token audit and Git whitespace checks passed. Vite emits a nonblocking warning for the approximately 503 kB main chunk; bundle tuning remains part of the polish phase.
- Guest shelf inspected at 390/767/768/1440 pixels: no horizontal overflow; Filters button/mobile tabs below 768; sidebar/desktop layout from 768. The configured project has no `items` table yet; the shelf shows a usable error and Try again instead of sample records or a fabricated count.
- Mobile Filters uses a native modal aligned to the viewport bottom. Escape closes it and returns focus to Filters. Guest Post an item opens M01, also a bottom sheet at 390 pixels.
- Guest `/items/new` and `/activity?tab=listings` redirect to login. Invalid item IDs show Item unavailable and Browse other items.
- The empty posting form was server-rendered temporarily for layout inspection without a session, real-account impersonation, generated listing content or database writes. It had no horizontal overflow at all four widths; desktop form/preview columns switch at 768. This checks static layout, not authenticated saving or the mobile preview interaction. Temporary layout files were removed afterward.
- The seven-check SQL script is prepared for QA; no local PostgreSQL server or remote migration/test run was used. Live save/edit, storage authorization, pagination with more than twelve real records, and actual data-driven item detail remain team acceptance checks.
