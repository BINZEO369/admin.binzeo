# BINZEO Admin

Secure administration console for the shared BINZEO Supabase project. This is a separate Next.js application intended for Vercel deployment.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` in Vercel. Do not add a service-role key to this app unless a future server-only workflow explicitly requires it.

## Access model

Admin access is determined by the authenticated Supabase user and the `public.admin_access` record. Database RLS remains the source of truth for user data permissions.

## Routes

- `/login` — Supabase admin sign-in
- `/dashboard` — operational overview
- `/dashboard/users` — user directory
- `/dashboard/users/:id` — user record
- `/dashboard/security` — login history
- `/dashboard/audit` — privileged action audit log
- `/dashboard/settings` — sectors and countries reference data

## Admin API

- `GET /api/admin/me`
- `GET /api/admin/users?q=`
- `GET /api/admin/users/:id`
- `GET /api/admin/audit`
- `POST /api/auth/logout`
