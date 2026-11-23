-- Relink only an auth user that is the client's own (review review-301d04ab4a4f3ce7, R1-001).
-- auth_user_id_by_email returned any auth user holding the phone alias, so a client enrolled with
-- the phone of a deleted client could be linked to that client's auth user, and a session still
-- held for it would read the new client's rows. Now an auth user is reused only when it was
-- created for this very client (its user_metadata.client_id) and no clients row links it.
drop function public.auth_user_id_by_email(text);

create function public.orphaned_auth_user_id(p_email text, p_client_id bigint)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
    from auth.users u
   where u.email = lower(p_email)
     and u.raw_user_meta_data ->> 'client_id' = p_client_id::text
     and not exists (select 1 from public.clients c where c.user_id = u.id);
$$;

revoke execute on function public.orphaned_auth_user_id(text, bigint) from public, anon, authenticated;
grant execute on function public.orphaned_auth_user_id(text, bigint) to service_role;
