---
status: pending
---

# Registrar pedido desde la cita

## Goal

Join the agenda to the orders module, as the canvas's appointment detail does:

- A "Registrar pedido" button in the appointment detail opens the new-order sheet with that appointment already chosen. The canvas note under it reads "Su nombre y el trabajo ya van escritos."
- A "Falta el pedido" chip marks an appointment that already started and has no order.

Design reference: canvas artboard "Agenda · escritorio" (`Main.dc.html`), the detail panel and María's row.

## Decisions

- The orders side already exists:
  - `NewOrderContainer` prefills a draft from an appointment.
  - `appointmentsAwaitingOrder` already matches orders to appointments by ticket, date and time.
- Comes after feature 9, so the button lands on the restyled new-order sheet.

## Open questions

Ask one at a time when the feature starts:

1. **How the agenda reaches the orders page.** Options: a hash route that carries the appointment (`#/pedidos/nuevo/<fecha>/<hora>`), or state lifted into `App`. A route survives a reload and the browser's back button.

## Spec

To be written once the question is answered.

## Log
