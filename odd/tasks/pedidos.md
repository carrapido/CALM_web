---
status: done
---

# Pedidos

## Goal

PDF steps 9-10: register an order from an appointment (it keeps the appointment's 4-digit ticket), or create a new ticket for a walk-in client, with its final price (MXN) and estimated delivery date, starting in Recibido; move it through En proceso → Listo para entrega → Entregado, or Cancelado. Find an order by its ticket.

PDF step 9 decision: if the client does not accept the final price she takes her garments back and no order is registered. PDF step 11 ("avisa al cliente", today informal) becomes "Avisar por WhatsApp" on ready orders.

Out of scope: payment (in store, PDF), the client's ticket screen (Android app), choosing services from the catalog (feature 5 does not exist yet: the work is free text, prefilled from the quote).

## Decisions

- **Module:** `src/orders/` with the same layers as Agenda. Orders read appointments through Agenda's `AgendaRepository` (dependency orders → agenda, never the reverse).
- **Order:** ticket, client name, optional WhatsApp, work description, final price (MXN), estimated delivery date, status, and the appointment it came from (if any).
- **Statuses:** `Recibido → En proceso → Listo para entrega → Entregado`, or `Cancelado` from any status before Entregado. Shown as a 4-step stepper with short labels (Recibido, En proceso, Listo, Entregado); Cancelado is a banner, not a step ([market study](../research/market-study.md)).
- **One action per order:** each active order shows a single button for the next step ("Empezar a trabajar", "Marcar como listo", "Marcar como entregado"). Entregado and Cancelar ask for inline confirmation (same `ConfirmPanel` as Agenda). "Regresar a {previous status}" undoes a step tapped by mistake.
- **Walk-in ticket:** 4 random digits, unique among active tickets (appointments and orders not yet Entregado or Cancelado). The random source is injected so tests are deterministic.
- **Price:** whole pesos, `inputmode="numeric"`, must be greater than 0. **Delivery date:** native `<input type="date">`, today or later.
- **"Pedido listo" by WhatsApp:** same click-to-chat as the Agenda reminder: "Hola {nombre}, tu pedido con ticket {1234} ya está listo. Total: ${precio} MXN. Puedes pasar a recogerlo."
- **Shared kernel:** `CalendarDate` and the Cancún clock move to `src/shared/domain/`, the date and peso formatters and the `wa.me` link builder to `src/shared/ui/`, so Orders reuses them without importing Agenda's UI.
- **Order identity:** an order is found by its ticket among active orders; finished orders never change. An order from an appointment records that appointment's date and time, so an old finished order that shares a ticket is never confused with it.
- **7-day window:** older appointments without an order are clients who did not come; listing them forever would bury today's.
- **List order:** active orders sorted by delivery date, the earliest first, so what is due today is on top. Entregado and Cancelado orders go to "Ver terminados".

## Spec

1. Pedidos lists the active orders by delivery date. Each shows ticket, client name, work, final price, delivery date ("Entrega: martes 27 de octubre") and the stepper with the current status marked.
2. "Nuevo pedido" lists "Citas sin pedido" (today's appointments and those of the previous 7 days that have no order yet, today first) as large buttons with day, time and name, plus "Cliente sin cita". Choosing an appointment opens the form prefilled with the client's name, WhatsApp and the quote's services; the order keeps the appointment's ticket and the appointment leaves the list (user decision 2026-10-25: pick from a list, recognition over recall).
3. "Nuevo pedido" for a walk-in client: name, optional WhatsApp (10 digits), work, final price and delivery date; it gets a new unique ticket shown in large digits so the admin can write it on the client's receipt.
4. A new order starts in Recibido. Missing name, work, price ≤ 0 or a past delivery date show a message next to the field and nothing is saved.
5. The next-step button moves the order one status forward; "Regresar a {status}" moves it one back.
6. "Marcar como entregado" asks "¿Entregar el pedido de {nombre}?" before moving it to Entregado; the order leaves the active list.
7. "Cancelar pedido" asks "¿Cancelar el pedido de {nombre}?"; confirming moves it to Cancelado and out of the active list.
8. A ready order with a number shows "Avisar por WhatsApp" with the prefilled message; without a number it shows "Sin WhatsApp".
9. "Buscar por ticket" with 4 digits shows the orders with that ticket, active or finished (a ticket is unique only among active ones, so an old finished order may share it); an unknown ticket says "No hay ningún pedido con el ticket {1234}".
10. "Ver terminados" lists Entregado and Cancelado orders, newest first, read only.

## Log

### 2026-10-25 — scenarios 1–10 GREEN

- **Outcome:** `src/orders/` (domain: statuses, ticket draw, new-order validation; application: `OrdersRepository` port, `registerOrder`, `appointmentsAwaitingOrder`; in-memory adapter + `sampleOrders`; UI: `OrdersPage` view router over active, finished, choose-client, form and registered views). Shared kernel moved to `src/shared/` (`calendar-date`, `format`, `whatsapp-link`, `useQuery`); `ConfirmPanel` gained a neutral tone. 49/49 tests GREEN (31 Agenda/shell + 18 Pedidos); `tsc`, `oxlint`, build clean. Tests locked.
- **Test fix:** the first GREEN run failed 3 tests because `getAllByRole('listitem')` also counted each card's stepper steps; the kit's `cardsIn` now counts direct items only.
- **Pending:** user review of the screenshots; in the demo data no appointment is today or earlier, so "Citas sin pedido" is empty until real data exists.

### 2026-10-25 — done

- **Outcome:** Pedidos approved by the user from the screenshots (390px and 1280px). Scenarios 1–10; 49/49 tests GREEN; `tsc`, `oxlint`, build clean. Test lock removed.
- **Pending checks:**
  - On phones the stepper is tight: "En proceso" wraps and the check crowds "Recibido" (user approved as is).
  - Confirm `wa.me/52…` on a real phone (shared with Agenda).
  - The in-memory adapters lose changes on reload; the API (technology undecided) replaces them behind `OrdersRepository` and `AgendaRepository`. A real API must also enforce ticket uniqueness and status changes server side (PDF: "La API rechaza el cambio si no proviene de la administradora").
  - The work is free text; once Catálogo exists, decide whether the order picks services from it.
- **Next step:** [Catálogo de servicios](catalogo.md): write its spec. Add, edit and deactivate services with base price (MXN) and estimated time (PDF step 7); the client app reads active services for its preliminary quote. Reuse `PageFrame`, `Button`, `ConfirmPanel`, the form `Field` pattern from `NewOrderForm` and `useQuery`.
