# Supabase production deploy (from this repo)

This repo already includes a Supabase project:

- `supabase/config.toml`
- `supabase/migrations/*` (database schema + SQL changes)
- `supabase/functions/*` (edge functions)

The only requirement to deploy to your Supabase cloud project is to **login** and **link** the repo to the correct project.

## One-time setup

1) Login (opens browser):

```bash
npm run supabase:login
```

2) Link this repo to the production project:

```bash
npm run supabase:link
```

When prompted, select the correct Supabase project.

## Deploy database migrations

```bash
npm run supabase:push
```

This applies all SQL migrations in `supabase/migrations/` to the linked project.

## Deploy edge functions

Deploy all functions:

```bash
npm run supabase:functions:deploy
```

Or deploy individual functions:

```bash
npx supabase functions deploy webhooks
npx supabase functions deploy seed-test-data
```

## Production safety notes

- Do **not** deploy `seed-test-data` to production unless you intentionally want it available.
- Ensure secrets are configured in Supabase Function settings for production:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `WEBHOOK_SECRET` (for `webhooks`)

