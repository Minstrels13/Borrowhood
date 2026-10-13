# Phase 3 — listings and photos

Authorized 10 October 2026. Phase 2 manual acceptance step 9 is deferred to team QA at the user's request; it is not marked passed. Other live acceptance results remain as recorded by the team.

## Implementation order

1. Database: `010_items.sql`, `011_item_access.sql`, `012_item_storage.sql`. Add listings, a maximum of three ordered photo references, read policies, owner-only verified save RPCs, a private item-photo bucket, and a narrow public owner summary. Preserve existing Auth accounts and Phase 2 data; no reset.
2. Data/UI: listing helpers, paginated browse and item hooks, ItemCard, filters/sidebar/mobile sheet, photo gallery, Browse, ItemDetail and the shared create/edit form. Reuse the existing tokens, native dialog, image compression and verification wall.
3. Integration: replace the shelf placeholder, connect Post navigation, and implement the My listings destination needed after publishing. Borrowing/Lending, full profiles/trust history, calendar/request actions and comments remain in their approved later phases. Show explicit unavailable states rather than sample content.
4. Verification: production build, token/format checks, focused database checks and responsive browser inspection. Add exact migration order and manual acceptance steps, then stop at the Phase 3 review gate.

## Behavior and security

- Match S05/S05G, S06/S06G, S08 and F01 desktop/mobile SVG structure. No footer. One breakpoint at 768px; item detail hides the mobile tab bar. S08's mobile Preview your listing uses the shared bottom sheet; the desktop preview sits beside the form.
- Public shelf/detail expose active, non-deleted listings, referenced photos and owner name/photo/trust badge only. Never expose private profile columns. Trust is New while there are no completed borrowing records; Phase 5 replaces this projection with actual aggregates.
- Verified owners alone create/edit. IDs, owner and timestamps are server-controlled; direct table writes are denied. Rental price is text only. Browser compression precedes upload; storage also enforces JPEG and 1 MB. No overwrite policy.
- Save photo references atomically with listing fields; reject foreign, missing, duplicate or more than three paths. Upload first, save, then clean up unused owned objects. Failed saves retain a usable form.
- Filters: category, free/rent and available now; text search; newest/title sorting; twelve items per page with Load more. Before Phase 4 there are no reservations, so active listings have no blocked dates. Do not invent calendar bookings.
- Full profiles, request submission and comments are explicitly unavailable until their slices. Guests/pending students clicking protected actions get M01.
- No new dependencies, generated content, remote SQL execution or deployment.

## Review gate

Team applies the three additive migrations in order and creates real listings through the UI. Confirm guest visibility, private-profile protection, verified ownership, photo limits/replacement, edit/deep links, filters/pagination and responsive states. Keep deferred Phase 2 photo QA visible as outstanding.
