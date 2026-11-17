---
status: done
---

# Acceso a la base: sesiones y políticas

## Goal

Both apps reach the CALM database (Supabase project `xbhtumsycbixilajhghn`) safely. The admin panel reaches everything; a client reaches only her own data and the public catalog and schedule.

## Context

- The schema is applied (`supabase/migrations/20261117120718_initial_schema.sql`). Every table has row level security on and no policies, so only the service role reaches them.
- The web panel has no sign-in yet. Its three repository ports say "the in-memory adapter stands in until the API exists".
- The Flutter app (`/Users/crpd/CALM_mobile`) signs in with a 10-digit phone and a 4-digit NIP through `DemoClientAccess`. Its comment asks the real check to throttle NIP attempts per phone.
- The diagram (`CALM_BD.drawio`) stores `admins.password_hash` and `clients.nip_hash` as argon2id hashes.

## Decisions

- **Clients sign in with phone and NIP.** The diagram (2026-11-13) and the Flutter app (2026-11-16) both have it. This replaces the 2026-10-25 decision in the objectives index, where clients had no account and reached their orders with the ticket alone.
- **The NIP check runs on the server, never in the app.** A 4-digit NIP has 10,000 values, so the check must throttle attempts per phone. A Supabase Auth password cannot be 4 digits: Supabase Auth raises any minimum below 6 to 6 (`defaultMinPasswordLength`, https://github.com/supabase/auth/blob/master/internal/conf/configuration.go). The password-security guide only says less than 8 is not recommended (https://supabase.com/docs/guides/auth/password-security). The check is therefore an Edge Function (https://supabase.com/docs/guides/functions).
- **Supabase Auth issues the sessions** (the user's choice). `supabase-js` and `supabase_flutter` store and refresh them, and RLS policies read `auth.uid()`.
  - The diagram changes: `admins` links to `auth.users` by its uuid and loses `password_hash`, since Supabase Auth keeps the hash. `updated_by` and `blocked_by` become uuids.
  - A client with an app account links to an `auth.users` row; a walk-in client has none. `clients.nip_hash` stays: the NIP is not the Supabase password.
- **A client's session after the NIP check.** The Edge Function checks phone and NIP, then asks Supabase Auth for a session for that client, so the app holds a normal Supabase session. Pieces confirmed:
  - `auth.admin.generateLink` returns `hashed_token` (`GenerateLinkProperties`, https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/lib/types.ts; https://supabase.com/docs/reference/javascript/auth-admin-generatelink).
  - `auth.verifyOtp` takes a `token_hash` (https://supabase.com/docs/reference/javascript/auth-verifyotp).
  - `generateLink` works on email users only, so each client account needs an email the client never sees. To check in the spec: which address Supabase Auth accepts, and that the flow returns a session.

- **The admin signs in with her phone and a password** (the user's choice over email).
  - Supabase's own phone sign-in needs the Phone provider on (`Phone logins are disabled` otherwise, https://github.com/supabase/auth/blob/master/internal/api/token.go), and that provider exists to send SMS codes.
  - So the panel asks for her 10-digit phone and turns it into an internal email, `<phone>@panel.calm.invalid`, that she never sees. Clients get the same treatment under `clientes.calm.invalid`, which `generateLink` needs anyway.
  - `.invalid` is reserved and never delivers mail (RFC 2606, https://www.rfc-editor.org/rfc/rfc2606). Supabase Auth checks only the address's format when an admin creates a user (`validateEmail`, https://github.com/supabase/auth/blob/master/internal/api/mail.go).
- **The access rule lives in one function**, `private.is_admin()`. It runs as its owner (`security definer`) so policies can read `admins` without a policy loop, and sits in a schema the Data API does not expose (https://supabase.com/docs/guides/database/postgres/row-level-security#use-security-definer-functions). Policies call it as `(select private.is_admin())`, so Postgres runs it once per query, not once per row (same page, "Wrap functions with select").
- **This feature opens the tables to the admin only.** Clients reach nothing until their own policies arrive with objectives 17–20, next to the screens that need them.
- **Creating the admin account moves to objective 13**, with her sign-in screen. Her password is hers to set in the Supabase dashboard.

## Open questions

Ask one at a time:

1. **Sessions.** Supabase Auth, or a custom API that keeps the diagram's hashes?
   - **Answered (2026-11-17): Supabase Auth.** See Decisions.
2. **Admin sign-in.** With Supabase Auth, she needs an email (or phone) besides the password. Which one?
   - **Answered (2026-11-17): her phone.** See Decisions.

## Spec

1. **Admins are Supabase Auth users.** `admins.id` is the uuid of an `auth.users` row and goes with it; `admins` has no `password_hash`. `weekly_schedule.updated_by` and `blocked_dates.blocked_by` hold that uuid.
2. **App accounts.** `clients.user_id` points to the client's `auth.users` row: unique, null for a walk-in client, emptied if that user is deleted. A client with an account has a phone and a NIP.
3. **`private.is_admin()`** is true only for a signed-in user listed in `admins`.
4. **The admin** reads, adds, changes and deletes rows in the seven business tables, and reads her own row in `admins`.
5. **Anyone else**, signed in or not, reads no row and cannot add one.
6. **Checks.** `supabase/tests/schema-check.sql` covers 1–2; `supabase/tests/access-check.sql` covers 3–5 by acting as each role. Supabase's security and performance advisors show no warning or error.

## Log

### 2026-11-17 — done

- **Outcome.** `supabase/migrations/20261117123517_supabase_auth_access.sql` is applied (version recorded by `list_migrations`). `admins.id` and the `updated_by` / `blocked_by` columns are uuids tied to `auth.users`; `clients.user_id` links app accounts; `private.is_admin()` gates one policy per business table, plus the admin's read of her own `admins` row.
- **Checks.** `schema-check.sql` returns zero rows. `access-check.sql` ends with "access check passed: 35 checks" (two `is_admin()` checks, then eight reads, one insert, one update and one delete for each of three actors). Security advisor: no lints. Performance advisor: only INFO "Unused Index" on the five foreign-key indexes, expected while the tables are empty and unqueried (https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). The test lock is removed.
- **Pending checks.** None for this feature. The client session flow (`generateLink` → `verifyOtp`) is still unverified; it belongs to objective 17.
- **Next step.** Objective 13, [Panel web: entrar como administradora](web-entrar.md). The user creates the admin's Auth user in the Supabase dashboard as `<phone>@panel.calm.invalid` with her own password; public sign-ups are turned off; her `admins` row is inserted; the panel adds `@supabase/supabase-js` and its environment variables.
