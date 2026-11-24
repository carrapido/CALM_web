---
status: in-progress
---

# Panel se queda en "Cargando…"

With the backend and the frontend running, every panel screen stays on its "Cargando…" message. Make failures visible, show the requests the API receives, and remove the likely cause.

## Specs

- **S1** User report: "Los servicios se quedan cargando, no se renderizan, solo muestran el mensaje de cargando[lo que esta cargando]."
- **S2** User evidence: the backend terminal shows only "API de CALM en http://localhost:3000" and "No aparece ninguna petición localhost:300/api/".
- **S3** A failed load never leaves a screen loading forever: it shows what failed and offers "Reintentar".
- **S4** The backend terminal shows every request it receives (method, path, status, time) so the team can follow the flow.
- **S5** CORS accepts the panel whether it is opened at http://localhost:5173 or http://127.0.0.1:5173 (CORS_ORIGIN may list several origins separated by commas).

## Tasks

- [x] T1 (S3) `useQuery` exposes the error; every container shows it with "Reintentar". Route: worker. Commit: —
- [x] T2 (S4, S5) Request log and CORS origin list in the backend. Route: worker. Commit: —
- [ ] T3 (S1, S2) Reproduce with the user and confirm the cause. Route: inline. Commit: —

## Log

- **L1** User: "Los servicios se quedan cargando, no se renderizan, solo muestran el mensaje de cargando[lo que esta cargando]. Creo que se debe por la comunicación con el la bd, el campo DATABASE_SSL_CA deberia de contener algun valor?"
- **L2** Checked: DATABASE_SSL_CA may stay empty; backend reaches the DB (0.4 s, 1 admin), /api/health 200 in 10 ms, CORS preflight from http://localhost:5173 allowed, frontend VITE_API_URL is http://localhost:3000/api, backend Supabase keys valid and same project as the frontend. Defect found: src/hooks/useQuery.ts ignores rejections, so any failed request leaves the screen loading forever.
- **L3** User: backend terminal shows only the startup line; "No aparece ninguna petición localhost:300/api/". The backend logs only 5xx, so 4xx answers and CORS rejections are silent; a page opened at 127.0.0.1:5173 would be rejected by CORS_ORIGIN=http://localhost:5173.
