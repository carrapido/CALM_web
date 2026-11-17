---
status: in-progress
---

# Panel web: entrar como administradora

## Goal

The admin signs in to the panel before she sees any data, and stays signed in on her computer. Uses the access model of objective 12.

## Decisions

- **She signs in with her phone and a password through Supabase Auth.** The panel turns the 10-digit phone into `<phone>@panel.calm.invalid` (objective 12) and calls `signInWithPassword` (https://supabase.com/docs/reference/javascript/auth-signinwithpassword).
- **She stays signed in.** `supabase-js` saves the session in the browser's local storage (`persistSession`, https://supabase.com/docs/reference/javascript/initializing), and `getSession` refreshes it when needed (https://supabase.com/docs/reference/javascript/auth-getsession).
- **Only an admin gets in.** After signing in, the panel reads her own `admins` row (the policy from objective 12). A user without one is signed out and told the account has no access.
- **Keys.** The panel uses the project's publishable key, which is safe in a browser (https://supabase.com/docs/guides/api/api-keys).
  - The URL and the key live in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` inside `.env.local`, read through `import.meta.env` (https://vite.dev/guide/env-and-mode).
  - `.env.local` is git-ignored by `*.local`. `.env.example` lists the names.
- **Messages.**
  - Supabase does not tell a missing account from a wrong password (signInWithPassword page), so both show one message.
  - Password sign-in is rate limited per IP: 150 requests per 5 minutes (https://supabase.com/docs/guides/auth/rate-limits), and that limit has its own message.
- **The data stays on sample data** until objectives 14–16 move each page to Supabase.
- **The admin account.**
  1. The user creates it in the Supabase dashboard (Authentication → Users → Add user) with her own password, confirmed on creation, since a `.invalid` address never receives mail.
  2. Then she turns off "Allow new users to sign up" (https://supabase.com/docs/guides/auth/general-configuration).
  3. The account is created before sign-ups go off, because the docs do not say whether dashboard creation still works with sign-ups off.
  4. Her `admins` row is added with `execute_sql`.
- **Look.** The canvas has no sign-in artboard, so the screen is built from the panel's own components (`BrandMark`, `FormField`, `Button`). It is adjusted with the user once it is visible.

## Spec

1. **No session.** Opening the panel without a session shows the heading "Entrar al panel" with the fields "Celular" and "Contraseña" and the button "Entrar". The panel's navigation and data are not shown.
2. **Checking.** While the stored session is checked, the screen shows only "Abriendo el panel…".
3. **Stored session.** With an admin's stored session, the panel opens directly.
4. **Signing in.** The right phone and password open the panel on the page in the address (Agenda by default).
5. **Field checks.** Nothing is sent when a field is wrong:
   - A phone that is not 10 digits shows "Escribe los 10 dígitos de tu celular." Spaces and dashes are ignored.
   - An empty password shows "Escribe tu contraseña."
6. **Refusals.** A refused sign-in keeps her on the screen with one message:
   - Wrong phone or password: "Celular o contraseña incorrectos."
   - An account that is not an admin: "Esta cuenta no tiene acceso al panel."
   - Too many attempts: "Demasiados intentos. Espera unos minutos e intenta de nuevo."
   - No connection or any other failure: "No se pudo conectar. Revisa tu internet e intenta de nuevo."
7. **Pending.** While a sign-in is in flight, the button reads "Entrando…" and is disabled, so she cannot send it twice.
8. **Signing out.** "Cerrar sesión" in the panel ends the session and shows the sign-in screen.
9. **Session ends elsewhere.** When the session ends in another tab or expires, the panel shows the sign-in screen.
10. **Supabase adapter.**
    - It signs in as `<phone>@panel.calm.invalid`.
    - It maps errors: `invalid_credentials` means wrong credentials, `over_request_rate_limit` or HTTP 429 means too many attempts, and anything else means no connection (https://supabase.com/docs/guides/auth/debugging/error-codes).
    - It checks the `admins` row.
11. **Checks.**
    - Vitest covers 1–9 with a fake access port, plus the adapter's address and error mapping from 10.
    - The browser covers 10 against the CALM project: wrong password, right password, a reload keeps her in, and signing out.

## Log
