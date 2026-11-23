-- Key the orphan's ownership on app_metadata (review review-089538cb33d4af30, R1-001).
-- user_metadata is writable by the user through Auth updateUser, so a former phone holder with a
-- live session could write the new client's id there and pass the check. app_metadata is
-- writable only by the service role, which is where client-auth.ts now records the client.
create or replace function public.orphaned_auth_user_id(p_email text, p_client_id bigint)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
    from auth.users u
   where u.email = lower(p_email)
     and u.raw_app_meta_data ->> 'client_id' = p_client_id::text
     and not exists (select 1 from public.clients c where c.user_id = u.id);
$$;
