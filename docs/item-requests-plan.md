# Item requests plan

1. Add an owner-only page at `/items/:id/requests`, linked from Item Detail. Show pending requests first, with an All requests filter, borrower names, dates, messages, statuses and links to the full request. Load additional entries in small batches.
2. Reuse direct Approve and the existing decline dialog. Explain before approval that overlapping pending requests will be declined. Refresh the list after saving and show a toast. Keep loading, empty, retry and unavailable states usable.
3. Add migration `024_item_requests.sql`. Restrict the list to the verified item owner. Approving reserves the selected inclusive dates and automatically declines only overlapping pending requests in the same transaction. Preserve unaffected requests and completed history. Keep existing locking and booking constraints.
4. Check the production build, formatting and design tokens. Add database acceptance checks and a simple manual review gate covering access, overlapping dates, concurrent approval and mobile layouts at 390/767/768/1440px.

This change needs the new migration applied before testing the page against Supabase. Existing data is retained. Automatically declined requests do not reopen when an approved request is later cancelled; the borrower can send a new request for available dates.
