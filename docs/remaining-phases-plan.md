# Remaining phases — implementation artifacts

Authorized together on 14 October 2026. Earlier gates remain QA obligations, not implementation blockers. Preserve existing data, accounts, user changes and dependencies. No remote SQL, push or deployment is part of this work.

## Phase 5 — activity, profile and trust

- Add `030_profile_history.sql`: DB-authoritative trust aggregates, verified-only profile and paginated completed borrowing/lending condition history, safe profile-photo reads, owner listing request counts and owner-only soft deletion. Active Requested/Approved/Handed over loans block deletion.
- Implement `/profile`, `/users/:id`, Listings/Condition history tabs, own Edit profile, calculated trust score/badge, real return summaries and participant-only evidence links. Cross-student history excludes private messages, counterpart account fields beyond display name, notes and photos.
- Use the approved formula: no returns → 100/New; otherwise max(0, 100 − 8 × late − 15 × damaged). Minor wear adds no penalty. Below 70 → Needs attention; at least five returns and score ≥90 → Trusted; other completed borrowers → Reliable.
- Complete owned listing controls: pending request count, View requests, Edit and native delete confirmation. Keep the new Requests/Past requests and active Borrowing/Lending meanings.

## Phase 6 — comments

- Add `040_comments.sql`: public comments on active listings, verified-only insertion through a narrow function, server-controlled author/time, no edit/delete. Hidden/deleted listings do not expose comments publicly.
- Add paginated public Q&A, author name/photo, empty/loading/retry states and verified-only posting. Guests and unverified students get the shared verification dialog; full profiles stay verified-only.

## Phase 7 — polish and handoff

- Connect profile/account navigation; default Activity to Requests; add active navigation, route titles/focus and status refresh controls.
- Protect dirty forms during in-app navigation and reload without adding packages. Preserve drafts on window focus. Improve email callback recovery and private-link return destinations.
- Make owner calendars read-only, narrow desktop cards readable, short laptop landing spacing responsive and empty condition records compact. Keep existing native photo viewer behavior.
- Preserve existing loan agreements by preventing edits to rental type/label or meetup note while an approved/handed-over loan exists. Dates/identity/history remain immutable to browser callers. Show this restriction in Edit listing.
- Update README, one-page security overview, migration setup and a simple all-phases QA gate. Add a small rollback SQL suite and focused trust checks. Run build/token/request/format checks and responsive browser checks.

Final acceptance still requires the team to apply additive migrations in order (through 024, then 030, 031 and 040) and test real accounts, Storage denial, email callbacks, simultaneous approvals and Vercel deep links. Deferred Phase 2 photo security remains outstanding until QA records a pass. Branding stays in the approved grayscale tokens; no P2 features or fabricated demo records.
