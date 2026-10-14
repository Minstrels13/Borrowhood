# Borrowhood

BulSU students lend, rent and borrow school items through verified accounts and in-person handovers. Phases 1–7 are implemented locally: email/photo/admin verification, listings and compressed photos, requests/calendar/condition records, Activity, profiles/trust/history, public Q&A and recovery/navigation polish. Real deployment acceptance remains with team QA.

Start with [remaining-phase setup](docs/remaining-phases-setup.md), then use the **[all-phases QA gate](docs/qa-review-gate.md)**. Earlier setup guides retain the original migration/bootstrap and overdue-demo procedures. No remote migration, push or deployment was performed by the agent.

## Run and verify

Use Node.js 22.12+ and pnpm 11:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check:tokens
pnpm check:requests
pnpm check:trust
pnpm build
pnpm preview
```

Copy .env.example to .env and set the Supabase URL and anon/publishable key, then restart Vite. Never place a service-role key in VITE\_ variables. Commit application source, migrations, scripts used by package.json, package/lock/config files and team setup/QA docs. Exclude .env, private keys, node_modules, dist and local screenshots.

## Supabase

Apply each migration once in numeric order: 001–003, 010–012, 020–024, then **030 → 031 → 040**. The new files are additive and retain accounts/data. See [Phase 2 setup](docs/phase-2-setup.md) for initial Auth/admin configuration and [remaining-phase setup](docs/remaining-phases-setup.md) for the new functions/policies. Do not reset or rerun successful migrations.

Trust comes from actual completed borrows: 100 minus 8 per late return and 15 per damaged return, floored at zero. Minor wear has no penalty. New means no completions; below 70 is Needs attention; five completions and 90+ is Trusted; other completed borrowers are Reliable. Full profiles/history require verified login. Private request notes/messages/evidence remain participant-only. See the [security overview](docs/security-overview.md).

There is no generated student/listing/history content. Team members enter real content through the UI. Payment is agreed in person; the app never handles money. No reports, chat, notifications or other P2 features are included. Wake a paused Supabase project before demos and allow for confirmation-email limits.

## Interface and branding

The single navigation breakpoint is 768px. CSS grids adapt within that layout; controls target 44px and input text is at least 16px. Native dialog.showModal provides focus/inertness; dialogs support X, Escape, backdrop and Cancel. Dirty forms use one shared router blocker and browser reload protection. Drafts are not persisted after a deliberate discard or logout.

Design tokens are in src/styles/variables.css, optional theme overrides in src/styles/themes/example-brand.css and brand strings in src/config/brand.js. The replaceable logo is src/assets/brand/logo.svg. Keep colors, dimensions, spacing, fonts and radii in tokens. Status/trust labels remain readable without color. Palette owners must verify WCAG AA contrast after a theme change.

The font stack uses installed Inter/system fallbacks; no remote font service is called. Add licensed local font files if a final font is supplied. Reference SVG exports in design/Desktop and design/Mobile stay read-only. The local development-only /\_\_ui route includes shared controls and the Example theme selector; it is excluded from production.

## Vercel

Build command: pnpm build. Output: dist. Set the existing Supabase environment variables on the QA deployment, and allow the deployed origin plus /pending redirect in Supabase Auth. vercel.json provides SPA rewrites. Test actual hosted item/request/profile/Activity deep-link refreshes and email confirmation redirects; the config alone does not prove hosting works.

## Review status

Local build/token/request/trust checks and isolated responsive previews are available. Live RLS/Storage tests, concurrent approvals, email/session recovery and Vercel checks still need the team gate. Deferred Phase 2 photo-security QA is not marked passed. Use [manual technical procedures](docs/manual-tests.md) and the focused rollback SQL scripts for project-lead checks; never put real tokens or passwords in test reports.
