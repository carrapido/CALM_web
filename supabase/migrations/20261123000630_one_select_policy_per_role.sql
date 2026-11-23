-- One permissive SELECT policy per table and role (CALM_mobile odd/tasks/panel-y-ajustes.md, S5).
-- The admin's FOR ALL policies overlapped the client's SELECT policies, so Postgres evaluated both
-- on every read (advisor: multiple_permissive_policies). Each table now reads through one policy
-- that ORs the same conditions, and the admin's writes keep their own policies. Nobody reads or
-- writes anything they could not before; supabase/tests/access-check.sql checks it.

-- clients
drop policy "The admin manages clients" on public.clients;
drop policy "A client reads her own row" on public.clients;
create policy "The admin, and a client her own row, read clients" on public.clients
  for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy "The admin adds clients" on public.clients
  for insert to authenticated with check ((select private.is_admin()));
create policy "The admin changes clients" on public.clients
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "The admin removes clients" on public.clients
  for delete to authenticated using ((select private.is_admin()));

-- orders
drop policy "The admin manages orders" on public.orders;
drop policy "A client reads her own orders" on public.orders;
create policy "The admin, and a client her own, read orders" on public.orders
  for select to authenticated
  using ((select private.is_admin()) or client_id = (select private.current_client_id()));
create policy "The admin adds orders" on public.orders
  for insert to authenticated with check ((select private.is_admin()));
create policy "The admin changes orders" on public.orders
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "The admin removes orders" on public.orders
  for delete to authenticated using ((select private.is_admin()));

-- appointments
drop policy "The admin manages appointments" on public.appointments;
drop policy "A client reads her own appointments" on public.appointments;
create policy "The admin, and a client her own, read appointments" on public.appointments
  for select to authenticated
  using ((select private.is_admin()) or client_id = (select private.current_client_id()));
create policy "The admin adds appointments" on public.appointments
  for insert to authenticated with check ((select private.is_admin()));
create policy "The admin changes appointments" on public.appointments
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "The admin removes appointments" on public.appointments
  for delete to authenticated using ((select private.is_admin()));

-- appointment_services
drop policy "The admin manages appointment services" on public.appointment_services;
drop policy "A client reads the services of her own appointments" on public.appointment_services;
create policy "The admin, and a client her own, read appointment services" on public.appointment_services
  for select to authenticated
  using (
    (select private.is_admin())
    or appointment_id in (
      select id from public.appointments where client_id = (select private.current_client_id())
    )
  );
create policy "The admin adds appointment services" on public.appointment_services
  for insert to authenticated with check ((select private.is_admin()));
create policy "The admin changes appointment services" on public.appointment_services
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "The admin removes appointment services" on public.appointment_services
  for delete to authenticated using ((select private.is_admin()));

-- services: visitors read the active catalog; signed-in users read it too, a client also the
-- deactivated services she booked, and the admin everything.
drop policy "The admin manages services" on public.services;
drop policy "Anyone reads the active services" on public.services;
drop policy "A client reads the services she booked" on public.services;
create policy "Visitors read the active services" on public.services
  for select to anon using (is_active);
create policy "Signed-in users read the services they may see" on public.services
  for select to authenticated
  using (
    (select private.is_admin())
    or is_active
    or id in (select service_id from public.appointment_services)
  );
create policy "The admin adds services" on public.services
  for insert to authenticated with check ((select private.is_admin()));
create policy "The admin changes services" on public.services
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "The admin removes services" on public.services
  for delete to authenticated using ((select private.is_admin()));
