---
status: pending
---

# Catálogo: lista y panel de edición

## Goal

Bring the canvas's catalog into the code: a service list beside an edit panel.

Design reference: canvas artboard "Catálogo · escritorio" (`Catalogo.dc.html`).

## Open questions

Ask one at a time when the feature starts:

1. **Estimated time.** The user removed it from every catalog view in the canvas. Should it also leave the `Service` domain, which the client app reads, or only be hidden in the panel?
   - **Answered (2026-11-17): it stays.** The user's database diagram (`CALM_BD.drawio`) keeps `services.estimated_days` with the note "lo usa el panel", and the applied schema has it (`supabase/migrations/20261117120718_initial_schema.sql`). The edit panel keeps its "Tiempo estimado" field, since nothing else sets it; list rows leave it out, as in the canvas.
2. **"Ocultar a los clientes" vs "Desactivar".** The canvas renames the action. Confirm the new wording keeps the current rule: delete only after hiding.

## Spec

To be written once the questions are answered.

## Log

### 2026-11-17 — paused

Paused for the Supabase connection (objectives 12–20). Question 1 is answered above; question 2 is still open.
