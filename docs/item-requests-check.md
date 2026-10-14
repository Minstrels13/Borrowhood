# Item requests review

## Setup for the project lead

Apply `supabase/migrations/024_item_requests.sql` once, after successful migrations 020–023. Paste the complete plain SQL into Supabase SQL Editor. This keeps existing requests and photos. It adds an owner-only request list and replaces the transition function; it does not automatically decline old requests during installation.

The code is ready for local review. Live database behavior still needs the checks below after installation. No remote SQL was run by the agent.

## Team checks

Use one verified owner and two different verified borrowers. Create requests before the owner approves either. Use different items for separate scenarios, since only a declined request allows the same borrower to request the same item again.

- [ ] **Find the requests.** Owner opens their item and clicks View requests. Pending shows requests awaiting review. All requests includes approved, declined, cancelled and completed requests. Check names, dates, messages and View request links.
- [ ] **Approve.** Click Approve directly. See a success message and the updated list. The borrower sees approval on their request page.
- [ ] **Overlapping dates.** Borrower A requests Oct 20–22 and borrower B requests Oct 22–24 (use future dates when testing). Approve A. B is automatically declined and sees the availability reason. Both start and return days count as booked.
- [ ] **Different dates.** Repeat on another item with A requesting Oct 20–22 and B requesting Oct 23–24. Approve A. B stays pending. Approving from the full request page must follow the same rules.
- [ ] **Decline manually.** Decline requires a reason, which the borrower can see. Closing the dialog without saving makes no change.
- [ ] **Two owner windows.** Try approving overlapping requests at the same time. Only one becomes approved; the other becomes declined. A stale approval attempt shows an error and must not change that result.
- [ ] **After cancellation.** Cancelling the approved request releases its dates. Automatically declined requests stay declined; those borrowers can send a new request for available dates.
- [ ] **Privacy.** Guests, unverified students and other verified students cannot access the owner's request list by opening its URL. Being an admin alone must not grant access.
- [ ] **Small and large screens.** Check 390, 767, 768 and 1440 pixels. Names, dates and controls fit without sideways scrolling. Mobile shows View requests and Edit listing together. The decline dialog remains usable.
- [ ] **Loading and history.** Check an item with no requests, Refresh requests, a failed connection and Load more after more than twelve requests. Old entries remain readable when refresh fails, and review actions wait until a successful refresh. All requests retains history for hidden listings.

Project lead: `supabase/tests/item-requests.sql` checks the grants, owner-only access and inclusive overlap boundaries using three existing verified accounts. It creates temporary test listings/requests inside a transaction and rolls them all back. Request reference numbers may have gaps afterward. Run it in SQL Editor after migration 024; use the team UI checks for true simultaneous approvals.

Record bugs with the screen, account role, steps, expected result, actual result and a screenshot. Do not include passwords or session tokens.

## Local checks completed

Production build, design tokens and existing request date/state checks passed. The actual page and decline dialog were checked under React Strict Mode with temporary local data adapters: all four widths fit without horizontal overflow, the dialog bottom-aligns below 768px and centers at 768px, and approval refresh/filtering/Load more work. The adapters were removed and created no Supabase records. These checks do not prove live SQL execution, permissions or concurrent approval behavior; the SQL script and team checks above are still required.
