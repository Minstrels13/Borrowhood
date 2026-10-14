> Implementation update: remaining Phases 5–7 were authorized on 14 October 2026. See `remaining-phases-plan.md`, `remaining-phases-setup.md` and `qa-review-gate.md` for the current implementation and full review gate. Earlier status/findings below are historical.

# Borrowhood website review — 14 October 2026

The main borrowing screens are connected and the recent changes are present. The biggest remaining problems are navigation dead ends, finding pending owner requests, seeing status changes, and protecting unsaved work. I would address these before adding more screens.

This is a review only. Application code, accounts and database records were not changed.

## What was checked

- The running local site's actual guest landing, shelf, item details, signup, login, community rules and photo viewer. Public listings loaded from the configured Supabase project.
- Private screens using the actual components under React Strict Mode with temporary, read-only local adapters: posting, photo submission, rejection, admin queue, owner item detail, item requests, My Activity and borrower/owner request details. These previews used clearly identified sample content and made no private database calls.
- Layouts at **390, 767, 768 and 1440px**. A short **1440 × 768** viewport was also checked for the landing page.
- Routes, forms, navigation, status logic and the recent request migrations from source. The earlier context document was treated as reference; your later decisions take precedence.
- Production build, design tokens and request/date checks: all passed. The existing approximately 504 kB main bundle warning remains nonblocking.

This does **not** certify live login/email delivery, private RLS, Storage permissions, applied migration versions, real simultaneous approvals or the Vercel deployment. Those still need the team review gate. No migration was applied during this review.

## Fix first

### 1. Approved students have no usable Edit profile entry

**Confirmed from source and the signed-in preview.** The Shelf's Edit profile button was removed as requested, but its replacement has not been connected. The desktop account icon goes back to the Shelf. Mobile Profile shows “Use Edit profile on the shelf for now,” although that button no longer exists. The existing edit dialog is reachable only through verification screens, which redirect approved users away.

**Impact:** approved students cannot update their name, course or photo through the current interface, despite that behavior being supported by the database.

**Recommendation:** connect the account icon/Profile control to a usable account entry with Edit profile. Keep it available until the full Phase 5 profile page replaces it. Remove the stale toast.

**Acceptance:** an approved student can edit their details from mobile and desktop, and remains approved afterward.

### 2. Activity navigation bypasses the new Requests default

**Confirmed from source.** Opening `/activity` defaults to Requests, but both the desktop My Activity control and mobile Activity control explicitly open `/activity?tab=listings`.

**Impact:** borrowers entering Activity to check a request land in their listings instead. The navigation does not support the new organization consistently.

**Recommendation:** make the main Activity entry open Requests, or restore the user's last Activity tab. Keep Publish → My listings, which matches your earlier decision.

**Acceptance:** the main Activity controls have the same predictable destination at every width; publication still goes to My listings.

### 3. Navigating away still discards unsaved form work

**Confirmed from source.** Posting/editing and request dialogs retain values in component state. There is no dirty-form navigation guard or reload warning. Navbar and bottom navigation remain usable while editing and during listing saves.

**Impact:** switching windows has been addressed in the Auth logic, but clicking Browse, Activity, Back or reloading can still lose a draft. Leaving during a save can also obscure whether it succeeded.

**Recommendation:** protect dirty forms with a clear discard/stay choice; make the saving state consistent with navigation. Small draft persistence could be considered later if needed.

**Acceptance:** entering a title or condition note, then navigating away, gives a deliberate choice. Normal window switching does not discard the form. Test the latter with a real signed-in session.

### 4. Expired confirmation links silently become the login page

**Confirmed in the actual local site.** Opening `/pending` with an expired-link error in its URL leads to an ordinary “Welcome back” form. The reason the link failed is not shown. Source contains no handling of that callback error.

**Impact:** a new student cannot tell whether verification worked, whether to log in, or whether a replacement link is needed.

**Recommendation:** show “This confirmation link has expired” with a clear login/resend recovery path. Preserve the intended destination when a private link sends someone through login.

**Acceptance:** expired and invalid links explain the problem and offer an action. A valid confirmation still follows Email → Photo → Admin review → Verified.

## Improve the borrowing flow

### 5. Waiting users have no clear way to refresh a healthy request page

**Confirmed from source; live timing needs team QA.** Request detail and Activity load on entry. Successful actions refresh the acting user's page, but an owner approving elsewhere does not update the borrower's already-open request page. A healthy request detail has no Check status/Refresh control. Activity also has no explicit refresh control. The per-item owner request page does have one.

**Recommendation:** add a lightweight status refresh action to request detail and Activity. A quiet refresh on returning to the page could also work if it preserves forms, scroll and existing content.

**Acceptance:** the borrower can discover approval without guessing that browser reload is required. Background updates must preserve open drafts.

### 6. Owners must hunt through listings for pending requests

**Flow improvement.** Lending correctly contains accepted/ongoing loans now. Pending requests are found through My listings → item → View requests. My listings cards currently show Edit listing but no request count or direct request-list link.

**Recommendation:** add View requests and a pending count to owned listing cards. This keeps the new tab meanings intact and makes incoming requests easier to find.

**Acceptance:** an owner can identify which item needs attention directly from My listings, including when Lending is empty.

### 7. Listing edits can change information shown on an existing loan

**Confirmed from source; the preferred rule needs a product decision.** Request detail reads the listing's current title, rental label and meetup note. Owners can edit those fields after approval. There is no saved copy of the agreed details in the request.

**Impact:** the borrower may later see a different price label or meetup location from the one they accepted. No in-app payment handling is involved, but the agreement becomes unclear.

**Recommendation:** decide whether active loans should retain agreed details, or whether relevant listing fields should be restricted during an active loan. New listing edits should have a clearly defined effect on existing requests.

**Acceptance:** changing a listing does not silently change an existing borrower's understanding of the agreement.

### 8. The owner's calendar behaves like a borrower date picker

**Confirmed in the signed-in preview and source.** Owners see “Your dates” and “Choose a start date, then a return date,” and can select a borrowing range for their own item. The action below it is View requests/Edit listing, so the selection has no outcome.

**Recommendation:** show a read-only availability calendar for owners, with copy about reserved dates. Keep date selection for borrowers.

**Acceptance:** every owner calendar instruction describes an action that actually exists.

## Improve the layouts and presentation

### 9. The 768px shelf is cramped despite fitting horizontally

**Confirmed in the actual site.** At 768px, the layout immediately uses a 200px filter sidebar and three cards of approximately **155px** each. Titles, rental labels and owner information wrap heavily. At 1440px the three-column layout is comfortable.

**Recommendation:** let the card grid adapt to available content width, showing fewer columns near the desktop breakpoint. The 768px navigation breakpoint can remain unchanged.

**Acceptance:** cards near 768px have a readable image/title/owner hierarchy without unnecessarily fragmented text.

### 10. The landing page still exceeds laptop height

**Confirmed in the actual site.** At 1440px wide, the page measured approximately **980px** tall. That means about 80px of scrolling in a 900px-high viewport and 212px in a 768px-high viewport. At 768px wide it measured approximately 1106px tall. Mobile naturally needs a vertical page.

**Recommendation:** reduce the hero's height and section spacing for short desktop viewports, and make the illustration size more flexible. Keep text readable when users zoom. Choose the intended laptop height as an acceptance target rather than relying on the 1440px design width alone.

**Acceptance:** test the agreed laptop width **and height** at normal zoom. Content remains accessible at increased text size.

### 11. Some controls promise unfinished destinations

**Known phase limitation with a UX consequence.** Verified students clicking an owner's name get a Phase 5 toast rather than a profile. Profile navigation also remains unfinished. Item details contain “Comments will be available in Phase 6.” The landing page already advertises a visible trust reputation, while owner badges are currently New placeholders.

**Recommendation:** finish these in their planned phases before presenting the app as complete. During QA, use brief user-facing availability wording and keep development-phase details in the review notes. Treat full profiles, trust calculation, condition-history tabs and comments as unfinished scope, rather than bugs in the completed phases.

### 12. Small clarity and accessibility improvements

- Give the guest wall context: clicking a profile should explain that full profile details require a verified login. It currently mentions posting/requesting/commenting only. Its **16px text is now consistent** from both entry points.
- Mark the current bottom-navigation destination visually and with an accessible current-page state. The bottom buttons currently have no selected state.
- Give route changes a useful page title and predictable heading focus. All routes currently keep the same Borrowhood title, and there is no route-focus/scroll restoration handling.
- Use compact condition-record placeholders before handover. Two large empty record cards add a lot of page length to Requested, Declined and Cancelled requests. Keep the full side-by-side comparison once records exist.
- Add previous/next photo controls inside the viewer as optional polish, so users do not need to close it to inspect another listing photo. Fit/Actual size should remain available.
- Make admin instructions achievable: a numeric student email cannot by itself establish that the name matches. Ask reviewers to check the student email, photo and submitted details rather than imply a name-to-email comparison proves identity.
- Give admin row values explicit accessible labels. The desktop headings are hidden from assistive technology and the rows are articles, so a screen reader does not receive native table header relationships.

## Check against your requested changes

| Request                                                                  | Current result                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remove footer; make Borrowhood clickable                                 | Present. Guest logo goes to landing; signed-in logo goes to Shelf.                                                                                                                                                                       |
| Mobile below 768px; desktop from 768px                                   | Present. This is intentional. The narrow desktop shelf still needs better card widths.                                                                                                                                                   |
| No campus field                                                          | Present in the current forms/profile data presentation.                                                                                                                                                                                  |
| Community rules in a modal; revised rule 7                               | Verified in the actual signup screen. No separate rules route is wired.                                                                                                                                                                  |
| Signup photo after email confirmation; four verification steps           | Present in source and private previews. Real confirmation/submission still needs live QA.                                                                                                                                                |
| Rejected students can update and resubmit                                | Present in source/preview. Server denial checks remain part of QA.                                                                                                                                                                       |
| Approved students keep approval after editing                            | Supported by the profile function, but the approved-user edit entry is currently missing. See issue 1.                                                                                                                                   |
| Remove Edit profile from Shelf                                           | Done. The missing replacement is a consequence to fix elsewhere.                                                                                                                                                                         |
| Larger clickable owner name and larger photo                             | Present on item detail. Full verified profile destination remains Phase 5.                                                                                                                                                               |
| Guest profile modal text matches Request to borrow modal                 | Verified: both use 16px body text.                                                                                                                                                                                                       |
| Full-size photo viewer compatible with four widths                       | Actual loaded photo fits at all four widths; mobile is full screen, desktop is centered. Actual size scroll mode and Escape dismissal worked.                                                                                            |
| Condition-record presentation                                            | Revised aligned cards are present. Completed state was reviewed in a local preview; real condition-photo upload/read tests remain pending.                                                                                               |
| Existing borrow request replaces repeat Request to borrow                | Present in frontend and migration 023. Only Declined permits a new request, including after automatic decline. Live two-tab denial still needs QA.                                                                                       |
| Owner View requests for one item                                         | Present, including the two mobile owner actions and pending/all filters. Owner-only RPC is defined in migration 024; live access tests remain pending.                                                                                   |
| Approval automatically declines affected requests                        | Migration 024 updates only overlapping Requested rows in the approval transaction. Inclusive boundaries and item locking are present. Real simultaneous approval testing remains pending.                                                |
| Requests tab; Borrowing/Lending contain accepted active loans            | Query filters match the request. Requests has Pending/Past; active tabs include Approved/Handed over and derived Overdue. Main navigation still bypasses the Requests default.                                                           |
| No page reset when switching windows                                     | Same-account Auth events now preserve the loaded profile, which addresses the previous remount path. Real expired-session and draft-retention checks are still needed; navigation away remains unprotected.                              |
| Admin Approved/Rejected action alignment                                 | Desktop uses a shared centered grid row. Approved text centered with neighboring cells in the 768px preview; Rejected uses the same rendering. Long emails may wrap, consistent with the earlier reversal of forced single-line styling. |
| Edit route, direct approval, cancel destination, publication destination | Present: `/items/:id/edit`; direct approval with refresh/toast; cancel to item detail; publication to My listings.                                                                                                                       |
| No fake app listings/history                                             | The actual Shelf displayed user-entered data. Review samples existed only in temporary local adapters, which were removed.                                                                                                               |

## Recommended order

1. Fix the profile entry and main Activity destination.
2. Add status refresh and protect unsaved drafts.
3. Make pending owner requests discoverable on listing cards and clarify owner calendar copy.
4. Improve the narrow desktop shelf and short-laptop landing layout.
5. Add confirmation-link recovery and agree on how listing edits affect existing loans.
6. Continue the planned profile/trust/comments work, then finish the smaller accessibility and presentation improvements.

The existing combined Phase 3/4 gate still applies. Before closing it, the team should confirm migrations 023/024, duplicate prevention, owner-only access, overlapping approvals, unaffected dates, Storage security, real account/session recovery and actual Vercel deep links. Deferred photo-security QA remains deferred, not passed.
