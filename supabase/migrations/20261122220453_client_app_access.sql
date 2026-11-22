-- The client app signs in and reads her own data (CALM_mobile odd/tasks/acceso-cliente-supabase.md).
-- Until now every policy was private.is_admin(), so a client reached nothing.
-- Policies are OR'ed: this adds the client's own access without widening the admin's.

-- A client reads her own row. Her auth user is linked through clients.user_id, which the
-- client-sign-in Edge Function fills with the service role on her first sign-in.
create policy "A client reads her own row" on public.clients
  for select to authenticated
  using (user_id = (select auth.uid()));
