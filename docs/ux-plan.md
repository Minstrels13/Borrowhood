# Borrowhood UI/UX change plan — Phase 2

**Status: proposed; awaiting user approval.** Prepared 14 October 2026 from [the audit](ux-audit.md). Approval of Phase 2 authorized this document only. Phase 3 starts after approval of the implementation scope below, with a review gate after each slice.

## Direction and boundaries

Make browsing easy to resume, put trust and the next action beside decisions, and finish the visual hierarchy using the required brand palette. Follow the existing desktop/mobile Figma compositions and the single 768px breakpoint. Keep the existing React/plain-CSS stack, native dialogs, token-based dimensions, compressed uploads, pagination and in-person payment guidance.

Requirements come from the attached **Borrowhood Product Requirements Document.md**, and project rules from the attached **CODEX.md**, as directed by the user. Database, migrations, policies, auth/session logic, trust calculations, request transitions, permissions and storage rules are outside this plan. P2 product features stay excluded. Proposed interface wording below is submitted for approval with this plan; it is not generated marketplace content.

Phase 1 authenticated findings remain source-based. Phase 3 verification must distinguish browser-tested behavior from private states requiring the team's accounts. No fabricated records or private-session adapters will be introduced to fill that gap.

## Quick wins

| ID / priority | Change, reason and student benefit | Files affected | Effort / risk | Figma relationship |
|---|---|---|---|---|
| Q1 / first — A07 | Apply maroon primary, clay accents and mist surfaces through the existing semantic tokens. Keep dark readable text, white cards, gentle elevation, existing radii and spacing. Give overdue an explicit exclamation mark, heavier outline and maroon tint. Students see a coherent brand and can distinguish urgency without color. | `src/styles/variables.css`, `src/styles/global.css`, `src/components/ui/StatusChip.jsx` | 2–3 hours / medium: global styles affect every screen and badge | **Proposed visual deviation:** color/elevation complete the grayscale wireframes, as required by PRD §11. No layout/flow change. |
| Q2 / next — A05 | Hide the bottom tab bar for guests and replace the guest shelf's Post an item CTA with the S05G eligibility notice and Log in/Sign up links. Keep verified navigation and existing unverified access behavior. Browsing becomes the guest's clear task and eligibility is explained before a blocked action. | `src/components/layout/PageShell.jsx`, `src/pages/Browse.jsx`, `src/styles/global.css` | 1–2 hours / low: presentation condition only; verify no mobile padding gap | **Restores S05G / PRD §8.** User-role guards and interaction permissions stay intact. |
| Q3 / later — A12 | Lazy-load shelf/listing-card photos, use asynchronous image decoding, and retain image aspect ratios. Keep the main item photo eager so the key decision image is not delayed. Students avoid unnecessary offscreen transfers. | `src/components/items/ItemPhoto.jsx`, `src/components/items/ItemCard.jsx`; `src/pages/ItemDetail.jsx` only if an explicit eager prop is needed | 0.5–1 hour / low: check image fallbacks and retry | No visible deviation. Responsive variants are deferred because the app currently exposes one source per photo. |

### Q1 palette proposed for approval

The current default tokens are grayscale; the required derived brand tokens are not already defined. Add/map these values **only in `variables.css`**. Components use semantic variables. Keep the Example theme as a development re-skin demonstration.

| Use | Proposed value / treatment |
|---|---|
| Primary, primary focus | Maroon `#873E3D`; white button text |
| Accent | Clay `#BC9986` for decorative fills; dark text on top, never white small text |
| Neutral | Mist `#C3D1DA` for decoration/dividers; use a stronger border for interactive controls |
| Page / cards | Warm white `#FFFDFC` / white `#FFFFFF` |
| Soft surfaces | Clay tint `#F8F2EF`; mist tint `#EAF0F4` |
| Text / muted text | `#2E2222` / `#695957` |
| Control border | `#7D6B65`; focus remains explicitly outlined |
| Overdue / error emphasis | Maroon on tint `#F8EDEC`; text explains the error; overdue also has `!` and a thicker border |
| Steel | `#3D89B4` for graphics only; if a text/link role needs steel, use rules-file dark steel `#2A6489` |
| Status / trust chips | Map existing semantic tokens to these tints/dark text; retain labels and distinct solid/dashed/double borders. No new status or trust category. |

Calculated sRGB contrast pairs: white/maroon **7.54:1**; main text/page **15.14:1**; muted text/page **6.54:1**; control border/white **5.04:1**; dark steel/white **6.40:1**; maroon/overdue tint **6.57:1**. These calculations validate the listed pairs, not every rendered state. Check all chip, focus, hover, error and disabled presentations during Q1; decorative mist borders must not become the sole control boundary. Add a 180ms feedback-transition token only where useful, with reduced-motion rules disabling those transitions. Use static loading placeholders initially.

**Audit correction:** A07 credited an existing overdue exclamation and heavier border. Source reinspection shows that `StatusChip.jsx` currently renders only the status text and the shared chip border width. Q1 proposes adding those cues; they are not verified existing behavior.

## Medium changes

| ID / priority | Change, reason and student benefit | Files affected | Effort / risk | Figma relationship |
|---|---|---|---|---|
| M1 / high — A03, A04 | Keep shelf search, sort, category, type and availability in URL parameters. Add removable applied-filter chips, an active-filter count, and a direct reset action in empty results. Students can open an item, go back, refresh or share the shelf without rebuilding their search. | `src/pages/Browse.jsx`, `src/components/items/FilterSidebar.jsx`, new `src/components/items/AppliedFilters.jsx`, `src/styles/global.css`; optional small `src/config/shelfSearch.js` for URL parsing if that keeps Browse readable | 2–3 hours / medium: URL state/debounce/back navigation can become inconsistent | S05/F01 already show applied category and Clear all. **Proposed interaction extension:** removable chips and URL persistence; no new filter or sort option. |
| M2 / high — A01 | Show existing trust badges and a View profile link beside request participants. Use the existing `getStudentProfile` read for owner/borrower after the request loads; render known request identity immediately. If trust cannot load, show “Trust record unavailable” and Retry rather than a guessed badge. Owners can assess a borrower at approval time. Apply the same borrower trust summary to the item-request approval list using bounded reads for the visible page. | `src/pages/RequestDetail.jsx`, `src/pages/ItemRequests.jsx`, new `src/components/requests/ParticipantSummary.jsx`, `src/styles/global.css`; reuse `src/lib/profiles.js` and `TrustBadge.jsx` unchanged | 2–3 hours / medium: extra existing API reads can fail; real accounts needed | **Restores S10 trust badges.** Explicit profile link follows the existing profile flow. Item-request list has no direct Figma frame: **proposed extension** of the S10 summary to that existing approval surface. |
| M3 / high — A02 | Add “Needs your action” for owner handover/return rows, date-led guidance, overdue days, and specific navigation labels such as “Review handover” and “Review return.” On My listings, expose the already-returned pending-request count with “Review requests.” Keep next steps first on mobile request pages. Students can distinguish waiting from tasks they must perform. | `src/components/requests/RequestList.jsx`, `src/components/items/ItemCard.jsx`, `src/components/requests/ActionPanel.jsx`, `src/styles/global.css`; a small UI-only guidance helper under `src/components/requests/` if shared | 1.5–2.5 hours / medium: copy must accurately describe the actor; no new direct transitions | Labels and due summaries follow S11. **Existing deviation retained:** four tabs and owner pending-request routing, pending the separate decision below. This is a partial remedy for A02. |
| M4 / high — A06 | Show “Required” beside required labels, retain helper text when a field has an error, and connect inline errors to inputs/selects/textareas. Move existing signup domain/mismatch feedback to the relevant fields and focus the first invalid field after submission. Use existing validation conditions and retain entered values. Students can find and correct errors without scrolling to a distant message. | `src/components/ui/Field.jsx`, `src/pages/SignUp.jsx`, `src/pages/PostItem.jsx`, `src/components/modals/RequestBorrowModal.jsx`, `src/components/modals/RequestActionModal.jsx`, `src/components/modals/EditProfileModal.jsx`, `src/components/modals/RejectVerificationModal.jsx`, `src/styles/global.css` | 2–4 hours, split into two gates / medium: shared Field affects many forms | Required markers and inline error guidance follow S02/S08/M04/M05. **Proposed presentation refinement:** persistent field-level errors supplement native validation; no new password/email/data restrictions. |
| M5 / medium — A10 | Show accepted formats and the existing 10MB limit before selecting a photo. Announce real processing/saving stages, show a local preview when replacing a profile photo, and explain the three-photo limit beside a disabled listing upload control. Students know the selected photo and why a control is unavailable. | `src/pages/PostItem.jsx`, `src/components/modals/RequestActionModal.jsx`, `src/components/modals/EditProfileModal.jsx`, `src/styles/global.css` | 1.5–2.5 hours / low–medium: object-URL cleanup and save-stage accuracy | **Proposed feedback extension:** progress/status copy and replacement preview clarify the existing upload flow. No new upload count, format, compression or storage behavior. |

### M1 behavior to approve

- URL contract: `q`, repeated `category`, repeated `type`, `available=1`, and `sort`. Omit default values. Accept only currently supported values and preserve unrelated parameters. URL state is the source of truth for refresh and browser Back/Forward.
- Keep the existing debounce. Replace the history entry while typing; push explicit filter/sort/reset changes so Back restores deliberate choices without stepping through every character. Cancel pending updates when navigating or restoring history.
- Chips have visible text and an accessible “Remove [filter]” name with a 44px target. Removing one filter preserves the others and the query. Result count describes the current query and is announced after loading.
- “Clear all” resets search and filters, preserving the current sort. “Clear filters” in the existing filter controls resets category/type/availability only. Empty-state “Clear search and filters” performs the complete reset explicitly. Mobile “Show items” closes the sheet; it uses a real result count only when the current query has finished.

### M2–M5 implementation limits

- Trust reads use existing authorized functions. Request detail needs at most two participant reads per load/retry. Item requests deduplicate borrowers within the existing page of about 12 records, load only that page's summaries, and reuse results within that page. No polling, broad profile fetch, global cache or new backend contract. Discard stale results on identity/page changes. Trust-read failure does not block legitimate lifecycle controls.
- M3 derives display guidance from existing status/date helpers. Existing actions, eligibility and request filters are untouched. Links open the request page; “Review return” does not itself confirm return. Other participant names are missing from the Activity query and will not be guessed or fetched once per row in this slice.
- M4 updates only presentation of existing validation results. Auth functions/guards and validation/business-rule functions are unchanged. Server/network errors without a known field remain a form-level alert. Required props for custom controls must be explicit; no implicit child rewriting that could drop event handlers or refs.
- M5 must not show invented percentages or a distinct compression stage when the existing upload helper does not expose it. For opaque combined helpers, use “Processing photo 1 of 3…” then “Saving listing…”. The profile dialog can announce its already-separate preparation/upload/save awaits. Retain existing cleanup/retry behavior and do not persist drafts/photos elsewhere.

## Larger changes

| ID / priority | Change, reason and student benefit | Files affected | Effort / risk | Figma relationship |
|---|---|---|---|---|
| L1 / medium — A08 | Add simple, layout-matched loading placeholders for shelf cards, item detail, request/participant areas, Activity, profile/history and admin queue. Distinguish initial loading from refresh/load-more; keep already-visible content during refresh where existing hooks already retain it. Show one accessible loading status and hide decorative placeholders from assistive technology. Students retain their place and see a stable page while data loads. | New `src/components/ui/Skeleton.jsx`, `src/styles/variables.css`, `src/styles/global.css`, `src/pages/Browse.jsx`, `src/pages/ItemDetail.jsx`, `src/pages/RequestDetail.jsx`, `src/pages/MyListings.jsx`, `src/components/requests/RequestList.jsx`, `src/pages/ItemRequests.jsx`, `src/pages/Profile.jsx`, `src/pages/AdminQueue.jsx` | 3–5 hours, split into public/private gates / medium: stale content must not appear to match changed filters | **Proposed state extension:** Figma has no complete loading variants. Skeleton shapes follow each existing composition. No new routes, data, fetch policy or skeleton text pretending to be content. |
| L2 / lower — A11 | Give the existing calendar one active date Tab stop, arrow-key movement, Home/End within the week, and Enter/Space selection. Explain keyboard use in associated helper text. Students can select dates efficiently without tabbing through a month. | `src/components/items/AvailabilityCalendar.jsx`, `src/styles/global.css` | 2–3 hours / medium: month boundaries, disabled days and focus retention need verification | **Proposed keyboard interaction extension:** visible grid/legend/date selection flow stays the same. |

For L1, do not change `useItems` to keep a previous filter's cards while querying a different filter. Use same-sized placeholders for that transition; retained data during ordinary refresh must be clearly marked busy. Action controls must preserve existing busy/error disabling. No hook, fetch ordering or pagination changes are needed for the first pass.

For L2, keep the existing date legality/range validation functions. Roving focus is presentation state only. Disabled/past/blocked days remain unselectable; movement and cross-month focus must be documented and tested. Preserve readonly behavior and accessible full-date/state labels. Do not add a new date-picker dependency.

## Needs approval — excluded from the recommended implementation

These choices are not bundled into blanket approval of the recommended slices.

| Decision | Proposed handling / reason | Files if separately approved | Effort / risk / Figma |
|---|---|---|---|
| Three PRD tabs versus existing four tabs | Keep the documented four-tab implementation during the UI slices. To fully satisfy FR-36, discuss restoring Borrowing/Lending/My listings and pending owner requests within Lending. That would require changing existing query/filter organization, which is outside the UI-only boundary. | `MyListings.jsx`, `RequestList.jsx`, navigation/back links; data-query changes would need separate scope | 3–5 hours / high: existing decision and data organization; three tabs would restore S11, but require explicit reconciliation. |
| Standalone `/rules` — A09 | **Defer.** `docs/manual-tests.md` records deliberate removal of `/rules` in favor of the signup dialog. Choose whether to restore the PRD route or retain that approved behavior. If restored, reuse `communityRules` verbatim, keep the dialog available, and use shared content rendering. | New `src/pages/CommunityRules.jsx`, `src/App.jsx`, `RouteEffects.jsx`, shared rules content and styles | 1–2 hours / low technically, medium decision risk; route is in PRD, composed page has no supplied Figma frame. |
| Landing artwork/composition — A13 | **Defer new artwork** until the team supplies an asset or explicitly authorizes generation. Optional separate layout slice: restore the S01 hero proportion while checking a short desktop viewport; the current compact landing and removed footer are recorded prior decisions. | `Landing.jsx`, `variables.css`, `global.css`, supplied local asset if approved | 1–2 hours plus asset work / medium: larger hero may restore vertical scrolling. Layout would restore S01 proportions but alter the recorded compact composition. No footer restoration proposed. |
| Desktop signup composition | Keep the current stacked form for this pass. Optional separate slice can restore S02's wider introduction/form arrangement, with photo remaining after confirmation per PRD. Never render Figma's internal “Design notes” as product content. | `SignUp.jsx`, `variables.css`, `global.css` | 1–2 hours / low–medium; wider layout follows S02, post-confirmation photo is a necessary PRD-over-Figma flow difference. |
| Guest calendar / Title A–Z | Preserve current interactions during the recommended slices. Decide separately whether guest dates should be readonly and whether the existing extra sort is retained. | `ItemDetail.jsx`, `Browse.jsx` | 0.5–1 hour / medium decision risk; guest readonly/Newest-only would align more closely with references/PRD. |
| Responsive photo sources / backend changes | Lazy-loading is in Q3; additional image derivatives, Supabase transformations or new response fields are deferred. No `srcset` is invented from a single source. If existing profile reads cannot supply M2 data under real permissions, report the issue and stop that portion rather than edit policies/RPCs. | None authorized | Needs separate scope and free-tier review. |

## Proposed implementation order and gates

Priority within the effort groups is reflected below. Each numbered row is a separate review gate; larger rows are explicitly split. Commit only the relevant slice and its manual-test update. Existing unrelated/untracked files and reference SVGs are excluded.

| Gate | Scope / suggested commit | What the user reviews |
|---|---|---|
| 1 | Q1 — `style: apply Borrowhood palette and status hierarchy` | Palette, contrast results, all status/trust chips, focus/hover and reduced-motion behavior; default and Example theme |
| 2 | Q2 + M1 — `feat: preserve shelf filters and clarify guest browsing` | Guest/verified shelf, URL/back/refresh behavior, filter sheet/chips/reset, counts and empty state |
| 3 | M2 — `feat: show participant trust at request decisions` | Request and item-request summaries with real accounts; loading/failure does not imply a trust badge |
| 4 | M3 — `fix: clarify activity tasks and deadlines` | Action labels, due/late messages, pending counts; four-tab decision still outstanding |
| 5a | M4 shared Field + signup — `fix: make signup requirements and errors visible` | Required markers, native validation, field-specific errors, focus and preserved form values |
| 5b | M4 remaining forms + M5 — `fix: clarify form errors and photo processing` | Post/edit, request, condition, profile and rejection forms, photo limits/previews/statuses; split further if real-account verification exposes issues |
| 6a | L1 public pages + Q3 — `style: stabilize shelf and item loading states` | Public initial loading/filtering/load-more/error layouts and eager/lazy image behavior |
| 6b | L1 private pages — `style: stabilize activity and account loading states` | Real private initial/refresh/empty/error states; source-only coverage is explicitly reported |
| 7 | L2 — `feat: improve calendar keyboard navigation` | Focus order, month boundaries, blocked dates, selected summary and touch interaction |

Stop after each gate; do not start the next gate until the user has reviewed and authorized continuation. Approval can select a subset of changes. Approximate total engineering effort for all recommended changes is **18–30 hours**, excluding the team's private-state QA and deferred decisions; these are estimates, not a delivery guarantee.

## Verification required at every implementation gate

1. Run `pnpm dev` using its printed URL. Review affected screens at **390px, 768px and 1440px**, including the relevant loading/empty/error/success states; verify no horizontal scroll, readable 16px mobile inputs, 44px controls and safe-area clearance.
2. Operate the affected journey with keyboard only: Tab/Shift+Tab order, visible focus, Enter/Space, Escape, dialog inertness and return focus. Check status/error announcements and reduced motion where relevant. For global Q1 changes, sweep every available screen; explicitly list protected screens still requiring team checks.
3. Run README checks exactly: `pnpm check:tokens`, `pnpm check:requests`, `pnpm check:trust`, `pnpm build`. Show exact errors if a command fails; fix only causes within the approved slice. Token/build success is not accessibility or live-database certification.
4. Append clear reproduction steps and actual outcomes to `docs/manual-tests.md`. Preserve historical notes and security procedures; label prior statements superseded by an approved slice. Record untested protected states and real-account steps separately from passed checks.
5. Capture useful local screenshots outside Git, report affected files, checks and remaining limitations, and make one clear Conventional Commit for the completed slice. No secrets, `.env`, generated `dist`, dependencies or screenshots in the commit.

Use the team's Supabase sessions and real test records for protected-state validation. If those are unavailable, continue independent public/layout/component work and report exactly which screenshots/interactions could not be checked. Do not generate records, change databases, or mark source inspection as a passed browser check.

## Phase 2 outcome

This document is the only new deliverable for this phase. No source changes or implementation commits were made, and README checks were not rerun for a documentation-only plan; their passing Phase 1 results remain recorded in the audit. A read-only search initially used unsupported Windows wildcard paths and returned `The filename, directory name, or volume label syntax is incorrect. (os error 123)`; rerunning with `rg` file filters succeeded.

**Approval requested:** approve the recommended Q1–Q3, M1–M5 and L1–L2 slices, including their explicitly marked Figma presentation/interaction extensions and proposed wording/palette, or name the subset to implement. The recommended first implementation is **Gate 1 only**, followed by review. Items in “Needs approval — excluded” require a separate explicit decision.
