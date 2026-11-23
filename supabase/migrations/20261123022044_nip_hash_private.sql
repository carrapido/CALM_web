-- Keep the NIP hash out of every session (review review-46d77fb6d64f5695:
-- R1-own-row-exposes-nip-hash, R3-auth-user-provisioning-not-idempotent, R4-orphaned-auth-user).
--
-- A client's policy let her read her whole row through PostgREST, nip_hash included, so a stolen
-- session could crack her 4-digit NIP offline with no throttle in the way. Signed-in users now
-- read only the columns the apps use; the Edge Functions keep reading nip_hash as the service role.

-- has_app_access becomes a stored generated column: a function taking the whole row would need
-- the privilege on every column, nip_hash included. PostgREST reads it by the same name.
drop function public.has_app_access(public.clients);
alter table public.clients
  add column has_app_access boolean generated always as (nip_hash is not null and phone is not null) stored;

revoke select on public.clients from anon, authenticated;
grant select (id, name, phone, user_id, has_app_access) on public.clients to authenticated;

-- The auth user named after a client's phone, for the Edge Functions to link again when an earlier
-- request created it and then failed before storing it in clients.user_id. Without it, every later
-- sign-in tried to create the same user, was refused, and the client could never get a session.
create function public.auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where email = lower(p_email);
$$;

revoke execute on function public.auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_email(text) to service_role;
