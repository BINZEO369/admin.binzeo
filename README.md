# BINZEO Admin

Secure administration console for BINZEO. This is a separate Next.js application intended for Vercel deployment.

## Architecture

`admin.binzeo` is a UI-only client. All authentication, authorization, database reads/writes, audit operations and admin APIs are owned by `api.binzeo` (the BINZEO Central API). This repository must not contain Supabase clients, Supabase keys, service-role keys or local API route handlers.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Required variables are `CENTRAL_API_BASE_URL`, `NEXT_PUBLIC_AUTH_APP_URL`, and `NEXT_PUBLIC_SITE_URL`. Do not add Supabase, OAuth, SMTP, ImageKit, cron or service-role secrets to this project. Those belong only in the Central API environment.

## Access model

Admin access is determined by the authenticated identity and the Central API's `public.admin_access` authorization record. Database RLS and server-side permission checks remain the source of truth.

## Routes

- `/login` — Supabase admin sign-in
- `/dashboard` — operational overview
- `/dashboard/users` — user directory
- `/dashboard/users/:id` — user record
- `/dashboard` — overview plus direct links to every database table
- `/dashboard/:table` — one dedicated page per database table
- `/dashboard/security` — login history
- `/dashboard/audit` — privileged action audit log
- `/dashboard/settings` — sectors and countries reference data

## Admin API

- `GET /api/admin/me`
- `GET /api/admin/users?q=`
- `GET /api/admin/users/:id`
- `GET /api/admin/audit`
- `POST /api/auth/logout`
