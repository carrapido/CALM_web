-- Whether a client can sign in to the app, without handing anyone her NIP hash
-- (CALM_mobile odd/tasks/panel-y-ajustes.md, S2). PostgREST reads it as a computed field:
-- clients?select=id,name,phone,has_app_access. Security invoker, so it only ever answers for a row
-- the caller can already read.
create function public.has_app_access(client public.clients)
returns boolean
language sql
stable
set search_path = ''
as $$
  select client.nip_hash is not null and client.phone is not null;
$$;

revoke execute on function public.has_app_access(public.clients) from public, anon;
grant execute on function public.has_app_access(public.clients) to authenticated;
