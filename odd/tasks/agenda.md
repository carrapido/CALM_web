---
status: done
---

# Agenda y horario

## Goal

PDF steps 7 and 8, in one tab (user decision 2026-10-25: Agenda and Horarios merged):

- Day and week agenda, each appointment with its 4-digit ticket, client name, optional WhatsApp number and linked preliminary quote. 30-minute slots, Cancún local time.
- Block a day directly from the day view.
- "Mi horario" button in the Agenda header to set business days and hours (rarely changed).
- "Recordar por WhatsApp" on appointments that have a number (user chose name + optional WhatsApp "para mandar el recordatorio"; evidence in the [market study](../research/market-study.md)).
- Cancel an appointment: the PDF lets clients cancel in the app only up to 24 h before; after that "el cliente debe contactar directamente al negocio", so the admin must be able to cancel it herself.

Out of scope: the admin booking appointments herself (the PDF gives booking only to the client app), login (API technology undecided).

## Decisions

- **Screaming architecture:** a `src/agenda/` module with `domain/` (pure rules: slots, schedule, reminder link), `application/` (the `AgendaRepository` port), `infrastructure/` (in-memory adapter seeded with sample appointments until the API exists) and `ui/` (container `AgendaPage`, presentational views).
- **Cancún time:** `America/Cancun` has been fixed UTC−5 with no daylight saving since 2015. Dates are formatted with `Intl.DateTimeFormat` and `timeZone: 'America/Cancun'` ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#timezone)), so the agenda shows Cancún time even when the device is set elsewhere. "Today" comes from an injected clock so tests are deterministic.
- **Week view for an older admin on a phone:** a 7-column time grid is unreadable at 390px. The week is a list of 7 days (Monday to Sunday), each with its appointment count. Tapping a day opens that day's view.
- **Day view:** every 30-minute slot inside business hours, in order. A booked slot is a card; a free slot is a thin "Libre" row, so she sees the shape of the day at a glance.
- **WhatsApp number:** stored as the 10-digit national number. The link is `https://wa.me/52<10 digits>?text=<encodeURIComponent(message)>`: international format without `+`, spaces or dashes ([WhatsApp FAQ](https://whatsapp.com/faq/en/general/26000030)). Since 3 Aug 2019 Mexican numbers are dialed as 10 digits and from abroad as +52 + 10 digits, with no mobile `1` ([IFT Q&A](https://www.ift.org.mx/sites/default/files/preguntas_y_respuestas_marcacion_a_10.pdf)). Third-party sources say WhatsApp redirects both `52` and `521` ([Green-API](https://green-api.com/en/docs/faq/features-of-the-checkwhatsapp-method-with-some-numbers/)); confirm on a real phone.
- **Reminder text:** "Hola {nombre}, te recuerdo tu cita en Costurando a la medida el {día} a las {hora}. Tu ticket es {1234}."
- **Forgiving actions:** destructive actions (cancel, block) ask for confirmation in plain words, with buttons that say what they do ("Sí, cancelar la cita" / "No, dejarla"), not "Aceptar"/"Cancelar". No timed undo: timeouts penalize slow readers. The confirmation appears inline, where she tapped, not in a modal that covers the screen. Unblocking a day needs no confirmation: it is harmless and reversible.
- **Views:** Agenda has three views in one tab: day (default), week and "Mi horario". Each view is a container (loads data, handles actions) over a presentational component.
- **Past days are read only:** no cancel, block or reminder; the admin can still browse them, e.g. to register the order of yesterday's appointment (user decision 2026-10-25). Booking in the past is impossible by construction: only the client app books, and only future slots (PDF business rules).
- **Seed schedule:** Monday to Saturday 10:00–18:00, Sunday closed. A placeholder the admin replaces in "Mi horario".

## Spec

Today is a fixed date in tests; the in-memory adapter holds the fixtures.

### Day view

1. Opening Agenda shows today's day view with a heading naming the date in Spanish, e.g. "Hoy, sábado 25 de octubre".
2. It lists the 30-minute slots from opening to closing time. A booked slot shows the time, client name, ticket and the linked quote (services and preliminary total in MXN). A free slot shows "Libre".
3. "Día siguiente" and "Día anterior" move one day; on any day but today, "Volver a hoy" returns to today.
4. A closed weekday shows "Cerrado" and no slots.

### Week view

5. "Ver semana" shows the 7 days of the week of the day being viewed, Monday to Sunday, each with its number of appointments ("2 citas", "Sin citas", "Cerrado" or "Bloqueado").
6. Choosing a day in the week view opens that day's view.

### WhatsApp reminder

7. A future appointment with a number shows a "Recordar por WhatsApp" link to `https://wa.me/52<number>?text=<reminder text>`, opening in a new tab.
8. An appointment without a number shows "Sin WhatsApp" and no link.

### Cancel an appointment

9. "Cancelar cita" asks "¿Cancelar la cita de {nombre} a las {hora}?". "Sí, cancelar la cita" frees the slot ("Libre"); "No, dejarla" keeps it.

### Block a day

10. "Bloquear este día" on an open day without appointments asks for confirmation; confirming shows "Día bloqueado" and a "Desbloquear día" button that reverts it.
11. A day with appointments cannot be blocked: "Bloquear este día" says "Este día tiene {n} citas. Cancélalas primero." ("1 cita. Cancélala primero." for one) and nothing changes (user decision 2026-10-25: she notifies each client with the reminder link and no appointment is left orphaned, P3).

### Mi horario

12. "Mi horario" opens a form with one row per weekday: open or closed, opening and closing time in 30-minute steps from 06:00 to 22:00. "Volver sin guardar" leaves without changes.
13. Saving shows the day view with the new hours. Closing must be later than opening; otherwise the row says "La hora de cierre debe ser después de la apertura" and nothing is saved.

### Past days

14. An appointment that already started (any on a past day) shows no cancel or reminder action, and a past day has no block action.
15. A free slot that already started (Cancún time) shows "Pasado" instead of "Libre", today and on past days.
16. An appointment outside the current business hours (hours changed after it was booked) is still listed at its time, so changing "Mi horario" never hides an appointment (P3).

## Log

### 2026-10-25 — day view (scenarios 1–4) GREEN

- **Outcome:** `src/agenda/` module (domain, `AgendaRepository` port, in-memory adapter with `sampleAgenda`, `AgendaPage` container + `DayView`). `App` receives the repository and clock from `main.tsx` (composition root). `PageFrame` template shared across app pages. 13/13 tests GREEN; `tsc` and `oxlint` clean. Tests locked in `.claude/tests.lock`.
- **Change:** scenario 15 (free slots that already started read "Pasado"); the hook became `useDayData` (loads schedule and appointments) and `AgendaPage` builds the slots on render with `momentInCancun(now())`. Test clock moved to 09:00 so the existing scenarios keep their meaning. 15/15 GREEN.
- **Decision:** 24-hour times stay (user, 2026-10-25).

### 2026-10-25 — scenarios 5–16 GREEN

- **Outcome:** week view, WhatsApp reminder, cancel, block/unblock, Mi horario, past-day rules and scenario 16 (appointments outside the hours stay visible). UI split by view into containers + presentational components (`ui/day`, `ui/week`, `ui/schedule`); generic `useQuery` hook (`useEffectEvent`); shared `Button`, `ConfirmPanel` (inline confirmation) and `PageFrame` action slot. Port now: `weeklySchedule`, `saveWeeklySchedule`, `appointmentsBetween`, `cancelAppointment`, `blockedDates`, `blockDay`, `unblockDay`. 31/31 GREEN; `tsc`, `oxlint`, `npm run build` clean.
- **Change:** the appointment card spans the full width with its time on the first line, next to the ticket; free slots are full-width "10:00 Libre" rows (user: the empty time column beside tall cards broke the harmony).
- **Pending:** user review of the screenshots; confirm `wa.me/52…` on a real phone; the week view cannot move to another week by itself (only through the day view).

### 2026-10-25 — done

- **Outcome:** Agenda closed by the user. Day view, week view, WhatsApp reminder, cancel, block/unblock and Mi horario, scenarios 1–16. 31/31 tests GREEN; `tsc`, `oxlint`, `npm run build` clean. Test lock removed.
- **Pending checks:**
  - Confirm `https://wa.me/52<10 digits>` opens the right chat on a real phone (the `521` question).
  - The week view has no previous/next week buttons; another week is reached only through the day view (user: change later if needed).
  - The in-memory adapter loses changes on reload; the real API (technology still undecided in the PDF) replaces it behind `AgendaRepository`.
  - Admin login still depends on the API.
- **Next step:** [Pedidos](pedidos.md): write its spec. Register an order from an appointment (it keeps the appointment's ticket) or a walk-in with a new ticket, final price and estimated delivery date, starting in Recibido; stepper Recibido → En proceso → Listo → Entregado with Cancelado as an exception (market study); "Pedido listo" by WhatsApp reusing `whatsapp-reminder.ts`'s pattern; find an order by ticket. Past appointments are already browsable in Agenda for registering yesterday's order.
