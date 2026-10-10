<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Blu Kitchen at Laphto Mall

Digital menu and guest feedback site for Blu Kitchen, Laphto Mall. The menu can be opened directly at `/menu` for table QR codes.

## Run Locally

**Prerequisites:** Node.js 20 or newer

1. Install dependencies: `npm install`
2. Start the API and SQLite-backed app: `npm start`
3. For local frontend development, run `npm run server` in one terminal and `npm run dev` in another. The Vite server on port 3000 proxies `/api` requests to port 3001.

Local feedback is stored in `data/blu-feedback.sqlite` (set `FEEDBACK_DB_PATH` to override). Set `PORT` if needed. Admin sign-in uses Supabase Auth — see the Staff admin section below for the local env vars.

## Deploy to Vercel

Production runs on Vercel: the Vite frontend is served as static assets and the feedback API runs as a serverless function backed by Supabase Postgres, so submissions persist across cold starts (SQLite cannot persist on serverless filesystems).

1. Create a Supabase project and apply the migration in `supabase/migrations/` (`supabase link --project-ref <ref> && supabase db push`).
2. Set the environment variables on the Vercel project (Production + Preview):
   - `SUPABASE_URL` — the project's endpoint, e.g. `https://<ref>.supabase.co`
   - `SUPABASE_ANON_KEY` — anon key (used by the admin sign-in endpoint)
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key; server-side only, never expose to the client
3. Deploy (`vercel deploy --prod`, or push to `main` once the repo is connected).

`vercel.json` rewrites all non-file routes to the SPA and runs a daily `/api/health` cron that keeps the Supabase project active on the free tier (free projects pause after a week of inactivity).

## Staff admin

Staff sign in at `/feedback-admin` with an email + password admin account (Supabase Auth). The panel has two tabs: guest feedback (with CSV export) and live menu management (add/edit/delete items, availability toggle, photo uploads).

Create additional admin accounts in the Supabase dashboard: **Authentication → Users → Add user** (tick "Auto Confirm User"). Programmatic access: `POST /api/admin-login` returns a bearer token that works for `/api/feedback`, `/api/feedback/export.csv`, and `/api/menu` admin routes.

Local development (`npm run dev` + `npm run server`): guest flows and the feedback admin use local SQLite, but admin sign-in and auth checks call Supabase — set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Menu management is testable against the deployed preview/production environment.

Open `/table-qr` after deployment to generate and download a QR code for that deployment's `/menu` route. The menu route loads directly on mobile and supports browser back/forward navigation; the QR never embeds a localhost URL.
