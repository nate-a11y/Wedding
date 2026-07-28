# Optimization Report: wedding

Health: **medium** | files: high, content: low, code: high, setup: medium

## High Priority

- **No Build & Run section** — Agents can't build or test without knowing the commands.
  - Suggested: Build & Run
- **No testing commands section** — Agents need to verify their own work — this is as important as build commands.
  - Suggested: Testing Philosophy

## Medium Priority

- **No .claudeignore** — Large generated directories are visible to agents.
- **No Architecture section** — A project map helps agents navigate without getting lost.
  - Suggested: Architecture
- **No file size limit stated** — Without a limit, agents create unbounded files.
  - Suggested: File Size Limit
- **4 files over 500 lines** — page.tsx, admin-operations.ts, email.ts
  - Suggested: File Size Limit
- **No code conventions or style guide** — Without style guidance, agents guess at naming, formatting, and patterns.
  - Suggested: Minimal Changes
- **No verification command** — Without a verify gate, agents can report success without actually checking.
  - Suggested: Verification Gate

## Low Priority

- **CLAUDE.md is very short (9 words)** — Likely a stub — more context improves agent accuracy.
  - Suggested: Minimal Changes, No Comments
- **No Claude slash commands in this directory** — Project-local commands (.claude/commands/) give agents repeatable, triggerable shortcuts like /test or /deploy.
- **No Claude skills in this directory** — Project-local skills (.claude/skills/<name>/SKILL.md) let teammates pick up the same triggerable instructions when they clone the repo.
- **No MCP servers in this directory** — A .mcp.json file shares project-specific MCP servers with everyone who clones the repo.
- **No .claude/rules/ in this directory** — Rule files keep instructions modular with optional path-scoping for monorepos.
- **No .claude/settings.json in this directory** — Project-local settings.json shares tool allow/deny rules, hooks, and per-gem plugin overrides with everyone who clones the repo.
- **Stack not mentioned (javascript)** — package.json detected but CLAUDE.md doesn't mention the stack.
- **No known issues or gotchas section** — Without documented pitfalls, agents will hit problems by trial and error.
- **No commit guidelines** — Without commit discipline, agents bundle unrelated changes and skip hooks.
  - Suggested: Commit Discipline, Conventional Commits
- **Next.js project — consider "Add TypeScript to a Project"** — Strict TypeScript catches errors agents would otherwise miss.
  - Suggested: Add TypeScript to a Project
- **Next.js project — consider "Improve Accessibility"** — Accessible defaults prevent regressions as agents add UI.
  - Suggested: Improve Accessibility
- **supabase project — install plugin** — Supabase docs + project introspection (auth, RLS, edge functions).

---

Fix these issues in CLAUDE.md (or the relevant agent file) and re-run the optimizer to verify.
