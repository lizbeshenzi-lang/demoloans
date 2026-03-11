# Production readiness checklist (app-side)

This repo is a **Vite + React SPA** that uses **Supabase** for backend services (Auth/DB/Storage/Edge Functions).  
This document focuses on **application-side** production hardening you can do in this repo without changing Supabase configuration.

## 1) Environment variables and build

- **Required env vars**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Fail fast**
  - The app validates env vars at runtime on startup (see `src/config/env.ts`).
- **Vercel**
  - Add the same env vars in Vercel project settings for Preview + Production.
  - Ensure SPA routing works (this repo includes `vercel.json` fallback to `/index.html`).

## 2) Error handling and observability

- **Global error boundary**
  - `src/components/AppErrorBoundary.tsx` prevents a blank screen on render errors.
- **Unhandled errors**
  - `src/main.tsx` logs `window.error` and `unhandledrejection`.
- **Production logging policy**
  - `src/lib/logger.ts` reduces noisy logs in production while keeping warnings/errors.
- **Recommended (next)**
  - Add an error reporting tool (Sentry, LogRocket, etc.) and send boundary + unhandled errors.

## 3) Frontend security basics

- **No secrets in client**
  - Only public keys should be in `VITE_*` vars.
  - Never expose Supabase service role keys in the SPA.
- **CSP / headers (recommended)**
  - On Vercel, add security headers (CSP, `X-Frame-Options`, `Referrer-Policy`, etc.) once you confirm all required domains.

## 4) UX and resilience

- **Graceful empty/error states**
  - Prefer user-friendly error messaging for failed queries/forms.
- **Timeouts/retries**
  - For long requests, add clear progress indicators and retry options.

## 5) Release process (recommended)

- **Staging environment**
  - Separate Preview/Staging and Production Supabase projects/keys.
- **Smoke tests**
  - Login, apply flow, dashboards, and reports basic sanity checks on each deploy.

## 6) Supabase responsibilities (handled outside this repo)

These are production-critical but live in Supabase configuration:

- Enable and verify **RLS policies** on sensitive tables.
- Ensure role-based access is enforced server-side.
- Backups, PITR, and incident runbooks.
- Edge function secrets, webhook auth, rate limiting.

