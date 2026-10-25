---
status: done
---

# Catálogo de servicios

## Goal

PDF step 7: add, edit and deactivate services with base price (MXN) and estimated time. The client app reads the active services (PDF step 2) and computes its preliminary quote with the current prices (step 3); changes reach the app on the client's next request.

Out of scope: the client app's catalog and quote screens (Android), linking orders to catalog services (Pedidos keeps free-text work for now).

## Decisions

- **Module:** `src/catalog/` with the same layers as Agenda and Pedidos; `CatalogRepository` port with an in-memory adapter until the API exists.
- **Service:** id, name, price, estimated time, active flag.
- **Price:** either a base price (whole pesos, greater than 0) or "Se cotiza en el local" (user request 2026-10-25), for work whose price depends on seeing the garment. Modelled as `{ kind: 'base'; amountMxn } | { kind: 'inStore' }` so every place that shows a price must handle both. The client app (out of this repo) must show such a service as "se cotiza en el local" and leave it out of the preliminary total.
- **Deactivate first, delete only a deactivated service** (user request 2026-10-25, revising "never delete"): deactivating hides a service from the client app and is reversible; deleting is permanent and only offered on deactivated services, so it takes two deliberate steps. The real API should delete logically (saved quotes keep pointing to the service); in this panel appointments store service names as text, so nothing breaks.
- **Forgiving actions:** deactivating asks for inline confirmation ("Los clientes ya no lo verán en la app"); activating again needs none (harmless, reversible).
- **Unique names:** two services with the same name would confuse clients; names compare ignoring case and accents (`localeCompare` with `sensitivity: 'base'`, [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare#sensitivity)).
- **Order:** alphabetical by name (`es-MX` collation), so the admin finds a service the same way every time.
- **Estimated time:** days until the garment is ready (user decision 2026-10-25): what the client wants to know when quoting, and a guide for the order's delivery date. Chosen from a list, 0 to 30, with 0 shown as "Mismo día" ("1 día", "3 días"), so there is nothing to type and no invalid value.
- **Shared form field:** the label + control + message `Field` from `NewOrderForm` gets its second caller, so it moves to `src/shared/ui/molecules/FormField.tsx`.

## Spec

1. Catálogo lists the active services alphabetically, each with name, "Precio base: $120 MXN" and "Tiempo estimado: 2 días" (or "Mismo día").
2. "Agregar servicio" opens a form (name, base price, estimated time); saving shows the service in the list.
3. "Editar" opens the same form prefilled; saving shows the new data.
4. A missing name, a price that is not a whole number greater than 0, or a name already used by another service shows a message next to the field and nothing is saved.
5. "Desactivar" asks "¿Desactivar {servicio}? Los clientes ya no lo verán en la app."; confirming moves it to "Servicios desactivados".
6. "Servicios desactivados" lists them with "Activar de nuevo", which returns the service to the active list.
7. The form's price offers "Tiene precio base" (shows "Precio base (MXN)") or "Se cotiza en el local" (hides it); such a service shows "Precio: se cotiza en el local". Editing it keeps the choice.
8. "Eliminar" on a deactivated service asks "¿Eliminar {servicio} para siempre? Esto no se puede deshacer."; "Sí, eliminar" removes it from the catalog, "No, conservarlo" keeps it. Active services offer no delete.

## Log

### 2026-10-25 — scenarios 1–6 GREEN

- **Outcome:** `src/catalog/` (domain: `Service`, `serviceProblems` with accent- and case-insensitive unique names; `CatalogRepository` port; in-memory adapter + `sampleCatalog`; UI: `CatalogPage` over list and form views, `ServiceCard` with inline deactivate confirmation). `FormField` and `FIELD_CONTROL_CLASSES` moved to `src/shared/ui/molecules/` and `NewOrderForm` uses them. The in-memory adapter numbers new ids instead of `crypto.randomUUID()`, which needs a secure context. 58/58 tests GREEN; `tsc`, `oxlint`, build clean. Tests locked.
- **Change (scenario 7, user request):** price is `{ kind: 'base'; amountMxn } | { kind: 'inStore' }`; the form offers "Tiene precio base" / "Se cotiza en el local" as whole-row radios and shows the amount field only for a base price; the card reads "Precio: se cotiza en el local". `change(field)` in `ServiceForm` is generic over the draft key so each field only accepts its own type. 61/61 GREEN; `tsc`, `oxlint`, build clean.
- **Pending:** user review of the screenshots.

### 2026-10-25 — done

- **Outcome:** Catálogo approved by the user. Scenarios 1–7; 61/61 tests GREEN across the app; `tsc`, `oxlint`, build clean. Test lock removed. All specific objectives in the index are done.
- **Pending checks:**
  - Client app (out of this repo): show "se cotiza en el local" services without a price and leave them out of the preliminary total.
  - Pedidos still takes free-text work; decide whether an order picks its services from the catalog.
  - Cross-feature, still open: the API and its technology (PDF "pendientes de confirmar"), admin login/logout, the Perfil page (still a placeholder), confirming `wa.me/52…` on a real phone, and replacing the in-memory adapters behind `AgendaRepository`, `OrdersRepository` and `CatalogRepository`.
- **Next step:** no specific objective left in the index. Candidates for a new one: the API adapters (once the technology is chosen), login, or the Perfil page.

### 2026-10-25 — scenario 8 GREEN (reopened)

- **Outcome:** deactivated services offer "Eliminar" next to "Activar de nuevo", with an inline confirmation that says it cannot be undone; `CatalogRepository.deleteService`. 64/64 tests GREEN; `tsc`, `oxlint`, build clean. Tests locked.
- **Pending:** user review; the real API should delete logically so saved quotes keep their service.

### 2026-10-25 — done (again)

- **Outcome:** scenario 8 approved by the user. Catálogo closed with scenarios 1–8; 64/64 tests GREEN; `tsc`, `oxlint`, build clean. Test lock removed. All specific objectives in the index are done.
- **Pending checks:** unchanged from the previous close, plus: the real API should delete services logically.
- **Next step:** no specific objective left in the index. Candidates: the API adapters (once the technology is chosen), admin login, or the Perfil page.
