# Borrowhood

BulSU item lending and borrowing app. Phase 2 implements account verification; Phase 3 adds listings/photos; Phase 4 adds requests, availability, handover/return condition records and Borrowing/Lending lists. Follow [Phase 3 setup](docs/phase-3-setup.md), then the additive migrations and acceptance checks in [Phase 4 setup](docs/phase-4-setup.md). Earlier photo-security checks and Phase 3 bugs remain with team QA. Full profiles/trust history and comments remain in later phases.

## Run and verify

Use Node.js 22.12+ and pnpm 11:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check:tokens
pnpm check:requests
pnpm build
pnpm preview
```

Open the localhost URL printed by Vite. Open `/__ui` for shared controls and the Example brand theme selector. This route is excluded from production. The esbuild install script is allowed in pnpm-workspace.yaml.

## Design and branding

Change src/styles/variables.css for semantic colors, typography, spacing, radii, dimensions, status and trust tokens. Example overrides live in src/styles/themes/example-brand.css. Brand strings live in src/config/brand.js; the one replaceable logo silhouette is src/assets/brand/logo.svg, read via the --brand-logo token and rendered by Logo. A CSS mask makes its color follow the theme.

Mobile styles are the default; desktop starts at 768px. Keep raw design values in token/theme files. Status/trust text and border patterns remain visible without color. Palette owners must verify WCAG AA contrast after changing tokens.

The font stack requests Inter and uses installed system fallbacks. No remote font service is called; Inter is not bundled yet. To ship a font, add licensed local files and one central @font-face declaration.

Native dialog.showModal provides focus handling and background inertness; CSS prevents background scrolling. X, Cancel, Esc and backdrop close the dialog. Reference exports in design/Desktop and design/Mobile remain read-only.

## Environment and deployment preparation

Copy .env.example to .env and set only URL and anon key, then restart Vite. Follow docs/phase-2-setup.md for SQL migrations, preserved Auth accounts, admin designation and redirect URLs. Without configuration, landing/signup rules/shared UI still work and auth forms show a setup error. Never put a service-role key in VITE_ variables or commit .env.

Vercel build command: pnpm build; output: dist. vercel.json rewrites SPA routes to index.html. No deployment has been performed; hosted deep-link refresh remains a later check.

No sample student/listing/history data is included. Community rules open in a modal from the signup form. See docs/manual-tests.md for acceptance checks and docs/security-overview.md for the security design.
