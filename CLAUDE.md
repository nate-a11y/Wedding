# wedding

## Project Context

Wedding website and operations hub for Nate Bullock and Blake Moore's October 31, 2027 wedding. Stack: Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, Framer Motion, Supabase, Resend/Microsoft email workflows, web push, and Vercel.

Canonical project instructions are in `AGENTS.md`; keep this Claude-facing file aligned with those sections.

## Architecture

- `src/app/(main)/...`: guest-facing pages (`/`, `/rsvp`, `/guestbook`, `/photos`, `/songs`, `/live`, `/travel`, etc.).
- `src/app/(main)/admin/page.tsx`: large admin dashboard; extract new admin UI into `src/components/admin/*` or `src/hooks/admin/*` instead of growing it.
- `src/app/api/...`: route handlers. Admin APIs are under `/api/admin/*`; public writes should use Zod validation, rate limiting, and stable JSON errors.
- `src/lib/...`: Supabase clients, auth sessions, admin auth, rate limiting, validation, admin audit, email, Microsoft Graph, media processing, RSVP/vendor tokens, live push/scheduling.
- `supabase/migrations/*.sql`: idempotent schema/RLS migrations. The project uses service-role server APIs with hardened RLS; avoid direct public writes to sensitive tables/buckets.
- `tests/e2e/*.spec.ts`: Playwright smoke and production QA tests.

## Build & Run

- Runtime: Node `>=22 <25`; package manager is npm.

```bash
npm ci
npm run dev
npm run build
npm run start
node scripts/generate-icons.mjs
```

## Testing Philosophy

```bash
npm run typecheck
npm run lint
npm run build
npm test
npm run test:e2e:smoke
npm run test:e2e
npm run audit
```

Playwright starts `npm run start -- -p ${PORT:-3000}` unless `PLAYWRIGHT_BASE_URL` is set. Password-protected browser flows skip unless `SITE_PASSWORD` / `ADMIN_PASSWORD` are present.

## Verification Gate

Before reporting code changes as done, run:

```bash
npm run verify
```

`npm run verify` runs typecheck, lint, build, smoke Playwright tests, and a moderate production dependency audit. Use `npm audit --audit-level=moderate` to review advisories in dev tooling too. For docs-only edits, run at least `npm run typecheck` and explain any skipped heavier checks.

## Code Conventions

- Keep TypeScript strict and avoid `any`.
- Use server components unless browser state/APIs, Framer Motion, media capture, or admin interactivity require `"use client"`.
- Reuse existing UI primitives and the dark/olive/gold wedding design system.
- Preserve accessibility: semantic headings, labels, keyboard paths, focus states, and contrast.
- Server/API code should use `src/lib/supabase-server.ts`; browser code should not receive service-role access.
- Validate public API inputs with Zod and keep anti-enumeration behavior for RSVP edit-link/lookup flows.
- Admin mutations should be admin-auth protected and write best-effort audit events when modifying operational data.
- Do not print or commit `.env.local` secrets.

## File Size Limit

- Do not grow files over ~500 lines except for surgical fixes; extract once files approach ~400 lines.
- Current oversized files to reduce opportunistically include `src/app/(main)/admin/page.tsx`, RSVP/photos/live/guestbook pages, `src/app/vendor/[token]/page.tsx`, `src/app/address/page.tsx`, `src/lib/email.ts`, `src/lib/admin-operations.ts`, and `src/lib/microsoft-graph.ts`.

## Minimal Changes

Preserve existing URLs, auth cookies, Supabase table/bucket names, env var names, and Vercel deployment shape unless the task explicitly requires a coordinated change. Keep `.next`, reports, test artifacts, and tsbuildinfo out of commits.

<!-- crystl-cli:begin v2.144.1 -->
@AGENTS.md
<!-- crystl-cli:end -->
