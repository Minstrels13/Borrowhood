# Phase 4 — requests, calendar and condition records

Authorized 13 October 2026 while the team tests the stable Phase 3 deployment. Phase 3 bugs and requested changes remain a separate QA list; their acceptance is not assumed. No push, deployment, remote migration or database reset is part of this implementation.

## Artifacts and order

1. `supabase/migrations/020_requests.sql`: request table, database counter/reference, constraints, indexes and RLS. Inclusive date ranges with `btree_gist` prevent overlapping approved/handed-over reservations. Direct browser writes are denied; trusted SQL-editor date correction remains possible under ordinary constraints.
2. `021_request_access.sql`: verified borrower creation, owner approval/decline/handover/return, borrower cancellation, participant-only detail/identity reads, public date-only availability and availability-aware browse. Lock the listing before a transition and recheck actor, state and dates. Preserve existing data and accounts.
3. `022_condition_storage.sql`: private, compressed condition photos with owned UUID/request/event paths, participant-only reads, immutable referenced photos and unused-upload cleanup. Extend historical item/profile-photo reads only to the request's participants.
4. `src/lib/{dates,requests}.js`, request/availability hooks, `components/items/AvailabilityCalendar.jsx`, request lifecycle/action/condition components, M02–M06 and `pages/RequestDetail.jsx`. Reuse native dialogs, tokens, shared controls and image compression. Dates use Asia/Manila; overdue is derived at read time, never persisted.
5. Wire the detail calendar and Request action. Add the minimal Borrowing/Lending lists needed to find and complete actual requests in My Activity; full profile/history/trust and the remaining activity/listing management work stay in Phase 5. Add the active-request soft-deletion guard now, with deletion UI remaining in Phase 5.
6. `supabase/tests/phase-4-security.sql`, focused date/state regression checks, `docs/phase-4-setup.md`, security overview and manual-test updates. Verify 390/767/768/1440 layouts with Strict Mode, loading/error/empty states and disabled saving actions. Stop at the Phase 4 review gate with exact migration and live acceptance instructions.

## Behavior

- One `/requests/:id` page covers requested, approved, handed_over, returned, declined, cancelled and derived overdue for both roles. Mobile puts What happens next first; desktop uses two columns.
- Borrower requests dates and optional message; no self-borrowing. Requested reservations do not block dates. Approve refreshes this route and shows a toast. Cancel returns to the item detail. Decline requires a reason.
- Owner alone confirms handover with required notes and optional photo, then return with Good/Minor wear/Damaged, notes and optional photo. Completed condition records are immutable through browser access. Payment is always settled in person.
- Dates are inclusive, maximum duration comes from the listing, and return is due by the end of end_date in Asia/Manila. Overdue begins the next local day. Approval rejects stale or overlapping requests at the server boundary.
- Public availability exposes dates only. Private request messages, participant course/email and condition photos are never exposed to guests or unrelated students. Admin status grants no extra request access.
- Request references use a database counter, minimum four digits (`BH-0142`); routes retain UUIDs. No generated listings, requests, accounts or condition history.
- No new packages, P2 reports/chat, app date overrides, full profile pages or trust aggregates in this phase.

## Review gate

Build, token/format checks, focused local regression checks and responsive component inspection precede handoff. Team applies 020 → 021 → 022 to the existing database, then tests the full real-account lifecycle, storage/RLS failures, concurrent approvals and Manila date boundaries. Record outstanding Phase 2/3 QA separately. SQL-editor overdue demonstration steps are documented; local checks do not count as live Supabase acceptance.
