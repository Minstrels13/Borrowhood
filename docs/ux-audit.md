# Borrowhood UI/UX audit — Phase 1

Date: 14 October 2026. **Review only; no application changes.** This report stops before Phase 2 planning and implementation.

## Sources and method

- Requirements: the user-supplied `C:/Users/USER/Downloads/Borrowhood Product Requirements Document.md`, read in full. `docs/PRD.md` is absent and explicitly superseded by that attachment.
- Rules: `C:/Users/USER/Downloads/CODEX.md`, read in full, plus the user's task boundaries. README supplies the run/check commands.
- Design: [Borrowhood Figma](https://www.figma.com/design/xAnO89bbZTBs6ircuqsf98/Borrowhood?node-id=0-1), live page metadata and a rendered S05 mobile screenshot; local desktop/mobile SVG text and dimensions across screen/modal families, with rendered S10b desktop/mobile inspection. The earlier Figma review provided historical flow context at the time of this audit; that superseded document has since been removed. This was not a pixel-by-pixel inspection of every Figma frame.
- Evidence: actual local app, public Supabase listings, DOM/accessibility observations, keyboard interactions, and source inspection. No mock users, generated content, private-session adapters, database writes, or account submissions were used.
- Severity: **high** affects a core trust/decision/task-discovery step; **medium** creates significant friction or a requirement mismatch; **low** is polish or efficiency. “Source” findings are not claims of live authenticated verification.

## Coverage and limits

| Screen/state | 390 px | 768 px | 1440 px | Keyboard / limitation |
|---|---|---|---|---|
| Landing `/` | Visual | Visual | Visual | Navigation controls inspected; no complete end-to-end keyboard sweep |
| Signup `/signup` | Visual + empty required-field submission | Visual | Visual | Empty submission correctly focuses Full name; rules dialog opens using Enter and closes with Escape. No account created |
| Login `/login` | Visual; 16px inputs measured | Visual | Visual | Email → password Tab order and visible focus checked; no credentials entered |
| Guest shelf `/shelf` | Populated, loading, filtered-empty, filters sheet | Populated/sidebar | Populated/sidebar | Enter opens filters, Tab/Space changes selection, Escape/Show items closes and returns focus. Search persistence checked against source |
| Guest item `/items/:id` | Visual; sticky action | Visual; two-column layout | Visual; two-column layout | Date buttons accept Enter; Oct 20–22 announces a three-day summary. Guest request prompt opens by keyboard. No request sent |
| `/rules` / not-found | Actual 404 inspected | Not visually tested | Not visually tested | Back-home recovery exists; expected rules route is absent |
| Pending/rejected `/pending` | Source only | Source only | Source only | Requires signed-in unverified account |
| Post/edit item | Source only | Source only | Source only | Requires verified owner; no upload/save tested |
| Request detail, all statuses and role variants | Source only | Source only | Source only | Requires participant accounts and real requests; modal layouts/handlers inspected in source |
| Activity and item requests | Source only | Source only | Source only | `/activity` redirected to login; no private data available |
| Own/other profile; admin queue | Source only | Source only | Source only | Requires appropriate signed-in accounts |

Public listings and photos loaded successfully. The limitation is the lack of a signed-in test session, **not** a confirmed Supabase outage. No horizontal overflow was observed in the public layouts inspected; measured checks included signup at 390/768, login at 390, landing at 768, and item detail at 768/1440. This does not certify every state, keyboard flow, zoom level, screen reader, or WCAG 2.2 AA compliance. Forced network failures, upload failures, real blocked dates, and authenticated success states remain untested.

## Findings

| ID / severity | Where and evidence | User impact | Reference |
|---|---|---|---|
| A01 **High** | Request detail participant cards render photo/name/course but no trust badge or profile link (`src/pages/RequestDetail.jsx`, source). S10b shows trust beside both people. | Owners lack the borrower's reputation at the approval decision; borrowers cannot inspect the owner from this summary. Do not infer or invent a badge if the current response lacks trust data. | PRD goals 4–5, FR-31; S10a–f; recognition rather than recall |
| A02 **High** | Activity rows show status plus generic “View request,” without “Needs your action,” the other participant, or a due/late summary (`RequestList.jsx`, source). Pending owner requests are reached through My listings → View requests. | With no notifications, students can overlook approvals, handovers, and returns or confuse waiting with action required. | FR-36, FR-38; S11a/b; visibility of system status |
| A03 **Medium** | Shelf search, sort and filters live only in component state (`Browse.jsx`). Selecting Calculators left the URL at `/shelf`; returning from an item reset the selection. | Back/refresh loses browsing context and makes students repeat their search. | User browsing checklist; user control and freedom; FR-10 |
| A04 **Medium** | Mobile shelf has no applied-filter chip/count. “Other” produced zero results with “clear the filters” copy but no clear action in the empty panel. Clear filters is inside the sheet and does not clear search. | Students cannot tell why items disappeared or recover directly. | S05/S05G mobile, F01; recognition rather than recall; user browsing checklist |
| A05 **Medium** | Guest shelf shows Browse/Post/Activity/Profile bottom navigation and a prominent Post an item button, without the S05G guest guidance strip (browser + `PageShell.jsx`). | Three tab actions lead to a verification wall; posting competes with the guest's browsing task and the eligibility boundary appears only after interaction. | PRD §8: guests have no tab bar; S05G; error prevention |
| A06 **Medium** | Shared Field does not render visible required markers. Signup's custom domain/password mismatch errors are one alert below the form rather than attached to their fields; native empty-field validation does work (`Field.jsx`, `SignUp.jsx`, browser/source). | Requirements are discovered on submission; on a phone the relevant field and custom error can be far apart. | S02/S08/M04/M05; form checklist; WCAG 3.3.1/3.3.2 |
| A07 **Medium** | Default tokens are grayscale (`--color-primary: #262626`; all status/trust fills are gray). Public pages confirm this. Overdue uses a dashed outline shared with other states and the common chip border width. Phase 2 source reinspection corrected the original attribution of an existing exclamation mark and heavier border: those cues are still missing. | The app still looks like a wireframe; brand identity and urgency hierarchy are weak. Token-check success does not validate palette intent. | PRD §§10–11; required maroon/clay/mist palette and overdue treatment |
| A08 **Medium** | Initial data/loading states are mostly text replacing large sections, including item detail, requests, profile and shelf. Shelf clears the cards while filtering (browser/source). | Content jumps between a short loading message and the final layout; browsing feels less stable. Error/retry branches exist, so these states are not wholly missing. | PRD §10; loading/skeleton and perceived-performance checklist |
| A09 **Medium** | `/rules` returns Page not found. Rules are available only through the signup dialog (`App.jsx`, browser). | The documented standalone rules destination cannot be revisited or shared; the consent dialog itself remains usable. | PRD §8 routes; consistency and standards |
| A10 **Medium** | Post-item and condition-photo submissions expose only “Saving…” during compression/upload; file type/10MB constraints appear after an invalid selection rather than in the initial helper text (source). | Students on slow connections cannot distinguish photo processing from a stalled save. Previews/removal and input retention already exist. | FR-16; upload feedback checklist; visibility of system status |
| A11 **Low** | Calendar has a separate Tab stop for every available day (18 in the inspected month); no arrow-key navigation (`AvailabilityCalendar.jsx`, browser/source). | Reaching controls after the calendar takes many keystrokes. It is operable, so this is an efficiency issue, not a proven keyboard-access failure. | Keyboard-friendly flows; flexibility and efficiency of use |
| A12 **Low** | Listing photos have reserved aspect ratios but no `loading="lazy"`, responsive source selection, or `sizes` (`ItemPhoto.jsx`, source). | More offscreen images can load than a phone needs as the shelf grows. No transfer-time benchmark was taken. | PRD free-tier/performance constraints; image checklist |
| A13 **Medium** | Landing visibly retains a crossed placeholder labeled “Hero illustration: a handover at the library.” Desktop hero artwork is also much smaller than the S01 reference's 560×340 area. | The first impression is unfinished and the illustration does not explain the product. Existing placeholder is consistent with the low-fidelity reference, but not a finished visual asset. | PRD §11; S01; aesthetic/minimalist design |

## Existing differences requiring reconciliation — needs approval

These are observations, not authorization to change scope, data rules, or prior decisions.

- **Activity organization:** PRD FR-36 and S11 specify three tabs. The app has four, following the user-approved direction: Requests, Borrowing, Lending and My listings. Reconcile that prior direction with the supplied PRD before planning any regrouping or query changes. Do not silently revert it.
- **Signup/layout:** desktop S02 uses a wider two-column composition; the app uses the same narrow stacked form as login. S02/S04 also show photo collection earlier than the attached PRD. The current post-confirmation photo flow follows the PRD and must remain. Any layout revision needs an explicit Figma-deviation note; no auth change is proposed.
- **Guest dates and extra sort:** the guest item calendar allows date selection where the guest reference is read-only, and the shelf includes Title A–Z in addition to PRD's Newest. Record/resolve these existing differences before changing them.
- **Trust data:** A01 must use already-authorized data. If adding request badges requires expanding a backend response or access policy, it needs separate approval and is outside this UI-only task.
- **Artwork and palette:** a new illustration or licensed local font needs supplied assets or explicit approval; no generated/external content was added. The requested derived brand tokens are not present in the current default token file, so their values need review in the future plan.
- **Tablet:** the public 768px layouts fit the observed content. Signed-in header, four Activity tabs, long names/emails, six-column admin queue, and post-form preview still need live verification. No new breakpoint or tablet design was invented.

## Strengths to preserve

Native dialogs and named close buttons; focus restoration in the tested filters flow; visible focus rings; labeled 16px inputs; status text and border variants; accurate inclusive-date summary; payment-in-person wording; public owner photo/trust summaries; image aspect-ratio reservation; mobile sticky request action; and an action-first mobile request layout in source. Request state logic supplies next steps for both roles. Existing errors generally have retry paths, and destructive actions use dialogs. These should be refined, not replaced wholesale.

## Checks and environment

README commands used unchanged: `pnpm dev`, `pnpm check:tokens`, `pnpm check:requests`, `pnpm check:trust`, `pnpm build`. All four checks passed; production build transformed 160 modules. Existing dependencies were used; no install was necessary. README/package configuration consistently use pnpm; setup docs mention “npm packages” generically but no mixed npm/pnpm execution instructions were found. `.env` exists and was neither read nor modified.

Initial sandbox dev server reported 5173 but was unreachable by the browser. Running the same README command outside the sandbox started a reachable server at 5174 because 5173 was occupied. Exact diagnostic errors encountered, retained without attributing them to product defects:

```text
Browser reported: net::ERR_CONNECTION_TIMED_OUT
Invoke-WebRequest: An attempt was made to access a socket in a way forbidden by its access permissions.
rg: docs/*setup*: The filename, directory name, or volume label syntax is incorrect. (os error 123)
ParserError: An empty pipe element is not allowed.
```

The latter two were audit-command syntax/glob mistakes, corrected without changing project files. One browser filter interaction also failed while the viewport targeted the reference tab:

```text
Timed out after 3000ms waiting for selector internal:role=button[name="Filters"s]
Error: No element matched selector
```

After closing the reference tab, the app viewport was measured at 390px and the filter check succeeded. Temporary viewport overrides were reset. No check failures or dependency changes occurred.

## Local screenshots

Screenshots are local evidence outside the repository, following README's exclusion of screenshots from commits. They show real existing public content, not demo data.

- [Landing at 1440px](C:/Users/USER/.codex/visualizations/2026/10/14/01a13a3b-345e-7131-9298-53cf7ee703a5/landing-1440.png)
- [Signup at 390px](C:/Users/USER/.codex/visualizations/2026/10/14/01a13a3b-345e-7131-9298-53cf7ee703a5/signup-390.png)
- [Shelf at 390px](C:/Users/USER/.codex/visualizations/2026/10/14/01a13a3b-345e-7131-9298-53cf7ee703a5/shelf-390.png)
- [Filtered empty shelf at 390px](C:/Users/USER/.codex/visualizations/2026/10/14/01a13a3b-345e-7131-9298-53cf7ee703a5/shelf-empty-390.png)
- [Item detail at 1440px](C:/Users/USER/.codex/visualizations/2026/10/14/01a13a3b-345e-7131-9298-53cf7ee703a5/item-1440.png)

## Team checks still required

At **390, 768 and 1440px**, using keyboard only as well as touch/mouse:

1. With a real unverified/rejected account, check email/photo/review progress, correction/resubmission, upload errors, and focus after closing Edit profile.
2. With a verified owner, inspect post/edit forms, photo replacement, rental labels, inline errors, preserved drafts, preview and publication recovery. Do not publish disposable/generated listings for this audit.
3. With owner/borrower accounts and existing requests, inspect every status including overdue, declined and cancelled; confirm actor guidance, trust visibility, deadlines, condition comparison, modal focus order and toast placement. Perform state-changing acceptance steps only on team-designated test records.
4. Check Activity action discovery, long titles and four-tab wrapping, profile/history empty/error states, and admin queue long email/course layouts. Confirm disabled approvals explain the missing prerequisite.
5. Check blocked/cross-month date ranges, calendar traversal, photo viewer, every modal's Escape/Tab/Shift+Tab/focus return, network-error retries, load-more, screen-reader announcements, zoom/reflow and safe-area devices. Shared modal source inspection is not proof that every dialog passes.

**Review gate:** audit delivered with the above coverage limits. No `ux-plan.md`, implementation slice, source commit, or manual-test rewrite has been made. Wait for the user before Phase 2.
