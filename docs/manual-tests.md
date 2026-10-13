# Borrowhood manual acceptance checks

## Phase 1 review gate

Footer-removal amendment verified: landing fits the 1440 × 1024 viewport without vertical scrolling. The guest brand link targets /. The development review link was removed from landing; /__ui remains directly accessible in development. Signed-in brand navigation targets /shelf, awaiting its planned implementation.

Run `pnpm dev`; open its printed URL and `/__ui`.

1. At 390px, 767px, 768px and 1440px, compare landing with S01 SVGs. Check responsive hero, step cards, trust blocks, readable buttons and no horizontal scroll. Approved change: the footer is removed throughout the app. Click the Borrowhood name/logo: guest goes to landing (/); signed-in navigation targets the home shelf (/shelf), which will be implemented with the listings slice.
2. Future-feature buttons show “available soon” feedback; Home works; an unknown route offers Back home. No fake data is created.
3. In /__ui inspect button variants, disabled state, labeled fields, help/error text, avatar sizes, all seven statuses and four trust levels.
4. Choose Example brand: colors, font, radii, spacing, logo and badges change. Switch back to grayscale. The preview is development-only.
5. At 390px Open dialog is a bottom sheet; at 768px/1440px it is centered. X, Cancel, Esc and backdrop close it; inside clicks do not.
6. Tab/Shift+Tab use native modal focus handling; underlying app controls remain inert. Browser chrome may receive focus at boundaries. Closing returns focus to the opener; background scrolling is locked while open.
7. Click Listings/Condition history; use Left/Right/Home/End. Selection and empty-state panel change together.
8. Primary shows Action confirmed; dismiss works; toast uses a polite live region.
9. Inspect student/admin desktop navigation and mobile tab bar in preview. Guest landing has no bottom bar, matching S01.
10. Run `pnpm check:tokens` and `pnpm build`. Check production excludes /__ui. Hosted deep-link refresh remains deferred until actual Vercel deployment.

### Verification performed — 9 October 2026

Dependency install completed with lockfile; token audit and production build passed. Browser inspected landing/shared UI. Theme switched to cream/green with Georgia font. Mobile dialog at 390px was bottom-aligned, native :modal active, background overflow hidden; Esc returned focus to Open dialog. Desktop dialog at 768px was centered and 560px wide; Cancel closed it. Keyboard Right selected Condition history; Primary produced a toast. No captured console warnings/errors at the check. No horizontal overflow at checked 390px/768px sizes.

Additional browser checks: no horizontal overflow at 767px/1440px; desktop navigation switches at 768px; backdrop closed the modal. Final landing screenshot is saved at screenshots/phase-1-landing.jpg. Native Tab boundary behavior can move focus to browser chrome/body, while underlying controls remain inert; final keyboard behavior should also be reviewed in the team's demo browser.

S02/S04 implemented in Phase 2: signup has no photo; after confirmed email/login, Add your profile photo precedes submission. Stepper: Email, Photo, Admin review, Verified. Reference SVGs remain unchanged. The earlier Phase 1-only notes above are historical; auth links now navigate to real forms.

## Phase 2 review gate

First follow `phase-2-setup.md` to reset the disposable app schema, apply migrations, preserve Auth accounts, enable confirmation/redirects and designate the real admin. Use real owner and borrower BulSU accounts in separate browser sessions; do not create generated listings/history. Run `supabase/tests/phase-2-security.sql` and retain ten PASS notices before the UI scenarios.

1. Open `/signup` at 390, 767, 768 and 1440 pixels. Check readable fields and no horizontal overflow. No photo field appears. Empty fields, short password, password mismatch, non-BulSU email and unchecked consent prevent signup. Read community rules opens a modal with all seven rules. It is a bottom sheet on mobile and centered on desktop. Closing it preserves form values and does not check consent. Verify X, Close, Esc and backdrop dismissal return focus to the opener.
2. Sign up with a real team student. Check the confirmation screen, inbox/spam and resend handling. Before confirmation, login must be blocked by Auth. Confirm the email, log in and check `/pending`: **Add your profile photo**, with Email, Photo, Admin review, Verified steps.
3. Upload a clear actual photo. Test invalid file, an image over 10 MB, failed network upload and retry. Supported JPEG/PNG/WebP compress to JPEG no larger than 1 MB. Submit only after a successful owned upload. Check “Email confirmed. An admin is reviewing your account.” Refresh preserves state; Check status reloads it.
4. Admin opens `/admin/verification`. Compare A01 desktop table/mobile cards, Pending/Approved/Rejected tabs, name/email search and real count. Load more appears only above twelve matching students. Incomplete/unconfirmed students show why approval is disabled; direct approval RPC must reject them too.
5. Approve owner directly: same queue refreshes and a toast appears. Owner Check status redirects to `/shelf`. Edit owner name/course/photo; approval remains. Phase 3 replaces the earlier shelf placeholder with the real listings screen; no fake listings are included.
6. Reject borrower with a reason and optional private note. Required reason cannot be blank; M11 says “The student will see this reason and can fix their details.” Borrower sees the reason, not the private admin note. Update details and resubmit returns to pending; only name/course/photo are editable. Admin approves the corrected submission.
7. Open `/admin/verification` as guest → login. As student → Admin access required. A direct `review_student` RPC as student must also fail. Edit Auth user metadata to include an admin role or approved status: database role/status remain unchanged. A direct Auth email change must not change the account's actual email.
8. Using the logged-in browser's anon client/session, attempt direct profile INSERT, UPDATE of role/status/reviewer/timestamps, DELETE and another student's SELECT/UPDATE. All writes and cross-student private reads must fail. Anonymous reads of private profiles fail. Do not share real tokens/credentials or paste them into docs.
9. **Deferred to team QA on 10 October 2026; not passed or waived.** Try uploading into another UUID folder, overwriting an existing photo, reading another pending student's photo, assigning another student's photo path and deleting/removing the current photo. Each must fail at the server. A new owned replacement succeeds; only an unreferenced owned upload can be deleted. After Phase 3, public avatars of owners with published listings are intentionally readable; use a pending student with no published listing for the private-photo test.
10. Log out → `/`. Refresh private URLs and revisit expired/invalid confirmation links; show a usable login/error state. Test an expired session and a failed profile fetch (Retry loading account/route retry). Mobile/desktop M08/M11 use native dialog focus/inertness, bottom sheet/centered layout, Esc/backdrop/X/Cancel and disabled actions during save.

### Verification performed locally — 9 October 2026

Rules-modal update: desktop dialog and 390-pixel bottom sheet display all seven rules. Escape and X close the dialog and return focus to Read community rules. Form values remain intact and opening/closing does not check consent. Background scrolling is locked. Build and token checks passed. The separate `/rules` route was removed.

Production build and token check passed. Browser inspected signup at 390/767/768/1440 pixels: no horizontal overflow, no photo input, required fields and eight-character password constraints. Desktop navigation switches at 768. Login Show password changes the input type. The original rules-page check is superseded by the signup rules modal; verify its seven rules and dismissal behavior. Guest `/admin/verification` and `/pending` redirect to `/login`. Screenshots: `screenshots/phase-2-signup-mobile.jpg`, `screenshots/phase-2-signup-desktop.jpg`, `screenshots/phase-2-rules.jpg`.

The configured live project responded to a read-only status probe, but its old `profiles` schema lacks the new columns/helper. **Remote SQL has not been executed.** Actual signup/confirmation/photo/admin actions, the SQL checks and A01 with real students remain pending database installation and team-account testing. Local UI checks are not evidence that live RLS passes.

## Phase 3 review gate

Phase 3 is implemented locally; apply the additive 010/011/012 migrations using [Phase 3 setup](phase-3-setup.md), then follow its ten acceptance scenarios. Do not reset the Phase 2 database. Phase 2 step 9 remains assigned to team QA and is not marked passed. Phase 3 SQL tests and authenticated listing/photo tests have not been run against the live project by the agent.

## Database security checks

Keep supabase/tests near ten meaningful checks, matching the security overview. No generated production records. Checks await their database slices.

## Overdue demo — finalize in Phase 4

Use real admin/owner/borrower team BulSU accounts. After owner confirms handover, a trusted operator uses Supabase SQL editor to move the selected request's end_date to yesterday. If needed, adjust start_date to keep a valid one-day interval; preserve overlap/duration and other constraints. Target one BH reference and inspect it before updating. Do not disable triggers/RLS.

Exact executable SQL will be documented and verified against the actual Phase 4 schema/date guard. The operator exception must use trusted database session identity; browser roles cannot impersonate it. There is no app override.

Refresh both accounts: owner sees due date/days late and Confirm return; borrower sees overdue copy with no action. Confirm return through owner UI and inspect history/trust. This procedure cannot run in Phase 1 because requests/guards do not exist.

