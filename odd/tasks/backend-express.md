---
status: in-progress
---

# Backend Express para el panel admin

Add an Express + TypeScript backend in `backend/` shaped like appVeterinaria's (routes → controllers → repositories → database), backed by the existing Supabase Postgres, and move the whole admin panel's data access to it, to meet the rubric criteria CALM_web still misses (C1, C2, C5, C7, C8). Rubric: `~/Descargas/Rubrica_Integral_FrontEnd_BackEnd_LITIID41 1.pdf`.

## Specs

- **S1** "Construye el backend para cumplir con los criterios que faltan una vez terminado la reestructuración del front o evalua cual es mejor plan de acción".
- **S2** Scope, user choice: "Todo el panel admin (recomendado)" — "Agenda, pedidos, catálogo, clientes y horario dejan de hablar directo con Supabase."
- **S3** Auth, user choice: "Token de Supabase Auth (recomendado)" — "El login sigue igual con Supabase Auth; React manda el token en Authorization: Bearer y un middleware de Express lo verifica y confirma que es admin."
- **S4** Database: "Se seguira usando Supabase para la base ded datos. La base de datos es a disposición nuestra."
- **S5** Rubric C1: "Frontend y backend separados; rutas, controladores, repositorios, tipos y configuración tienen funciones claras. Contratos coherentes y compilación correcta."
- **S6** Rubric C2: "Todos los endpoints pactados documentan método, URL, entradas, JSON de salida, códigos y regla de negocio; pruebas e implementación coinciden."
- **S7** Rubric C5: "Valida en backend campos, tipos, ID y reglas; usa SQL parametrizado, errores centralizados y asyncHandler o equivalente. Maneja 400, 404, conflictos aplicables y fallos de servicio con mensajes útiles."
- **S8** Rubric C7: "README instala y ejecuta ambos proyectos; incluye scripts SQL, datos de prueba, contrato API y .env.example; excluye secretos y node_modules." Deliverables: "README con alcance del módulo, integrantes y aportaciones, requisitos, comandos, puertos, configuración de CORS y pasos para iniciar"; "Script SQL de esquema y datos de prueba, diagrama breve de arquitectura y modelo de datos"; "Tabla de endpoints y pruebas breves con caso, entrada, resultado esperado y observado."
- **S9** The mobile app (calm_mobil) keeps using Supabase directly; nothing it uses changes.

## Tasks

- [x] B0 (S2) Map every frontend service method to the tables, RPCs and edge functions it uses, and the RLS it relies on. Route: explore. Commit: — (exploration)
- [x] B1 (S3, S5, S7) Backend skeleton: server, CORS, config/database (pg pool), auth middleware (Supabase token + admin check), error middleware, asyncHandler, env example file, tests. Risk: item 2 (auth). Route: worker. Commit: 5312677
- [x] B2 (S2, S5-S7) Catalog endpoints + frontend services switched to the API. Route: worker. Commit: 5312677
- [ ] B3 (S2, S5-S7) Clients endpoints (enrollment with NIP). Route: worker. Commit: —
- [ ] B4 (S2, S5-S7) Agenda and schedule endpoints. Route: worker. Commit: —
- [ ] B5 (S2, S5-S7) Orders endpoints. Route: worker. Commit: —
- [ ] B6 (S6, S8) Deliverables: API contract table, schema + seed SQL, architecture and data model diagram, README. Route: worker. Commit: —
- [ ] B7 (S1-S9) Verify against the rubric. Route: verify. Commit: —

## Log

- **L1** User: "Construye el backend para cumplir con los criterios que faltan una vez terminado la reestructuración del front o evalua cual es mejor plan de acción".
- **L2** User answers: scope "Todo el panel admin (recomendado)"; auth "Token de Supabase Auth (recomendado)".
- **L3** Front restructure done in 096a832 (refactor/estructura-appveterinaria); this branch starts from it. Pending from the user: Postgres connection string in backend/.env (never committed) and team member names for the README.
- **L4** B0 map: every admin read/write relies on RLS `private.is_admin()` (`admins.id = auth.uid()`); no RPC used by the panel; enrollment goes through edge function `admin-enroll-client` (argon2id m=19456 t=2 p=1 len 32, 16-byte salt; 400 name/phone/nip, 403 not_admin, 404 not_found, 409 phone_taken; updates auth email `<phone>@clients.calm.app` for app users; clears `sign_in_attempts`). Orders: partial unique index on active ticket (23505); `appointments` unique (date, time); deleting a referenced service fails with 23503. Latent issues: cancelAppointment deletes by ticket only (tickets repeat across dates); addOrder is several requests, not one transaction.
- **L5** Design decisions (technical): backend connects with `pg` (DATABASE_URL, postgres role, bypasses RLS) so the auth middleware is the guard: verify the Bearer token with Supabase Auth `getUser` (URL + publishable key, no JWT secret), then `select 1 from admins where id = $1` (401 without/invalid token, 403 not an admin). SQL always parameterized. Mutations of several rows run in one transaction (addOrder, enrollment). Enrollment is reimplemented in the backend with the same argon2 parameters; changing an app user's auth email uses the Supabase admin API with SUPABASE_SERVICE_ROLE_KEY from backend env. Cancel deletes by ticket + date. Frontend keeps SupabaseAdminAccess for sign-in only and gets `Api*Repository` classes implementing the same ports (token from the Supabase session, base URL VITE_API_URL); UI unchanged. Backend tests: vitest + supertest with fake repositories; SQL repository tests run only when DATABASE_URL is set. Endpoints: GET /api/health; services GET/POST, PUT/DELETE /:id; clients GET/POST, PUT /:id/access; schedule GET/PUT; blocked-dates GET/POST, DELETE /:date; appointments GET ?from&to, DELETE /:ticket?date=; orders GET/POST, PUT /:ticket.
- **L6** B1+B2 in 5312677: backend 45 tests, root 209 tests, tsc, oxlint, both builds pass. Root vitest excludes backend/**. safe-anything: SQL "injection" findings were false positives (only the fixed column list is interpolated; values are $n parameters), silenced with a reason; TLS: DATABASE_SSL_CA verifies Supabase's certificate when set, otherwise encrypted without verification (development). Guarded paths the user must create: backend env example and VITE_API_URL=http://localhost:3000/api in the root env example. Parallel plan: B3, B4, B5 as disjoint writers (each its own backend files, its own test harness, its own src/services/api-*-repository); the parent wires backend/src/app.ts, backend/test/test-app.ts and src/main.tsx afterwards. Independent verify of the auth guard (risk item 2) runs alongside.
- **L7** Independent verify of the auth guard (risk item 2): no way to reach admin data without a valid token and an admins row; blocker fixed in 59a86ac (Supabase Auth unreachable or 429 now answers 500, not 401) with tests; oversized body 413, unsupported charset 415. B3/B4/B5 writers finished (backend 167 tests, root 234): clientRouter(clients, authAccounts) renames the app user auth email after commit; agenda cancel needs (ticket, date) so the frontend port changes; orders add runs in one transaction (409 ticket_taken / appointment_has_order). Wiring + port change + removal of unused Supabase data adapters delegated to one worker. The user filled the root env example (VITE_API_URL).
