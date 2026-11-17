---
status: done
---

# Mi horario y bloquear un día

## Goal

Bring the canvas's schedule and block-day screens into the code.

Design reference: canvas artboards:
- "Mi horario · escritorio" (`Horario.dc.html`) and "Mi horario · teléfono" (`HorarioMovil.dc.html`)
- "Bloquear un día · escritorio" (`BloquearDia.dc.html`) and "Bloquear un día · teléfono" (`BloquearDiaMovil.dc.html`)

## Decisions

- **Blocking is confirmed inline** (user, 2026-11-17: "En línea"), not with the canvas's alert or sheet.
  - Blocking can be undone with "Desbloquear día", and Apple reserves confirmation dialogs for destructive actions that cannot be undone.
  - `ConfirmPanel` already records that a modal covers the screen and loses the admin's place.
  - The confirmation takes the canvas's wording: "Tus clientes no podrán agendar ese día. Puedes desbloquearlo cuando quieras." It says the step can be reversed.
- **A switch for "Abierto".**
  - Each weekday gets a `button` with `role="switch"` and `aria-checked` (WAI-ARIA APG switch pattern, https://www.w3.org/WAI/ARIA/apg/patterns/switch/). A native checkbox cannot draw Apple's track and knob without pseudo-elements on an `<input>`, which browsers do not reliably render.
  - Its name stays "Abierto" inside the weekday's group. The word beside it ("Abierto" / "Cerrado") is hidden from screen readers, because `aria-checked` already says it.
- **"Abre" and "Cierra" stay as visible labels.** The canvas writes "de [10:00] a [18:00]" and names the selects only with `aria-label`. A visible label that differs from the name fails WCAG 2.5.3 Label in Name (https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html). "Abre" and "Cierra" are also clearer for the admin than "de" and "a".
- **Selects keep their outline border,** as decided in feature 6 for every field (WCAG 1.4.11).
- **The legend stays, visually hidden.** Each weekday keeps its `fieldset` and `legend`, which give the group its name. The visible day name is a separate `aria-hidden` span, because a rendered `legend` cannot sit in a flex row beside the switch.
- **Validation while editing.**
  - A day whose closing time is not after its opening time shows its alert as soon as it is changed, as in the canvas.
  - A save attempt with such days keeps the form and adds a summary beside the buttons that names the days, e.g. "No se guardó. Revisa el sábado." This replaces the canvas's "Revisa los días marcados en rojo", which points by color alone (WCAG 1.4.1, https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
  - The list of days is joined with `Intl.ListFormat` (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/ListFormat).
- **Saving still returns to the day view.** The admin sees her new hours there. The canvas's "Horario guardado" status was standing in for that screen.
- **"Días que no abres" lists the blocked days from today on,** each with "Desbloquear". Past blocked days no longer change anything. Each button's name carries its date, e.g. "Desbloquear el martes 27 de octubre", so a screen reader can tell the buttons apart. The name comes from `aria-label` and starts with the visible word (WCAG 2.5.3). Visually hidden text was dropped: the accessible-name computation in Testing Library trimmed its leading space ("Desbloquearel…"), and browsers differ on that whitespace too.
- **No "Bloquear un día" button in Mi horario.**
  - The canvas's button leaves for the agenda. Next to an unsaved form, it would drop the admin's changes without warning.
  - A line says where blocking lives instead: "Para bloquear un día, ábrelo en la agenda y toca «Bloquear este día»."
- **The blocked day reads as a card in the day view:** a lock, the heading "Día bloqueado" and "Tus clientes no pueden agendar el martes 27 de octubre.", as in the canvas. A past blocked day keeps only the heading.

## Spec

1. **Weekday switch.**
   - Each weekday group has a switch "Abierto", on when the day opens.
   - Turning it off hides that day's hours; turning it on shows them again with the hours it had.
2. **Validation while editing.**
   - Choosing a closing time that is not after the opening time shows "La hora de cierre debe ser después de la apertura." in that weekday's group, before saving.
   - Fixing the time removes it.
3. **Refused save.**
   - "Guardar horario" with an invalid day keeps the form open.
   - It shows "No se guardó. Revisa el sábado." (the days joined, e.g. "el lunes y el sábado").
4. **Blocked days.**
   - Mi horario has a list "Días que no abres" with the blocked days from today on, in date order, such as "Martes 27 de octubre".
   - "Desbloquear el martes 27 de octubre" removes that day from the list and opens it again.
5. **No blocked days.** The section says "No tienes días bloqueados."
6. **Block confirmation.** "Bloquear este día" asks "¿Bloquear el martes 27 de octubre?" with "Tus clientes no podrán agendar ese día. Puedes desbloquearlo cuando quieras."
7. **Blocked day.**
   - It shows the heading "Día bloqueado" and "Tus clientes no pueden agendar el martes 27 de octubre."
   - "Desbloquear día" opens it again.
8. **Layout (visual check).**
   - With 768px or more of agenda width, the weekly hours and "Días que no abres" sit side by side.
   - On the phone they stack, with each weekday in an inset grouped list.

## Log

### 2026-11-17 — done

**Outcome.** Mi horario and blocking a day follow the canvas, with the decisions above. All eight spec items hold.

**Checks.**
- RED: 10 failing tests across `my-schedule.test.tsx` and `block-day.test.tsx` before any implementation; tests locked.
- GREEN: 81/81 (14 files); lock removed.
- `oxlint src`: exit 0. `npm run build`: OK.
- Browser, 1280×900:
  - Blocking Thursday 19 November asks inline with the canvas wording; the day then shows the lock card "Día bloqueado" with its date and "Desbloquear día".
  - Mi horario puts the weekly hours and the 360px "Días que no abres" side by side.
  - Setting Saturday to close at 09:00 shows its alert at once; "Guardar horario" keeps the form and adds "No se guardó. Revisa el sábado."
- Browser, 390×844:
  - The two parts stack with no horizontal overflow (`scrollWidth − innerWidth = 0`).
  - Sunday's switch shows off. The switch track measures 51×31 at any width (on `#0f172a`, off `#767b85`).
  - "Desbloquear" removes the day and leaves "No tienes días bloqueados."

**Deviations from the canvas.**
- On the phone, the canvas shows a "Días que no abres · 2 ›" row that opens another screen. The card is stacked instead: leaving would drop unsaved hours (same reason as the missing "Bloquear un día" button), and it needs no new route.
- "Desbloquear" keeps a 48px target (canvas 44px), like the rest of the panel's controls.
- A long date wraps onto two lines in the blocked-days row at both widths. The canvas column (`flex: 1 1 300px`) is narrower still, so it wraps there too.

**Fixed during the visual check.** The blocked days were separate pills; they are now one inset grouped list with dividers (`divide-y divide-separator`, rows of at least 60px), as in the canvas.

**Pending.** None for this feature. The two earlier pending items (scroll position on "Volver a la agenda", the cascade layer for the icon CSS) stay in `agenda-apple.md`.

**Next.** Feature 9, [Pedidos: lista, detalle y hoja de nuevo pedido](pedidos-apple.md).
