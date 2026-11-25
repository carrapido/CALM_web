---
status: in-progress
---

# Borrar clientes, contacto del taller y ejemplos genéricos

The panel can delete a client with all her history (test clients), the app's "Escribir al taller" and "Llamar al taller" use the workshop phone, and form examples stop showing data that could be real.

## Specs

- **S1** User: "Agrega este numero para los apartador de "Escribir al taller" y "Llamar al taller" en la aplicación movil, 9983259560". "Escribir al taller" opens WhatsApp to +52 998 325 9560; "Llamar al taller" dials it.
- **S2** User: "Cambia los placeholders de ejemplo a unos genericos por ejemplo en el numero de telefono cambialo a algo como 99XXXXX, etc, para no poner datos que estan en la base de datos." Scope, user choice: "App y panel" — "Los formularios de la app (inicio de sesión, agendar, perfil) y los del panel (clientes, pedidos)." Phone examples read "998 XXX XXXX"; no example may look like a real name, phone or ticket.
- **S3** User: "En CALM_web, agrega una función para borrar usuarios, porque hay clientes de prueba." Behavior, user choice: "Borrar todo lo suyo (recomendado)" — "Se borran el cliente, sus citas, sus pedidos y su cuenta de acceso a la app, previa confirmación en línea que dice cuántas citas y pedidos se van. Irreversible."

## Tasks

- [x] T1 (S3) Backend `DELETE /api/clients/:id` (admin only) in one transaction: her orders, appointments (appointment_services cascade), sign_in_attempts for her phone, the client row; then her Supabase auth user. A read of her history counts for the confirmation. Panel: "Borrar cliente" on each client with an inline ConfirmPanel naming the counts. Risk: item 1 (irreversible deletion of stored data). Route: worker. Commit: a1868f5
- [x] T2 (S2) Panel placeholders generic. Route: same worker. Commit: a1868f5 (no change needed)
- [x] T3 (S1, S2) App: contact actions with the workshop phone; generic placeholders. Route: worker (calm_mobil, parallel). Commit: calm_mobil ecbf3c1

## Log

- **L1** User: "Agrega este numero para los apartador de "Escribir al taller" y "Llamar al taller" en la aplicación movil, 9983259560 Cambia los placeholders de ejemplo a unos genericos por ejemplo en el numero de telefono cambialo a algo como 99XXXXX, etc, para no poner datos que estan en la base de datos. En CALM_web, agrega una función para borrar usuarios, porque hay clientes de prueba."
- **L2** User answers: deletion "Borrar todo lo suyo (recomendado)"; placeholders "App y panel". Found in the app: hints '998 123 4567' (schedule_sheet.dart:396, profile_screen.dart:112, app_constants.dart:9 hintPhone); "Escribir al taller" in order_detail_screen.dart:112 opens the help sheet; helpCall 'Llamar al taller' in app_constants.dart:52.
- **L3** a1868f5: client deletion (backend + panel). Parent change after the writer: the Supabase auth user is deleted inside the transaction before commit, so an Auth failure keeps everything (500, retryable) instead of leaving an orphan auth user that would block a new client with the same phone. Backend 305 + DB 49, root 223. calm_mobil ecbf3c1: WhatsApp/call to 998 325 9560, generic phone hints, 273 tests.
- **L4** Independent verify found a blocker caused by L3: deleting the auth user inside the transaction deadlocks against Supabase Auth (its delete sets clients.user_id null on the row we hold). Reproduced test-first against Postgres (lock timeout), fixed in 04ef28e: auth user first, then the rows in one transaction. Backend 305 + DB 50, root 223.
