# Memory — Supabase Schema Deployment

Last updated: 2026-10-11 11:55 +01:00

## What was built

- Installed the Supabase CLI as a project dev dependency and initialized `supabase/config.toml`.
- Linked the CLI to the same Supabase project referenced by the local app configuration.
- Created and applied two migrations: the Phase 4 schema foundation and a security follow-up.
- Verified all eight core tables, five enums, and RLS on every core table in the remote database.
- Updated `supabase/schema.sql` and `context/progress-tracker.md`.

## Decisions made

- Keep Supabase CLI migrations as the repeatable deployment path for future database changes.
- Enable RLS on all app tables, including `processed_webhook_events`.
- Restrict client writes to orders and tickets; these records are server-authoritative.
- Keep the Postgres database password in `.env.local` under `SUPABASE_DB_PASSWORD`, never with a `NEXT_PUBLIC_` prefix. Do not persist or expose credential values.

## Problems solved

- Tables were not visible because the schema existed only as local SQL and had not been deployed.
- Supabase account CLI login alone was insufficient for direct Postgres connections; the authenticated Management API was used to apply the SQL and inspect the database.
- A database password was accidentally sent in chat and briefly configured under a `NEXT_PUBLIC_` variable name. The user reset it and saved the replacement under the private `SUPABASE_DB_PASSWORD` name. Do not include either password in memory or future output.

## Current state

- The linked Supabase project has `profiles`, `events`, `ticket_types`, `reservations`, `orders`, `tickets`, `door_staff_access`, and `processed_webhook_events`.
- Both schema migrations are recorded as applied; verification confirmed RLS enabled for all eight tables.
- Lint passes.
- The `ticket-card-images` storage bucket and its policies are not set up yet.
- The tracker was updated; `ui-registry.md` was not changed because this work added no UI components.

## Next session starts with

- Continue Phase 4 by defining and applying storage bucket setup and its upload/read policies, starting with `ticket-card-images`.
- Keep database credentials private and only access them locally from ignored `.env.local` when required.

## Open questions

- Decide whether the two other documented buckets (`organizer-logos` and `event-images`) belong in the same storage migration or a later feature.
- Review remaining schema security and behavior against the architecture before implementing real-data flows.
