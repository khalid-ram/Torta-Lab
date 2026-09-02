# CLAUDE.md

Project instructions for Claude Code. This file must never contradict
`AGENTS.md`, which remains the source of truth for architecture and
engineering principles — read it first for full context. This file is a
condensed, Claude-Code-optimized companion.

## Architecture

```
Next.js frontend  →  NestJS REST API  →  Supabase PostgreSQL
```

- **Authentication is owned entirely by NestJS.** Supabase is a
  database only — no Supabase Auth. Passwords are hashed with bcrypt.
  Sessions are JWT access/refresh tokens delivered as HttpOnly cookies
  (`tl_access_token`, `tl_refresh_token`), verified by `AuthGuard`
  against `public.users` on every request (role/`is_active` are never
  trusted from the token, always re-read from the database).
- Users live in `public.users` (`id, name, username, phone,
  password_hash, role, is_active, created_at, updated_at`).
- **Frontend** deploys to Vercel. **Backend** (`backend/`, a separate
  NestJS app) deploys to Railway. Frontend calls the backend through
  `NEXT_PUBLIC_API_BASE_URL`.

## Non-negotiables

- **Backend API communication must be centralized** in `lib/api/*` —
  never call `fetch` directly from a component.
- **Strict TypeScript, no `any`.** Prefer explicit domain types.
- **Never commit secrets or real `.env` files.** Never log tokens,
  refresh tokens, or password hashes.
- **No speculative abstractions.** Build only what the current request
  needs; don't add layers, generic frameworks, or config for
  hypothetical future use.
- **Preserve Arabic/English and RTL/LTR support** on every page. Don't
  hardcode English-only copy; follow the existing per-page/per-section
  translation object pattern.
- **Don't modify working UX, routes, or behavior unless the task
  requires it.** No unrelated refactors.
- **Database and business rules belong in the backend/database, not
  the frontend.** The frontend never encodes authorization logic.
- **Admin/role authorization must be enforced server-side, always.**
  Never trust a role coming from the client (frontend state,
  localStorage, query params, or request body). The backend is the
  only source of truth for `role` and `is_active`.
- **Run both `npm run build` (frontend, repo root) and `cd backend &&
  npm run build` (backend) before reporting a task complete.**
- **Never commit or push unless explicitly asked.**

For everything else — naming, DRY, error-handling conventions, backend
layering (controllers thin, services hold logic, DTOs validate,
guards authorize), git rules — follow `AGENTS.md`.
