# My Activity tabs

1. Add Requests for the borrower's pending requests. Include a Past requests filter for declined, cancelled and returned requests so existing history stays accessible.
2. Borrowing and Lending show approved and handed-over loans only. Overdue loans remain visible because the item has not been returned. Pending owner requests are reviewed through My listings → item → View requests.
3. Apply status filters in the Supabase query before counting and pagination. Update request-page back links, empty states and the team checklist. Keep the existing four-width responsive tabs and keyboard navigation.
4. Check formatting, tokens, request/date checks and production build. No database migration is needed.
