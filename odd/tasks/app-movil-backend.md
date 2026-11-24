---
status: in-progress
---

# La app móvil pasa por el backend

calm_mobil (Flutter) stops calling Supabase for data and goes through the Express API, like the admin panel: Flutter → `/api/client/*` → controller → repository → Postgres. Supabase Auth keeps issuing the client's session; the client Supabase edge functions and RPCs the app used are retired. Mirror for the Flutter side: `calm_mobil/odd/tasks/backend-api.md`.

## Specs

- **S1** User: "Si, la aplicación movil debe pasar por el backend, por que tambien debe de haber modificaciones en flutter".
- **S2** Sign-in, user choice: "Backend + sesión de Supabase Auth (recomendado)" — "POST /api/client/sign-in verifica teléfono y NIP (mismo límite de 5 intentos y 15 min) y devuelve la sesión de Supabase Auth. La app manda ese token a la API, igual que el panel. Reutiliza todo lo que ya funciona."
- **S3** Demo platform, user choice: "Emulador de Android" — "La app llega a tu compu por http://10.0.2.2:3000/api."
- **S4** Retired functions, user choice: "Retirarlas" — "Se borran del repo y de Supabase; todo pasa solo por el backend. Irreversible sin redeploy." Scope: edge functions client-sign-in, client-book, client-update-profile and the RPCs cancel_my_appointment and mark_on_my_way.
- **S5** Behavior parity: every rule the retired functions enforced is kept (validation, 5-attempt / 15-minute NIP throttle via claim_nip_attempt, argon2id NIP with a decoy hash for unknown phones, 62-day booking window in Cancún time, opening hours, blocked dates, slot taken, 24 h cancel rule, ready → onTheWay only, phone/NIP change rules, auth email `<phone>@clients.calm.app`).
- **S6** The admin panel and its API keep working unchanged.

## API contract (camelCase JSON; errors `{error, code}` as the admin API)

Client auth: `requireClient` reads `Authorization: Bearer <Supabase access token>`, `auth.getUser`, then `clients where user_id = $1`; no token, invalid token or no client → 401 `signed_out`. Mounted before the admin guard; `/api/client/*` never accepts admin-only routes and admin routes never accept a client token.

| Method | URL | Auth | Body / query | Success | Errors |
|---|---|---|---|---|---|
| POST | /api/client/sign-in | none | `{phone, nip}` | 200 `{refreshToken, client:{id, name, phone}}` | 400 `phone`/`nip`, 401 `rejected`, 429 `throttled` |
| GET | /api/client/services | none | — | 200 `[{id, name, category, basePriceMxn}]` active only, by id | — |
| GET | /api/client/booking-calendar | none | — | 200 `{today, now, weekly:[{weekday, opensAt, closesAt}], blocked:[date], booked:[{date, time}]}` (this month and next, no client data) | — |
| GET | /api/client/profile | client | — | 200 `{name, phone}` | 401 `signed_out` |
| GET | /api/client/orders | client | — | 200 `{orders:[{ticket, work, status, finalPriceMxn, deliveryDate}], appointments:[{ticket, date, time, preliminaryTotalMxn, services:[name], hasOrder}]}` her own only | 401 |
| POST | /api/client/appointments | client OR contact | `{serviceIds:[int], urgent, date, time, contact?:{name, phone, nip}}` | 201 `{ticket, client:{id,name,phone}, appointment:{date, time, totalMxn}, refreshToken?}` (refreshToken only on the contact path) | 400 field, 401 `signed_out` / `rejected`, 409 `slot_taken` / `phone_without_nip` / `service_unavailable`, 429 `throttled` |
| DELETE | /api/client/appointments/:ticket | client | — | 204 | 409 `appointment_not_cancellable`, 401 |
| POST | /api/client/orders/:ticket/on-my-way | client | — | 204 | 409 `order_not_ready`, 401 |
| PUT | /api/client/profile | client | `{phone, currentNip?, newNip?}` | 200 `{client:{id, name, phone}}` | 400 `phone`/`new_nip`, 401 `current_nip`/`signed_out`, 409 `phone_taken`, 429 `throttled` |

## Tasks

- [x] M1 (S2, S5) Backend client auth (`requireClient`) + `POST /api/client/sign-in` (claim_nip_attempt, decoy argon2 verify, auth user create/link/orphan reuse, magic-link refresh token via service role, clear failures). Risk: item 2. Route: worker (CALM_web). Commit: ac76591
- [x] M2 (S1, S5, S6) Backend client data endpoints (services, booking-calendar, profile, orders, book, cancel, on-my-way, update profile) with parameterized SQL and transactions. Route: same worker. Commit: ac76591
- [x] M3 (S1, S3) Flutter: Api implementations of ClientAccess and ClientData over HTTP (`API_URL` dart-define, `http://10.0.2.2:3000/api` in the env example), Android cleartext allowed only for local development hosts, supabase_flutter kept only for the session. Route: worker (calm_mobil, parallel to M1-M2, against this contract). Commit: calm_mobil e42f409
- [ ] M4 (S4) Retire client-sign-in, client-book, client-update-profile and the RPCs cancel_my_appointment / mark_on_my_way: repo removal + migration; remote undeploy and migration apply as the last step. Route: inline after M7 checks. Commit: —
- [x] M5 Docs in both repos (api.md, pruebas.md, arquitectura.md flow for the app, READMEs, env README). Route: worker. Commit: 6eaed0c; calm_mobil 8b95a29
- [ ] M6 (S1-S6) Verify end to end: backend tests + test:db, flutter test, run the API and the app flows against a local or real backend. Route: verify. Commit: —

## Log

- **L1** User: "Si, la aplicación movil debe pasar por el backend, por que tambien debe de haber modificaciones en flutter".
- **L2** Exploration of calm_mobil: ports ClientAccess (signIn) and ClientData (isSignedIn, catalog, orders, profile, agenda, book, cancelAppointment, markOnMyWay, saveProfile, signOut); Supabase implementations in lib/services/supabase_client_{access,data}.dart; fakes in test/support and test/screens; about 178 tests; config by --dart-define-from-file=env/supabase.json; no http package; flutter 3.47.4 installed. Server logic mapped from supabase/functions/{client-sign-in,client-book,client-update-profile,_shared/client-auth.ts} and the RPC migrations.
- **L3** User answers: sign-in "Backend + sesión de Supabase Auth (recomendado)"; demo "Emulador de Android"; retired functions "Retirarlas".
- **L4** M3 in calm_mobil e42f409 (216 flutter tests, analyze clean, debug APK builds; INTERNET permission added to the main manifest). M1+M2 in ac76591: 82 route tests + 14 DB tests (backend 285, DB suite 38 on Postgres 17). Live check on the user's backend: GET /api/client/services and /booking-calendar answer real data; /api/client/profile without token 401 signed_out. Deviations accepted: ids are strings (Flutter uses toString / int.parse, compatible); booking with neither contact nor session is 401 signed_out; malformed contact is 400 even with a session; 401/429 carry codes; booking success is 201.
- **L5** Independent verify (risk item 2) of ac76591 + e42f409: no blockers. Guard matrix, per-client isolation (A cannot see, cancel or advance B's rows), NIP throttle (5 then 429), decoy hash and equal timing for unknown phones, booking/cancel/on-my-way/profile parity all met over HTTP on a throwaway Postgres; flutter analyze clean, 216 tests. Live read-only check: the backend role (postgres) can execute claim_nip_attempt, orphaned_auth_user_id and booking_calendar. Not yet verified: real session minting against Supabase and the emulator flow (user test). Advisories kept from the old functions: phone_without_nip reveals a registered phone; contact credentials win over a session token. Suggested SQL tests: shared-ticket cancel isolation, on-my-way on another client's order, orders isolation, claim_nip_attempt 5 then false, booking transaction and slotTaken.
- **L6** 6eaed0c: client edge functions removed from the repo, migration 20261124120000_retire_client_rpcs.sql drops cancel_my_appointment and mark_on_my_way (keeps claim_nip_attempt, orphaned_auth_user_id, booking_calendar, private.current_client_id for RLS), database.types.ts updated, docs (api.md client section, pruebas.md, arquitectura.md app flow, README). Backend 285 + DB 43, root 215. calm_mobil 8b95a29: Supabase data adapters removed, signed_out on cancel/on-my-way says the session ended; 207 flutter tests. Pending: user emulator test, then remote undeploy of the three functions and applying the migration.
- **L7** User emulator test: "Al principio podia realizar tareas con normalidad, pero llego un momento en el que salio de la sesión y marca error de conexión. El backend esta encendido. Ademas cuando quieres agendar una sita mientras tienes el error de sin conexión muestra una pantalla con el boton de reintentar, pero en la parte inferior tiene los apartados como si tuvieras una sesión valida". Hypotheses: (a) ApiClient.forSupabase reads `currentSession?.accessToken` synchronously and never refreshes, so after the access token expires (1 h) or after the app is paused, the API answers 401 signed_out; (b) the emulator lost network to Supabase/10.0.2.2, so the session refresh failed and supabase_flutter dropped the session; (c) UI: the error screen keeps the bottom tabs even when there is no valid session. Evidence requested from the user: backend request log lines at the moment of failure.
- **L8** calm_mobil 445fdc6: (a) confirmed and fixed: the token was never refreshed (supabase_flutter stops background refresh while paused), so an expired token reached the API; the app now refreshes before each request (expired or within 60 s) and a really ended session signs out to Entrada with "Tu sesión terminó. Vuelve a entrar."; (c) confirmed and fixed: error frames hid nothing, now the tab bar is hidden without a session. (b) open: the user reports the backend terminal showed no request lines at all and the emulator had internet; asked the user to check the log line of a direct request and http://10.0.2.2:3000/api/health from the emulator browser. 229 flutter tests.
