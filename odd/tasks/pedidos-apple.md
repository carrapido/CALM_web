---
status: done
---

# Pedidos: lista, detalle y hoja de nuevo pedido

## Goal

Bring the canvas's orders screens into the code. On desktop the order list sits beside the selected order's detail. On the phone the order detail is its own screen and a new order opens as a sheet.

Design reference: canvas artboards "Pedidos · escritorio" (`Pedidos.dc.html`), "Pedido · teléfono" (`PedidoMovil.dc.html`) and "Nuevo pedido · hoja" (`NuevoPedidoMovil.dc.html`).

## Decisions

- **The user's canvas edit: list rows show no delivery date.** Each row reads "Ticket 7720 · Carlos Ruiz", the work and a status chip. The list keeps its order, earliest delivery first; the date moves to the detail.
- **List and detail follow the agenda (feature 7).**
  - Split by the page's own width with a container query (`@3xl`, 768px; https://tailwindcss.com/docs/responsive-design#container-queries). The list and the detail share the width, 360px and 400px bases as in the canvas.
  - Below that width the detail is its own screen: the list and the toolbar step aside and "Volver a pedidos" sits on top. The canvas's "‹ Pedidos" becomes "Volver a pedidos", the same wording as "Volver a la agenda".
  - The chosen row is `aria-current="true"`, as in the agenda (the canvas uses `aria-pressed`).
  - Nothing is chosen at first, so the phone never opens a detail the admin did not ask for.
- **"Terminados", not "Entregados".** The second segment of "Qué pedidos ver" also lists cancelled orders, so "Entregados" would mislabel them. "Terminados" is the word feature 4 already used ("Ver terminados").
- **One status word for every state.** Row chip and detail title use the same word: Recibido, En proceso, Listo para recoger, Cliente en camino, Entregado, Cancelado. "Listo para recoger" and "Cliente en camino" get a green chip. The word, not the color, carries the state (WCAG 1.4.1).
- **Every order opens its detail, wherever it is listed.** A search result or a finished order opens the same detail. Active orders keep their controls there, so the admin can act on an order found by ticket. Finished orders are read only.
- **Delivering still asks first; the canvas's "Regresar a Listo" after Entregado is not offered.** The domain keeps finished orders unchanged (`updateActiveOrder`), and the client's ticket ends at Entregado. The confirmation stays inline (`ConfirmPanel`, feature 4).
- **After delivering or cancelling, a status line says where the order went:** "Pedido de Carlos Ruiz entregado. Lo encuentras en Terminados." It replaces the canvas's "Entregado hoy. Pasa a la lista de entregados.", which sat in a detail that no longer has its order. It is a `role="status"` live region (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role).
- **WhatsApp keeps feature 4's behavior.** A ready order offers "Avisar por WhatsApp", the prefilled notice. Without a number it says "No dejó WhatsApp para avisarle." (canvas wording). The canvas's generic "Escribir por WhatsApp" on every step is not added: before Listo there is nothing to tell the client.
- **Facts.** "Entrega" reads "Hoy, sábado 24 de octubre" on today, as the canvas's "Hoy, lunes 16", and the long date otherwise. The day view's title uses the same helper. "Total, se paga en el taller" keeps the desktop wording.
- **The search field follows the canvas.** A search icon, a hint inside the box and a visually hidden label "Buscar por ticket". Results replace the list until "Cerrar búsqueda".
  - The hint is "Ticket de 4 números": the canvas's "Buscar por ticket, 4 números" was cut off at phone width, and the icon and the "Buscar" button already say it is a search.
  - The field keeps its outline border (feature 6, WCAG 1.4.11) instead of the canvas's faint ring.
- **The new order is a sheet-styled screen in the page, not a modal.** It replaces the list as the old flow did.
  - The user chose inline over modals for confirmations ("En línea"); `ConfirmPanel` records why: a modal covers the screen and loses the admin's place.
  - A modal sheet would also need `HTMLDialogElement.showModal()`, which the test DOM (jsdom 30) does not implement.
- **The sheet's leading button reads "Volver sin guardar", not "Cancelar".** On this page "Cancelar" means cancelling an order, and `ConfirmPanel` already bans bare "Cancelar". The button sits above the title, where a long label cannot crowd it.
- **"¿De qué cita viene?" is a radio group of native radios.** Native inputs bring arrow-key movement and the checked state for free (https://www.w3.org/WAI/ARIA/apg/patterns/radio/). Each option shows the client and "Hoy a las 10:30 · Ticket 4821"; the last is "Llegó sin cita".
  - The first appointment is chosen at start, as in the canvas, with its client's data prefilled. Without appointments, "Llegó sin cita" is chosen.
  - Choosing an appointment fills the fields from it; "Llegó sin cita" empties them.
  - A note under "Registrar pedido" says which ticket the order gets: "Conserva el ticket 4821 de su cita." or "Se crea un ticket nuevo de 4 números."
- **The sheet keeps "WhatsApp (opcional)".** The canvas drops it, but a walk-in client could then never get the ready notice.
- **Fields keep their outline border** inside the grouped list, as decided in feature 6 (WCAG 1.4.11). The delivery date stays a native date input instead of the canvas's "Cambiar" button.
- **"Pedido registrado" with the ticket stays** after saving: the admin copies the number onto the client's paper receipt.
- **The header's count** ("2 en el taller · 1 listo para recoger") sits under the title, above the toolbar. The title belongs to the shared page frame, which has no line above it.

## Spec

1. **Toolbar.**
   - "Nuevo pedido" sits beside the title.
   - A line counts the orders: "2 en el taller · 1 listo para recoger". The second part is left out when no order is ready.
   - A group "Qué pedidos ver" has "En el taller" (pressed at first) and "Terminados".
2. **Rows.**
   - The list "Pedidos en el taller" holds the active orders, earliest delivery first.
   - Each row is a button with "Ticket 7720 · Carlos Ruiz", the work and the status ("Listo para recoger"). It shows no delivery date.
3. **Detail.**
   - Before choosing, the region "Detalle del pedido" says "Elige un pedido para ver su detalle."
   - Choosing a row shows "Ticket 7720", the client's name as a heading, the work, the status, the progress "Avance del pedido" with the current step, "Entrega" with "Domingo 25 de octubre" (or "Hoy, sábado 24 de octubre") and "Total, se paga en el taller" with "$150 MXN".
   - The chosen row is `aria-current="true"`. "Volver a pedidos" closes the detail.
4. **Moving.** "Empezar a trabajar" moves the order to En proceso, in the detail and in its row. "Regresar a Recibido" moves it back.
5. **Delivering.**
   - "Marcar como entregado" asks "¿Entregar el pedido de Carlos Ruiz?".
   - "Sí, entregar el pedido" takes it off the list and says "Pedido de Carlos Ruiz entregado. Lo encuentras en Terminados."
   - "No, todavía no" keeps it on Listo.
6. **Cancelling.** "Cancelar pedido" asks "¿Cancelar el pedido de Lucía Gómez?". "Sí, cancelar el pedido" takes it off the list and says "Pedido de Lucía Gómez cancelado. Lo encuentras en Terminados."
7. **WhatsApp.**
   - A ready order with a number has the link "Avisar por WhatsApp" with the prefilled notice.
   - A ready order without a number says "No dejó WhatsApp para avisarle."
   - Before Listo there is no link.
8. **Client on the way.**
   - Row and detail read "Cliente en camino"; the progress stays on Listo.
   - "Marcar como entregado" is there, without the WhatsApp notice.
   - "Regresar a Listo" brings back "Listo para recoger".
9. **Terminados.** The list "Pedidos terminados" holds delivered and cancelled orders, newest first, with "Entregado" or "Cancelado". Their detail has no buttons except "Volver a pedidos".
10. **Search.**
    - Searching "3301" shows the list "Resultados de la búsqueda" with Elena Díaz, Entregado. Choosing it opens its detail.
    - "9999" says "No hay ningún pedido con el ticket 9999". "33" says "Escribe los 4 números del ticket".
    - "Cerrar búsqueda" brings the list back.
11. **New order.**
    - "Nuevo pedido" opens the region "Nuevo pedido".
    - The group "¿De qué cita viene?" offers today's and recent appointments without an order ("María López", "Hoy a las 10:30 · Ticket 4821"; "Juan Pérez", "Viernes 23 de octubre a las 11:00 · Ticket 0937") and "Llegó sin cita".
    - The first is chosen, its data prefilled, with "Conserva el ticket 4821 de su cita.".
    - "Llegó sin cita" empties the fields and says "Se crea un ticket nuevo de 4 números."
12. **Registering.**
    - "Registrar pedido" shows "Pedido registrado" with the ticket and "Anota este número en el recibo del cliente."; "Ver pedidos" lists the new order on Recibido.
    - An appointment with an order leaves the choices.
    - A walk-in order gets a ticket no active order uses.
    - Missing or wrong data shows each field's message and saves nothing; "Volver sin guardar" goes back to the list.
13. **Layout (visual check).**
    - With 768px or more of page width, list and detail sit side by side and "Volver a pedidos" is hidden.
    - Below that width, choosing an order hides the toolbar and the list.
    - The new-order sheet is one centered column on desktop and fills the width on the phone.

## Log

### 2026-11-17 — done

**Outcome.** Pedidos follows the canvas, with the decisions above. All 13 spec items hold.
- "En el taller" / "Terminados" segmented control, ticket search, grouped rows with a status chip and no delivery date.
- The detail has the ticket, the client, the status, the 4-bar progress, the next step, the WhatsApp notice, "Entrega" / "Total" and step back / cancel.
- The new-order sheet has "¿De qué cita viene?" radios and grouped fields, then "Pedido registrado" with the ticket.

**Checks.**
- RED: 32 failing tests across `orders-list.test.tsx` (renamed from `active-orders.test.tsx`), `find-orders.test.tsx`, `client-on-the-way.test.tsx` and `new-order.test.tsx`; tests locked.
- GREEN: 92/92 (14 files) on the first run; lock removed. Still 92/92 after the visual fixes.
- `oxlint src`: exit 0. `npm run build`: OK.
- Browser, 1280×900:
  - List and detail side by side.
  - "Marcar como listo" turns the row chip green, adds "Avisar por WhatsApp" and updates the count to "2 listos para recoger".
  - Delivering asks inline; once confirmed, the order leaves the list and the green status line names it.
  - "Terminados" shows the delivered order read only, with the four bars filled.
  - The sheet is one centered 576px column with the footer note "Conserva el ticket 4821 de su cita."
- Browser, 390×844:
  - No horizontal overflow (`scrollWidth − innerWidth = 0`) on the list, the detail and the sheet.
  - Choosing an order hides the toolbar and the list and focuses "Volver a pedidos".
  - In the sheet, Tab lands on the chosen radio; the down arrow chooses the next appointment and refills the fields; the row draws the 3px focus ring.

**Deviations from the canvas.** Listed under Decisions: "Terminados", the kept delivery confirmation, the status line, the in-page sheet, "Volver sin guardar", the kept WhatsApp field, bordered fields and the shorter search hint.

**Fixed during the visual check.**
- "Regresar a En proceso" broke onto two lines inside its button; the back and cancel buttons now size to their label (`flex-[1_1_auto]`, `whitespace-nowrap`) and wrap as whole buttons.
- On the phone the chip squeezed the client and the work into three lines; it now sits under the work below `@3xl`.
- The search hint was cut off on the phone (see Decisions).

**Refactors in passing.**
- `formatDayLabel` in `shared/ui/format.ts` now gives both the day view's title and the order's "Entrega".
- The card shadow, repeated as an arbitrary value in five files, is now the theme token `--shadow-card` (`shadow-card`, https://tailwindcss.com/docs/box-shadow#customizing-your-theme).

**Pending.**
- In the detail card, `ConfirmPanel`'s two buttons are side by side from the `sm` window breakpoint. At about 380px of card width "Sí, entregar el pedido" wraps onto two lines. The shared panel would need a container query to fix it.
- The progress label "En proceso" wraps onto two lines at phone width (14px; the canvas uses 12px).
- The two earlier pending items stay in `agenda-apple.md`.

**Next.** Feature 10, [Catálogo: lista y panel de edición](catalogo-apple.md).
