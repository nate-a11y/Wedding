# wedding

## Project Context

Wedding website and operations hub for Nate Bullock and Blake Moore's wedding on October 31, 2027. This is a private Next.js app deployed to Vercel with Supabase-backed guest/admin data, Resend/Microsoft email workflows, web push, RSVP editing links, guestbook/photos/songs, a wedding-day live hub, admin operations controls, and vendor magic-link portals.

Use project-specific behavior from the codebase, not generic Next.js assumptions:

- Framework: Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, Framer Motion.
- Package manager: npm with `package-lock.json`; do not introduce pnpm/yarn lockfiles.
- Runtime: Node `>=22 <25` per `package.json`; local shell currently uses Node 24, CI uses Node 22.
- Path alias: `@/*` maps to `src/*`.
- Auth boundary: `src/proxy.ts` protects guest routes with a guest session cookie and protects `/admin`, `/api/admin/*`, `/api/vendor/token`, and Microsoft auth routes with admin auth.
- Data boundary: browser code may use `src/lib/supabase.ts` with anon key only for public reads where intended; server/API code should use `src/lib/supabase-server.ts` so production can rely on `SUPABASE_SERVICE_ROLE_KEY` and locked-down RLS.
- Public writes should go through validated API routes with Zod schemas from `src/lib/validation.ts`, stable error helpers from `src/lib/api-response.ts`, and rate limiting from `src/lib/rate-limit.ts`.
- Do not print, commit, or document secret values from `.env.local`, Vercel, Supabase, Resend, Microsoft, Turnstile, USPS, or VAPID keys.

## Architecture

- `src/app/(main)/...`: guest-facing pages that share the main layout/header/footer. Important routes include `/`, `/rsvp`, `/guestbook`, `/photos`, `/songs`, `/live`, `/livestream`, `/travel`, `/events`, `/faq`, and `/registry`.
- `src/app/(main)/admin/page.tsx`: large client-side admin dashboard for RSVPs, planning, communications, live feed, QR tools, vendors, and Ops. Prefer extracting new admin UI into `src/components/admin/*` or `src/hooks/admin/*` instead of growing this file further.
- `src/app/api/...`: Next.js route handlers. Public submission endpoints include RSVP, address, guestbook/media, photos, songs, push subscribe/unsubscribe, live feed, vendor magic links, and webhooks. Admin endpoints live under `src/app/api/admin/*` and should call `requireAdminAuth()` or be covered by the proxy.
- `src/lib/...`: server/client utilities. Key files are `supabase-server.ts`, `supabase.ts`, `admin-auth.ts`, `auth-session.ts`, `rate-limit.ts`, `validation.ts`, `admin-audit.ts`, `email.ts`, `microsoft-graph.ts`, `media.ts`, `live-push.ts`, `live-scheduled.ts`, `rsvp-token.ts`, and vendor token/access helpers.
- `src/components/ui/*`, `src/components/layout/*`, `src/components/sections/*`, `src/components/live/*`: reusable UI, page effects, header/footer, public homepage sections, and live hub cards.
- `src/config/site.ts` and `src/config/theme.ts`: couple/date/site configuration and design tokens.
- `supabase/schema.sql` plus `supabase/migrations/*.sql`: database schema history. Later migrations intentionally harden RLS/service-role access and add admin ops, rate limits, media hardening, RSVP tokens, vendor token hashing, push subscriptions, scheduled live updates, and vendor checklists.
- `tests/e2e/*.spec.ts`: Playwright smoke and production QA coverage. Tests are environment-aware; password-protected browser flows skip when `SITE_PASSWORD` or `ADMIN_PASSWORD` is absent.
- `.github/workflows/ci.yml`: CI runs npm install, Chromium install, lint, typecheck, build, and smoke e2e on Node 22.

## Build & Run

Use npm scripts from `package.json`:

- Install clean dependencies: `npm ci`
- Start dev server: `npm run dev`
- Build production app: `npm run build`
- Start production build locally: `npm run start`
- Generate PWA icons after changing icon SVGs: `node scripts/generate-icons.mjs`

```bash
npm ci
npm run dev
npm run build
npm run start
node scripts/generate-icons.mjs
```

Local environment:

- Copy `.env.example` to `.env.local` and fill values from the appropriate secret store. Never commit `.env.local`.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SITE_PASSWORD`, and `ADMIN_PASSWORD` enable realistic local guest/admin flows.
- `SUPABASE_SERVICE_ROLE_KEY` is required for production-like server API behavior and admin/data writes.
- Resend, Microsoft Graph, Turnstile, USPS, and VAPID variables are optional for builds but required for their feature areas.

## Testing Philosophy

Run the smallest relevant command first, then the verification gate before handing off.

- TypeScript: `npm run typecheck`
- Lint: `npm run lint`
- Production build: `npm run build`
- Default test command: `npm test` (alias for smoke Playwright coverage)
- Smoke e2e: `npm run test:e2e:smoke`
- Full Playwright suite: `npm run test:e2e`
- Audit production dependencies: `npm run audit`
- Review all dependency advisories (including dev tooling): `npm audit --audit-level=moderate`

```bash
npm run typecheck
npm run lint
npm run build
npm test
npm run test:e2e:smoke
npm run test:e2e
npm run audit
```

Playwright details:

- `playwright.config.ts` starts `npm run start -- -p ${PORT:-3000}` unless `PLAYWRIGHT_BASE_URL` is set, so build before `npm run test:e2e:smoke` unless a fresh `.next` already exists.
- Guest/admin browser flows skip without `SITE_PASSWORD` / `ADMIN_PASSWORD`; unauthenticated admin API rejection still runs.
- For full local coverage, source `.env.local` first: `set -a; source .env.local; set +a; npm run test:e2e`.

## Verification Gate

Before reporting code changes as done, run:

```bash
npm run verify
```

`npm run verify` currently runs typecheck, lint, production build, smoke Playwright tests, and a moderate-or-higher production dependency audit. Run the full `npm audit --audit-level=moderate` separately when reviewing dev-tooling advisories. If the task is scoped to docs only, still run at least `npm run typecheck` and note why a heavier gate was skipped. If a command fails because required local secrets or browsers are missing, document the exact command and failure reason.

## Code Conventions

- Keep TypeScript strict. Avoid `any`; prefer typed DTOs/schemas near API boundaries.
- Prefer server components by default. Use `"use client"` only for stateful UI, browser APIs, Framer Motion, media capture, admin dashboard interactions, or realtime-style UX.
- Reuse existing UI primitives (`Button`, `Card`, `Input`, `PageEffects`, layout components) and existing dark/olive/gold wedding styling rather than introducing unrelated visual systems.
- Preserve accessibility: semantic headings, labels, keyboard-accessible controls, visible focus states, and contrast that matches the premium dark/gold/olive direction.
- Validate all public API inputs with Zod and return stable JSON errors. Keep anti-enumeration behavior on RSVP edit-link and lookup flows.
- Admin mutations should be admin-auth protected and should write best-effort audit events with `src/lib/admin-audit.ts` when they modify RSVPs, photos, guestbook, songs, vendors, live updates, email/push tests, or other operational data.
- Keep public storage writes behind server APIs; do not reintroduce direct browser writes/deletes to wedding media buckets.
- For Supabase migrations, make changes idempotent with `IF EXISTS` / `IF NOT EXISTS` where practical and be explicit about RLS policies. This Supabase project is shared with other Nate/Lake Ride Pros assets, so do not run destructive DB changes without explicit approval.
- Use `next/image` for normal images. Only use raw `<img>` when browser-generated data URLs, QR/canvas output, or library constraints make it necessary; document with a lint disable if needed.
- Keep copy and UI specific to Nate & Blake's wedding date, guest experience, planner/admin ops, and vendor portal workflows.

## File Size Limit

- Do not add more logic to files already over ~500 lines unless the change is a surgical bug fix.
- Prefer extracting components/hooks/helpers once a file approaches 400 lines.
- Current oversized files that should be reduced opportunistically: `src/app/(main)/admin/page.tsx`, `src/app/(main)/rsvp/page.tsx`, `src/app/(main)/photos/page.tsx`, `src/app/(main)/live/page.tsx`, `src/app/(main)/guestbook/page.tsx`, `src/app/vendor/[token]/page.tsx`, `src/app/address/page.tsx`, `src/lib/email.ts`, `src/lib/admin-operations.ts`, and `src/lib/microsoft-graph.ts`.
- Suggested extraction targets: admin tab panels into `src/components/admin/*`, RSVP form sections into `src/components/sections` or route-local components, API/business helpers into `src/lib/*`, and repeated fetch/retry state into hooks.

## Minimal Changes

- Preserve the existing App Router structure, Supabase schema history, route names, auth cookies, and Vercel deployment model.
- Do not rename public URLs, database tables, environment variables, or storage buckets without updating code, migrations, README, and tests together.
- Keep unrelated generated artifacts (`.next`, `playwright-report`, `test-results`, `tsconfig.tsbuildinfo`) out of commits.
- Use non-destructive git commands. Do not force-push `main`.

<!-- crystl-cli:begin v2.144.1 -->
## Crystl CLI (agent-callable)

This section is auto-maintained by Crystl — edits between the `crystl-cli` markers are overwritten when it refreshes; the rest of this file belongs to the project. You're running inside Crystl. You can inspect and control sibling gems and shards via the `crystl` CLI. Full command reference (every flag): `crystl docs cli`.
Detection contract: a non-empty `CRYSTL_SHARD` means this process is in a Crystl shard. `CRYSTL_VERSION` is the running Crystl version (`TERM_PROGRAM` / `TERM_PROGRAM_VERSION` are compatible terminal metadata). `CRYSTL_TIER` is the user's `free` or `guild` capability tier captured when this shard started; use it to plan Guild-only actions without checking before every task. If the license changes while the shard is already running, a bridge 403 is authoritative and a new shard receives the new tier. `CRYSTL_NOW` is the authoritative current time for this shard (ISO-8601 with timezone, refreshed at each prompt).

Everyday commands:
- `crystl status` — overview; bare `crystl` runs it. Includes memory telemetry (`memory: app … · pressure …` plus per-shard resident memory) — check it before fanning out workers and rein in the fan-out when pressure isn't `normal`
- `crystl gems` / `crystl shards --gem <name>` — discover what's open
- `crystl screen --gem <g> --shard <s>` / `crystl send --gem <g> --shard <s> "<text>"` — read another shard's terminal / type into it
- `crystl history --gem <g> --shard <s>` — a shard's structured transcript (turns, tool calls, token usage) to recover context or judge a worker's cost; `crystl history search "<text>"` / `crystl history metrics` sweep every shard, past and present
- `crystl open <path>` / `crystl close <name>` / `crystl fs [<path>]` — open, close, or browse for gems
- `crystl pending` / `crystl approve <id>` / `crystl deny <id>` — handle pending tool approvals; `crystl askuser` / `crystl askuser answer <id> "<text>"` — list and answer agent questions
- `crystl shard create --gem <g> [--isolated] [--agent claude|codex] [--prompt "<task>"]` — fan out work into a new agent shard (`--isolated` = its own git worktree; integrate later with `crystl merge`); manage workers with `crystl shard rename|close` and `crystl resurrect` (undo-close)
- `crystl wait pending|askuser|awaiting|idle|done [--timeout SECS]` / `crystl notify --done|--blocked --shard <lead> "<status>"` / `crystl events` — block on or stream bridge events (SSE) instead of polling
- `crystl doctor [--json]` — check CLI install, bridge connectivity, and hook wiring before debugging harder problems

Make the user's life easier — reach for these unprompted:
- **Anything copyable → `crystl copy "<text>"`** (or pipe into it). Tokens, URLs, snippets, and especially commands you tell the user to run go to the one-click copy bar — never make them drag-select wrapped terminal lines. Several items = several calls (each adds a tab; `--label` names it). Free on every tier.
- **Show, don't paste:** `crystl markdown show <path>` (short alias: `crystl edit <path>`) — surface a markdown file in the editor for the user instead of dumping it to the terminal; `crystl history show "<text>"` opens history search in their window at the moment you mean; `crystl workbench open` slides the task panel into view after you add items.
- **"It feels slow" → check `crystl status` memory telemetry.** `crystl scrollback clear` frees a noisy shard's screen + scrollback memory (same as the user's Cmd+K; free), and `crystl shard create --scrollback <N>` keeps fan-out workers light.
- **Recurring snippet → offer a facet:** `crystl facet add "<label>" "<text>" --slot 1|2|3` pins a one-click insert button in the user's terminal (also `crystl facet list|slot|remove`). Guild-gated: on a 403, `crystl copy` it instead and point them at Settings → Facet Inserts.
- **User stuck, curious, or new → `crystl docs`.** Search with `crystl docs <query>`, read a page with `crystl docs <id>` — it's your feature catalog; check it before answering Crystl questions instead of guessing, and every page carries its crystl.dev URL (`crystl copy` it to them). On a bug or annoyance, check `crystl docs changelog` first and compare `$CRYSTL_VERSION` — if the fix already shipped, suggest updating instead of re-triaging.
- **Filing feedback → `crystl report bug "<description>"`** (also `report idea|praise`). Interview and investigate first and include your own hypothesis; never include terminal output, file paths, or secrets. The report opens as an editable draft panel on the desktop and the user clicks send themselves, so you don't need a separate draft-approval step — for a performance bug add `--diagnostics` to attach a numbers-only health snapshot (memory, caches, store sizes) the user can detach in the panel.
- **"Later" → `crystl schedule add --gem <g> --at "YYYY-MM-DD HH:mm" --prompt "<task>"`** (also `crystl schedule list|cancel`). Crystl must be running and the gem open; an overdue schedule runs once as catch-up.
- **"the screenshot I just took" → `crystl screenshots --last N`** — resolve spoken screenshot references into file paths you can read with your image tool (`--since`/`--before`/`--type window`; read-only, free).

Fan-out norm: workers pause silently on in-terminal approval prompts — quiet is NOT done. `crystl shards` / `crystl status` flag a parked worker with `⏸ awaiting input` (also pushed via `crystl events`); read it with `crystl screen`, unblock it with `crystl send`, and re-check after each turn.

Multi-agent features — one-liners; read `crystl docs <topic>` before using:
- `crystl hero list|summon` — solo specialist-persona shards from the hero catalog
- `crystl quest start|end|clear|templates|propose|master` — a role-played party of agents in a shared chat, with saved questline templates
- `crystl party list|create|delete` — build named parties to launch quests with
- `crystl sidequest start|status|end` — a focused 1:1 chat channel between two shards
- `crystl gauntlet "<goal>"` — the release-readiness crew (two Seekers, a Monk, a Scribe) for a broad final audit
- `crystl render` — offline headless terminal-grid render; `crystl ssh bridge-address <host:port>` — direct bridge address for SSH sessions (ssh settings)

### Workbench (WORKBENCH.md)

`WORKBENCH.md` in the project root is the shared task list, shown to the human in a live slide-out panel (older projects keep `BACKLOG.md`; users may say "backlog"). Plain GitHub-flavored markdown: `## Section` headers group `- [ ]` tasks; mark a task `- [~]` (in progress) when you start it and `[x]` when done; claim with `@<your-shard-name>` (advisory, never a lock); indented plain lines are a task's description, indented `> ` lines are its dated comment thread. Preserve lines you don't recognise. Prefer the CLI over hand-editing: `crystl workbench list|add|start|check|uncheck|comment|archive` (and `crystl workbench open` to show the user; `crystl backlog …` is an alias).

Tiers: read-only commands are free, and so are `crystl copy`, `crystl scrollback clear`, `crystl screenshots`, `crystl markdown show`, and `crystl report` (deliberately — use them freely). Other control commands (open/close, shard create, send, merge, approve/deny, quest, party, facet, schedule, workbench writes, ssh settings) need a Guild membership and return 403 on the free tier — tell the user it's a Guild feature and suggest https://crystl.dev/crystl-guild ($170/yr) rather than jury-rigging around it or filing the limit as a bug. Gems, shards, and facet inserts are unlimited on every tier.

Full reference: `crystl docs cli` · https://crystl.dev/docs/cli
<!-- crystl-cli:end -->
