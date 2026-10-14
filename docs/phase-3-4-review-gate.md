# Borrowhood — Phase 3 and 4 testing checklist

## 1. Posting and browsing

- [ ] **Post an item.** Fill in its name, category, condition and maximum borrowing days. Try Free and For rent. For rent should require a price description. Publishing should show a success message and open My Activity → My listings.
- [ ] **Missing details.** Try submitting without required information. The website should explain what is missing and keep your other entries.
- [ ] **Photos.** Try no photo, one photo and three photos. Preview/remove should work. A fourth photo, unsupported file or photo larger than 10 MB should show an error without removing valid selections.
- [ ] **Edit and cancel.** Change your listing and save. Refresh: changes should remain. Cancel should leave the saved listing unchanged. You should not be able to edit someone else's listing.
- [ ] **Switch windows.** Enter unsaved changes and select a photo. Switch to another window/tab, then return. Your entries and selected photo should remain. Repeat with a borrowing or handover form. This does not cover intentionally refreshing the page or logging out.
- [ ] **Search and filters.** Search by name, try categories and Free/For rent, change sorting, then clear filters. Results and counts should match. No results should show a useful message.
- [ ] **Item details.** Check the title, condition, meetup, owner name/photo and item photos. Different thumbnails should show different photos.
- [ ] **Photo viewer.** Click the main photo. The whole photo should fit first. Actual size lets you scroll if needed; Fit to screen shows the full photo again. X/Escape should close it. Reopening starts with the full photo visible. Try portrait and landscape photos.

If there are more than twelve listings, check that Load more shows additional items without duplicates. Otherwise, note that this was not tested.

## 2. Borrowing together

Use an item posted by the other person.

After sending a request, item detail should say you already sent one and show **View your request**. It opens your request in any status, including Returned or Cancelled. Only a **Declined** request lets you request that same item again. Use separate listings for the other test scenarios.

- [ ] **Send a request.** Borrower chooses dates, optionally adds a message and sends. Check the item, dates, message and reference, such as BH-0142. It should appear under the borrower’s Requests tab. The owner finds it through My listings → item → View requests.
- [ ] **Invalid dates.** Past dates, a return before the start, unavailable dates and dates exceeding the item's maximum should not be accepted. A same-day request counts as one day. The owner should not be able to borrow their own item.
- [ ] **Item requests.** Owner opens an item and selects View requests. Pending shows requests waiting for review; All requests includes previous activity. Check borrower names, dates, messages and View request. Other students must not be able to open this list.
- [ ] **Activity tabs.** Requests → Pending shows requests awaiting approval. Borrowing and Lending show approved, handed-over and overdue loans only. Declined, cancelled and completed borrower requests appear under Requests → Past requests. Check empty states and Load more.
- [ ] **Approve.** Owner approves. The request should update with a success message. After refreshing, borrower sees approval and meetup details. Approved dates should become unavailable on the item calendar. Requests still waiting for approval should not block dates.
- [ ] **Handover.** Owner adds required condition notes, optionally one photo, and confirms the item was handed over in person. Both people should see Handed over and the recorded condition. Borrower sees the return deadline and no action buttons.
- [ ] **Return.** Owner chooses Good, Minor wear or Damaged, optionally adds notes/photo and confirms return. Both see Returned with no actions. Handover/return details remain after refreshing. The dates should no longer be reserved.
- [ ] **Decline another request.** Owner provides a reason and declines. Borrower sees the reason and Browse other items. An empty reason should not be accepted.
- [ ] **Cancel another request.** Borrower cancels while waiting for approval, then tests cancelling a different approved request. Confirmation should return to item detail and release reserved dates. Closing the confirmation should keep the request. Cancelling after handover should not be possible.
- [ ] **Competing requests.** Have two different borrowers request the owner's item for overlapping dates before approving either. Try approving both together from two owner sessions. Only one should succeed. The other overlapping request should be declined automatically, with a reason the borrower can see. Requests for other dates should stay pending. Ask the project lead to help.
- [ ] **Overdue.** Ask the project lead to prepare an overdue example. Owner sees the due date, days late and Confirm return. Borrower sees a return reminder and no actions. Complete the return from the owner's account.

Both the start and return day count toward the maximum. Return is due by the end of the return day in **Philippine time**; overdue starts the next day. Borrowhood does not handle payments.

### Expected buttons

| Status      | Owner             | Borrower           |
| ----------- | ----------------- | ------------------ |
| Requested   | Approve / Decline | Cancel request     |
| Approved    | Confirm handover  | Cancel request     |
| Handed over | Confirm return    | None               |
| Returned    | None              | None               |
| Declined    | None              | Browse other items |
| Cancelled   | None              | None               |
| Overdue     | Confirm return    | None               |

Check these states from both accounts, including the correct Borrowing/Lending lists. If there are more than twelve requests, also test Load more.

## 3. Guests and privacy

- [ ] **Logged out.** You can browse public items and see owner names/photos. Clicking the owner's name or Request to borrow should open the verified-students-only message. Text should be equally readable from either action, and Sign up/Log in should work.
- [ ] **Waiting for approval.** If the lead provides this account, it can browse but cannot post or borrow. It can still access its own verification screen.
- [ ] **Someone else's request.** An unrelated student should not see the request, private message or condition photos. A logged-out visitor should be asked to log in. Both actual participants should see their own request.

Report any private information shown to the wrong person immediately. Do not copy that information into the group report.

## 4. Appearance and errors

- [ ] **Screen sizes.** Check **390, 767, 768 and 1440 pixels**. Ask the lead to help set the sizes if needed. Text, fields and buttons should fit without sideways scrolling, overlap or cut-off controls. Long pages may scroll down normally.
- [ ] **Layouts.** Small screens use listing rows and filters opening from the bottom. Request detail puts What happens next first. Larger screens use columns. Calendar dates should be easy to tap. The shelf should have no footer or Edit profile button.
- [ ] **Popups.** Forms open from the bottom on small screens and center on larger screens. The photo viewer intentionally fills the mobile screen. Text should be readable; X/Escape/Cancel should work. Clicking inside should not close a popup. Repeated clicks and closing should be prevented while saving.
- [ ] **Refresh and logout.** Refresh an item, request and My Activity page. The correct page should return. Logout goes to landing. The Borrowhood name/logo goes to landing for guests and the shelf for logged-in users.
- [ ] **Empty/error states.** Try a search with no matches, an account with no listings/requests and an invalid item/request link. Expect a useful message rather than a blank page. If loading/saving fails, check retry options and that entered details remain.

## Not finished yet

Do not report these missing features as Phase 3/4 bugs:

- Full profiles, profile history and calculated trust scores. The current New badge is not a calculated borrowing result yet.
- Comments and the Delete listing button.
- Private chat, report buttons and payment handling.

Do report made-up records or an action claiming success when it did not work.
