-- Retira las RPC que la app móvil llamaba directo en Supabase (odd/tasks/app-movil-backend.md, S4).
-- La app de clientas ahora pasa por la API de CALM (/api/client/*): cancelar una cita y avisar
-- que va en camino son DELETE /api/client/appointments/:ticket y
-- POST /api/client/orders/:ticket/on-my-way, con las mismas reglas en
-- backend/src/repositories/client-app.repository.ts.
--
-- Se quedan claim_nip_attempt, orphaned_auth_user_id y booking_calendar, que la API llama, y
-- private.current_client_id, que usan las políticas de lectura de orders, appointments y
-- appointment_services.
drop function if exists public.cancel_my_appointment(text);
drop function if exists public.mark_on_my_way(text);
