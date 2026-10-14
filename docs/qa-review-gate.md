# Borrowhood — all-phases QA review gate

This is the current checklist for **Phases 1–7**, including the later changes to requests and My Activity. This is the consolidated team checklist. Implementation is ready for review; unchecked tasks are not assumed passed.

## Before testing

The project lead applies the new migrations using `remaining-phases-setup.md` and prepares the Vercel QA link. Use real team BulSU accounts: admin, owner and borrower. The competing-requests test also needs a second verified borrower. An admin can fill that role only if their account is also verified.

Use separate browser profiles or browsers for each account. Enter your team's actual items and messages. Check **390, 767, 768 and 1440 pixels**, plus a short laptop view such as **1440 × 768**. Record the browser, account role and screen size with every bug.

## Phase 1 — shared screens and navigation

- [ ] Borrowhood is clickable: guests go to landing, signed-in students go to the Shelf. There is no footer.
- [ ] Mobile uses the slim header/bottom navigation; desktop starts at 768px. The current bottom-navigation section is marked. Item detail has its own bottom action bar.
- [ ] Text, pictures, forms and buttons fit without sideways scrolling. The Shelf remains readable at 768px. Check long item names and student names.
- [ ] Landing retains the desktop scale on laptop screens; shorter screens may scroll vertically. Mobile and enlarged text can scroll naturally without losing content.
- [ ] Keyboard users can reach controls and identify focus. Dialogs keep focus inside and return it after closing. Check X, Escape, backdrop and Cancel.

## Phase 2 — signup, verification and account corrections

- [ ] Signup accepts a BulSU student email and requires matching passwords and agreement to the rules. Read community rules opens a dialog, keeping entered form values.
- [ ] Signup has no photo field. Confirm the email, log in, add a clear profile photo, then submit for admin review. The steps are Email, Photo, Admin review, Verified.
- [ ] Pending students can browse but cannot post an item, send a request or comment. Attempted actions explain verification requirements.
- [ ] Admin sees submitted students, can search, refresh and load more. Approval is direct and shows success. Rejection requires a reason; the student sees it and can update details/resubmit.
- [ ] Rejected students can change their own name, course and photo, then resubmit. They cannot approve themselves or interact with listings until approved.
- [ ] Approved students reach the Shelf. They can open their own Profile and Edit profile from mobile and desktop. Editing name/course/photo keeps approval. No campus field appears.
- [ ] Expired/invalid confirmation links explain the problem and provide a way to request another link or log in. Logout returns to landing.

## Phase 3 — listings, photos and browsing

- [ ] A verified owner posts an item with its category, honest condition, maximum days, meetup note and Free/For rent choice. Rental price is a text label; the app never collects money.
- [ ] Check up to three photos, invalid/large files, removing/replacing photos and mobile Preview. Publication goes to My Activity → My listings.
- [ ] Guests can browse actual listings, search, sort and filter. Check no-results, no listings, failed loading, Retry and Load more.
- [ ] Item detail shows the correct content and owner. Clicking the owner's name opens their profile for a verified student and the verification dialog for a guest.
- [ ] Click each photo: fit mode shows the whole picture; Actual size allows exploring it; closing works at all four widths. Nothing is clipped behind the header or controls.
- [ ] Owner Edit listing opens the correct item. Cancel returns to item detail. Other students cannot edit it. Failed saving retains entered details and selected photos.

## Phase 4 — requesting, approval, handover and return

- [ ] Borrower selects valid dates, optionally writes a message and sends. The request opens with a unique reference such as BH-0142. The owner cannot borrow their own item.
- [ ] Past dates, reversed dates, unavailable dates and dates beyond the listing's maximum are rejected. Same-day borrowing counts as one day; both start and return days count.
- [ ] After sending, item detail shows View your request instead of another request form. Requested, Approved, Handed over and Returned still open the existing request. Declined or Cancelled allows a new request for that item.
- [ ] Cancel a Requested or Approved request, then request the same item again with valid dates. A new request and reference are created; the cancelled request stays in Past requests. Once the new request is sent, another submission is blocked, including from a second tab.
- [ ] Owner clicks View requests on the item or My listings card. Pending/All requests, borrower names, messages, dates and View request links work. The owner calendar explains reservations without asking the owner to pick borrowing dates.
- [ ] Owner approves directly. The selected request becomes Approved and its dates become unavailable. Borrower can Refresh status to see the result and meetup details.
- [ ] Two different borrowers request overlapping dates before approval. Approving one automatically declines the other with a visible availability reason. A shared start/return day also overlaps. Requests beginning the next day stay pending.
- [ ] Project lead: try overlapping approvals from two owner windows. Exactly one is approved; the competing pending request is declined. A stale approval cannot reverse that result.
- [ ] Manual decline requires a reason the borrower can see. Borrower can cancel while Requested/Approved; success returns to item detail and releases any reserved dates. Closing confirmation makes no change. Cancelling after handover is unavailable.
- [ ] Owner confirms handover with condition notes and in-person confirmation; a photo is optional. Borrower sees the due date and no handover/return actions.
- [ ] Owner receives the item and confirms return as Good, Minor wear or Damaged, with optional notes/photo. Both see completed records. Handover/return pictures are uncropped and can be enlarged.
- [ ] Project lead prepares an overdue example using the documented SQL procedure. Owner sees days late and Confirm return. Borrower sees the overdue reminder without actions. Overdue starts the day after the due date in Philippine time.

## Phase 5 — Activity, profiles, trust and deletion

- [ ] Requests → Pending shows borrower requests awaiting approval. Requests → Past requests retains declined, cancelled and completed borrower activity.
- [ ] Borrowing/Lending show approved, handed-over and overdue loans only. Refresh activity updates results. Owner My listings shows pending request counts and View requests.
- [ ] Own and other verified profiles show the correct photo, name, course and membership date, with Listings and Condition history tabs. Empty states and Load more work.
- [ ] Trust reflects completed **borrows**, not items lent. No completed borrows gives 100/New. Each late return deducts 8; each damaged return deducts 15; minor wear deducts nothing; the score stops at zero.
- [ ] Check the badge against actual counts: under 70 is Needs attention; at least five completed borrows and at least 90 is Trusted; other students with completed borrows are Reliable.
- [ ] Condition history shows real completed borrowing/lending summaries. Other verified students see summaries, while private notes, messages and evidence remain accessible only to the request participants.
- [ ] Delete an owned Free or For rent listing with no approved or ongoing loans from item detail or My Activity → My listings. Confirm deletion from item detail returns to My listings, removes it from public browsing and owned listings, and retains request/condition history. Keeping the listing or closing the dialog makes no change. Check the controls at all four widths.
- [ ] Delete listing is visually separate from View requests/Edit listing, with red text and a trash icon. Pending requests do not disable it; the confirmation explains they will be declined automatically. The confirmation names the item, explains that it cannot be restored in the app, and initially focuses Keep listing. While deleting, repeated confirmation and closing make no change.
- [ ] Delete a listing with pending requests. Each becomes Declined with “Listing removed by owner.” The borrower sees it under Requests → Past requests and can still open its detail. Existing declined, cancelled and returned requests remain unchanged. No request is erased.
- [ ] Approved and handed-over/overdue loans block deletion. If the listing also has pending requests, a blocked deletion leaves those requests pending. Another student cannot delete an item. Rental terms and meetup details cannot change during an approved/ongoing loan; unrelated listing edits remain possible.
- [ ] Project lead: try approving and deleting from two owner windows at the same time. If approval succeeds, deletion is blocked. If deletion succeeds, pending requests are declined and cannot be approved afterward.

## Phase 6 — questions and comments

- [ ] Guests can read comments on published items. Guests and unverified students clicking Ask a question get the verification dialog.
- [ ] Verified students can post a relevant comment. It shows the correct author and time, appears after posting, and can be found after refresh. Check Refresh comments and Load more.
- [ ] Empty/whitespace comments and comments longer than the limit are rejected. HTML-like text stays plain text. A failed post keeps the draft.
- [ ] There are no comment edit/delete actions. Deleted/hidden listings do not expose their comments publicly.

## Phase 7 — recovery, privacy and final polish

- [ ] Switch windows while editing a listing, profile, request message or condition notes. The draft stays. Refreshing a request does not reload the whole application.
- [ ] With unsaved changes, navigate away, press Back, close a dirty dialog or log out. Stay here preserves the draft; Discard and continue performs the chosen action. Reload/closing the browser offers its normal unsaved-changes warning.
- [ ] Saving disables duplicate actions. Leaving while saving explains that the operation is still running. Failed saves show a usable error and preserve input.
- [ ] Open private links while logged out, log in, and reach the intended permitted page. Test missing items/profiles/requests, expired sessions, failed account loading and Retry.
- [ ] Guests/unverified students cannot open full profiles/history or private requests. Another verified student cannot read private request messages/evidence or use owner-only request lists. Admin status alone does not grant private loan access.
- [ ] **Assigned QA/lead security check:** try foreign photo folders, overwrites, another pending student's photo, assigning another student's photo, deleting referenced evidence, profile role/status changes and direct request/comment writes. Each forbidden action must fail at the server. Owned unused uploads can be cleaned up. The previously deferred Phase 2 photo test stays open until QA records its result.
- [ ] Test the actual Vercel link: reload item, request, profile and Activity URLs; check signup/confirmation redirects and all account roles. Localhost success does not count as a hosted pass.
- [ ] Project lead checks the Example brand theme in the local UI preview, keyboard focus and text contrast. There are no fake records, public secrets, payment collection, report buttons or chat features.

## Record results

For each section, record **Pass / Fail / Not tested**, tester and date. Do not mark skipped security or hosted checks as passed.

For a bug, send:

```text
Phase / screen:
Account role:
Browser / screen size:
Steps:
Expected:
Actual:
Screenshot:
```

Do not include passwords, session tokens or private keys. All phases pass the release gate only after the team completes these checks on the configured QA deployment and resolves release-blocking bugs.
