---
status: in-progress
---

# Clientes: the admin gives clients access to the app

A new panel section where the admin lists the clients, registers a new one, and gives a client
access to the client app (CALM_mobile) with the NIP the client dictates at the counter. Request and
decisions: CALM_mobile `odd/tasks/panel-y-ajustes.md` S2. The backend is done and verified:
`supabase/functions/admin-enroll-client` and the computed field `has_app_access`.

## Specs

- **S1** — The user's request, verbatim: "Agrega a CALM_web el poder dar de alta a usuarios como
  dices", as chosen: "Página Clientes: alta + NIP que dicta el cliente".
- **S2** — Navigation: a section `{ id: 'clientes', label: 'Clientes', icon: 'group' }` after
  Catálogo in `SECTIONS`; the shell needs nothing else.
- **S3** — The list shows every client, alphabetically (`localeCompare(…, 'es-MX')`), each with
  her name, her phone grouped as "998 123 4567" or "Sin celular", and "Tiene acceso a la app" or
  "Sin acceso a la app". Loading reads "Cargando los clientes…"; empty reads "No hay clientes.".
  It reads `clients` with `select('id, name, phone, has_app_access')` — never `nip_hash`.
- **S4** — "Dar de alta cliente" (primary, icon `person_add`) opens a form with Nombre, Celular
  and NIP; it saves with "Dar de alta" (primary, icon `check`) or goes back with "Volver sin
  guardar" (icon `close`).
- **S5** — On each client: "Dar acceso a la app" when she has none, "Cambiar NIP" when she has
  one. It opens a form with her name as the title, Celular prefilled and editable, and NIP; it
  saves with "Guardar acceso" or goes back with "Volver sin guardar".
- **S6** — The form checks first, one message per field, in this wording: Nombre empty → "Escribe
  el nombre del cliente."; Celular not 10 digits → "Escribe el celular a 10 dígitos."; NIP not 4
  digits → "El NIP necesita 4 dígitos.". The NIP field takes digits only, at most 4
  (`inputMode="numeric"`, `type="password"`).
- **S7** — Saving calls `admin-enroll-client` through `client.functions.invoke`, with body
  `{ name, phone, nip }` for a new client or `{ client_id, phone, nip }` for an existing one
  (`client_id` a number, `phone` the 10 digits). Its refusals carry `{ error, code }` with HTTP
  400 (`name`, `phone`, `nip`), 403 (`not_admin`), 404 (`not_found`) or 409 (`phone_taken`); the
  form shows `error` as is, beside the field `code` names when it is one of them. Anything else
  reads "No pudimos guardar. Revisa tu internet e inténtalo de nuevo.". With supabase-js v2 a
  refusal arrives as `error` of type `FunctionsHttpError`, whose `context` is the `Response`.
- **S8** — After a save the page goes back to the list, which shows the new status. The NIP is
  never logged, never shown back, and the form forgets it.
- **S9** — Built like the catalog: `src/clients/{domain,application,infrastructure,ui}`, a
  `ClientsRepository` port with a Supabase adapter and an in-memory adapter for tests, the
  repository passed from `main.tsx` through `App` like `catalogRepository`, and
  `app-test-kit.ts` and `App.test.tsx` updated for the new section.
- **S10** — Tests in the catalog's style (vitest, Testing Library, `userEvent`): the list and its
  wording, registering a client, giving access to a client without one, changing a NIP, each
  local message, a refusal from the server shown beside its field, and the navigation names.

## Tasks

- [x] **T1** (S2–S10) — Clientes section, UI and adapters, with tests.

## Log

- **L1** — Backend evidence (live project, temporary admin, all test rows removed): no session and
  a client's session 403 `not_admin`; short phone 400 `phone`, short NIP 400 `nip`, no name 400
  `name`; another client's phone 409 `phone_taken`; new client 200 and she signs in; an existing
  client's NIP and phone reset 200, the new pair signs in and the old one does not; unknown
  `client_id` 404 `not_found`; `has_app_access` reads true or false and no response carries
  `nip_hash`.
- **L2** — T1 done: `src/clients/{domain,application,infrastructure,ui}`, the `clientes` section,
  `clientsRepository` passed from `main.tsx` through `App`. Tests 22 files / 130 → 24 files / 158,
  all passing; `tsc -b` and `oxlint` clean. Decisions: the new-client form is titled "Nuevo
  cliente" (S4 names no title); a refusal naming no field shown (`not_admin`, `not_found`) appears as
  an alert under the form; an unknown code, a non-JSON body or a failed request read as the
  "No pudimos guardar…" message; Celular accepts spaces and hyphens and sends the 10 digits; the
  form keeps the NIP after a refusal so she can retry, and drops it with the form after a save;
  the save button is disabled while saving. The typed `select` rejects the computed field
  (`SelectQueryError`), so the Supabase adapter casts its rows once, with a comment. The in-memory
  adapter's phone-taken message is its own; the real wording comes from the Edge Function.
- **L3** — Live check by the orchestrator, after the worker: the real `SupabaseClientsRepository`
  against the deployed function, signed in as a temporary admin. `clients()` listed the 7 clients
  with their access; another client's phone came back refused, beside Celular, in the server's
  words; a client registered through the adapter signed in to the app with her phone and NIP
  (200); after the adapter reset her phone and NIP, the new pair signed in (200) and the old one
  did not (401). A first run reported two 401s because its cleanup ran in parallel with the
  sign-in and deleted the client first; rerun step by step, it passed as above. Every test row
  and the temporary admin were removed; the project is back to 7 clients, 4 appointments, 5 auth
  users and 1 admin.
