---
status: done
---

# Agenda del día con detalle de cita

## Goal

Bring the canvas's agenda into the code. On desktop the day list sits beside the selected appointment's detail. On the phone the list opens the detail as its own screen.

Design reference: canvas artboards "Agenda · escritorio" (`Main.dc.html`) and "Agenda · teléfono" (`AgendaMovil.dc.html`).

## Decisions

- **The user's canvas edits.**
  - Each free slot is its own "Libre" row; there is no collapsed summary.
  - Times carry no "· ya pasó" or "· próxima" suffix. A free slot that already started now reads "Libre", like any other, instead of "Pasado". It sits under the "Antes de ahora" heading, so the heading says it is past, not each row.
- **"Registrar pedido" and "Falta el pedido" move to feature 11.**
  - Both join the agenda to the orders module: the button opens the new-order sheet with the appointment chosen, and the chip asks the orders repository whether the appointment has an order.
  - The orders side already exists (`NewOrderContainer` prefills from an appointment; `appointmentsAwaitingOrder` knows which have no order).
  - Feature 11 comes after feature 9, so the button lands on the restyled sheet.
- **Día / Semana is a segmented control.** It replaces the "Ver semana" and "Volver al día" buttons: one control, in one place, for both directions. The current view is pressed (`aria-pressed`).
- **"Hoy" is always in the day changer, disabled on today.** It replaces "Volver a hoy", which appeared and disappeared. A control that stays in place is easier to find again (Nielsen: consistency), and its disabled state also says "you are on today".
- **Selection is UI state in the day view.**
  - It is reset by remounting the view with `key={date}`, so a selection never survives a change of day.
  - Nothing is selected at first. The same state drives the phone's detail screen, so selecting one automatically would open a detail the admin did not ask for.
- **Split by the agenda's own width, not the window's.** A container query (`@container`, `@3xl` = 48rem, https://tailwindcss.com/docs/responsive-design#container-queries) puts list and detail side by side once the agenda is at least 768px wide: a 440px list, a 28px gap and a 300px detail. Below that, the detail replaces the list and the day controls, with "Volver a la agenda" at the top. A window breakpoint would have to subtract the sidebar's 288px by hand.
- **Detail actions.**
  - "Recordar por WhatsApp" stays the primary action with its current label, because it sends the prefilled reminder. The canvas's secondary "Escribir por WhatsApp" was secondary only to "Registrar pedido" (feature 11).
  - "Cancelar cita" becomes a quiet destructive button (white, red text) under the panel. Its confirmation stays inline (`ConfirmPanel`).
- **Heading outline.**
  - h1 "Agenda" › h2 the day (e.g. "Hoy, sábado 24 de octubre") › h3 "Antes de ahora" / "Más tarde" and the client's name in the detail.
  - Each slot list is named by its heading (`aria-labelledby`).
- **Notices and the block-day row become white cards on the gray ground,** like the canvas's grouped lists. How the block is confirmed belongs to feature 8.

## Spec

1. **View control.**
   - A group "Vista" has the buttons "Día" and "Semana". The one shown is `aria-pressed="true"`.
   - "Semana" opens the week; "Día" comes back to the day.
2. **Day changer.**
   - A group "Cambiar de día" has "Día anterior", "Hoy" and "Día siguiente".
   - "Hoy" is disabled on today. On any other day it brings the agenda back to today.
3. **Slots grouped by now.**
   - The region "Horarios del día" holds two lists: "Antes de ahora" for slots that already started, and "Más tarde" for the rest. An empty list is not shown.
   - On today, the text "Ahora · HH:MM" sits between them.
   - A free slot reads "Libre" in either list.
   - A past day shows only "Antes de ahora"; a closed or blocked day shows no slot.
4. **Appointment row.**
   - Each booked slot is a button with the time, the client, the work and "Ticket 4821 · Cotización $250 MXN".
   - On today, the first appointment that has not started also reads "Próxima".
5. **Detail.** Choosing an appointment shows the region "Detalle de la cita" with:
   - "Cita de las 10:30";
   - the client's name as a heading;
   - "Ticket 4821";
   - Trabajo, Cotización preliminar and WhatsApp: the number as "998 123 4567", or "No dejó número".

   The chosen row is `aria-current="true"`.
6. **Detail actions.**
   - "Recordar por WhatsApp" (the same prefilled link) appears only when the client left a number.
   - "Cancelar cita" keeps the same inline confirmation.
   - Neither appears once the appointment started.
7. **Back.** "Volver a la agenda" closes the detail.
8. **Before choosing.**
   - A day with appointments and none chosen shows "Elige una cita para ver su detalle." in the detail region.
   - A day without appointments has no detail region.
9. **Layout (visual check).**
   - With 768px or more of agenda width, list and detail sit side by side and "Volver a la agenda" is hidden.
   - Below that width, choosing an appointment hides the list and the day controls.

## Log

### 2026-11-17

**Outcome.**
- The day view follows the canvas:
  - a "Vista" segmented control ("Día", "Semana");
  - a "Cambiar de día" group with "Hoy" always in place;
  - "Antes de ahora" and "Más tarde" lists around an "Ahora · HH:MM" line;
  - compact appointment rows with "Próxima";
  - the region "Detalle de la cita", beside the list on a wide agenda and as its own screen on the phone.
- New files:
  - `DaySlots.tsx` (the slots region).
  - `AppointmentDetail.tsx`, which replaces `AppointmentCard.tsx`.
  - `shared/ui/molecules/SegmentedControl.tsx`.
- Other changes:
  - New button variant `subtleDanger`.
  - New tokens: `body-md`, `surface-container-low`, `now`.
  - The week view lost "Volver al día".

**Checks.**
- RED: 29 failures, all "Unable to find" for the new region, lists and buttons.
- GREEN: 75/75, with 8 new tests.
- `oxlint src`: exit 0. `npm run build`: clean.

Visual check in the dev server:
- **1280px:**
  - The detail is 360px and the list 540px.
  - The day changer is one line, 48px tall.
  - Row chevrons are `display: none`.
  - The chosen row has the 2px ink ring.
  - "Semana" is raised in white when pressed.
- **390px:**
  - Choosing Ana hides the list (`display: none`), focuses "Volver a la agenda" and scrolls to the top.
  - "Volver a la agenda" brings the list back, with the hint hidden.

**Deviation from the canvas.** On the phone, "Próxima" sits under the row's text, as in the canvas's phone artboard. Beside the text it squeezed the client's details into a narrow column.

**Finding.** Google's unlayered `.material-symbols-outlined` also sets `display: inline-block`, so a `hidden` class on `<Icon>` does nothing. The chevron is hidden through a wrapper. A lasting fix would load the icon stylesheet into a cascade layer, so Tailwind utilities win again (Tailwind's `@import … layer(...)`; https://developer.mozilla.org/en-US/docs/Web/CSS/@import#importing_css_rules_into_a_cascade_layer). That is worth a small chore of its own.

**Pending checks.**
- On the phone, "Volver a la agenda" returns to the top of the list, not to the row that was open. Returning focus to that row would keep the admin's place.
- "Registrar pedido" and "Falta el pedido" are feature 11.

**Next step.** Feature 8, [Mi horario y bloquear un día](horario-apple.md). Its first open question: how to confirm a block, with the canvas's modal or the inline `ConfirmPanel`.
