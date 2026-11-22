-- What a signed-in client can change from the app (CALM_mobile odd/tasks/acciones-cliente.md, T2).
-- Functions rather than UPDATE/DELETE policies: a policy cannot say "only from ready to onTheWay"
-- or "only more than 24 hours ahead", and these rules belong to the server, not the app.
-- Each raises when nothing matched, so the app never mistakes a refusal for a success.

-- Cancels her own appointment that has no order yet, more than 24 hours ahead on Cancún's wall
-- clock. It is deleted, as the panel cancels, so the slot is free again; its services go with it.
create function public.cancel_my_appointment(p_ticket text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.appointments a
   where a.ticket = p_ticket
     and a.client_id = (select private.current_client_id())
     and not exists (select 1 from public.orders o where o.appointment_id = a.id)
     and (a.scheduled_date + a.scheduled_time) - (now() at time zone 'America/Cancun')
         > interval '24 hours';
  if not found then
    raise exception 'appointment_not_cancellable' using errcode = 'P0001';
  end if;
end;
$$;

-- Tells the workshop she is on her way to pick up her own order that is ready.
create function public.mark_on_my_way(p_ticket text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
     set status = 'onTheWay'
   where ticket = p_ticket
     and client_id = (select private.current_client_id())
     and status = 'ready';
  if not found then
    raise exception 'order_not_ready' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.cancel_my_appointment(text) from public, anon;
revoke execute on function public.mark_on_my_way(text) from public, anon;
grant execute on function public.cancel_my_appointment(text) to authenticated;
grant execute on function public.mark_on_my_way(text) to authenticated;
