# Existing borrowing request check

Apply `supabase/migrations/023_repeat_request_guard.sql` once after 020–022. Do not rerun earlier migrations. This adds a guard and index; existing requests/photos are not removed. No remote migration has been executed by the agent.

## Expected behavior

- No previous request: Request to borrow opens the form.
- Latest request is Declined: the borrower may send a new request.
- Latest request is Requested, Approved, Handed over, Returned or Cancelled: item detail says a request was already sent and shows View your request. This opens that request's page; it does not submit another request.
- The latest request is determined by its database counter, including when older duplicate requests already exist. Those older records are preserved.
- The rule applies per borrower/item, so other students can still request the item subject to its date availability. A returning or cancelling borrower cannot request that same item again under the user's approved rule; only decline permits another request.
- Guests still see the verification wall; owners still see Edit listing. If the request check fails, creating a request is disabled and Retry request check is shown. Switching windows refreshes only this small status check, without replacing the page or clearing forms.

## Team checks

1. Borrower sends a request and reopens item detail. Confirm View your request on mobile and desktop, including after refreshing and switching tabs.
2. Check every listed state. Returned and Cancelled must still open history, not a new form. Have the owner decline a separate request; after returning to the item page, Request to borrow becomes available and a new request can be submitted.
3. Open the same item in two borrower tabs before either sends. Submit both. At most one new request is saved; the other tab opens the existing request or shows a usable error if the network fails. Repeat with different proposed dates: this guard is per item/borrower, not only overlapping dates.
4. An unrelated borrower with no prior request can request available dates. Owner/guest behavior stays unchanged.
5. Use separate listings for additional cancellation/return scenarios, since those outcomes no longer allow another request for the same borrower/item. To test conflicting approvals with this rule, use two different verified borrowers requesting the owner's item.
6. Run `pnpm check:requests`, `pnpm check:tokens` and `pnpm build`. Run `supabase/tests/repeat-request.sql` after real team requests exist. Local checks do not prove live RLS, trigger concurrency or RPC integration.
