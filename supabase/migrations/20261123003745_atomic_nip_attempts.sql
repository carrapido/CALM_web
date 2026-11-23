-- The per-phone throttle, made atomic (CALM_mobile odd/tasks/panel-y-ajustes.md; review
-- review-a5346d502e5ebea2, findings R1-001, R3-001, R4-throttle-lost-update).
--
-- Before, a function checked the lockout with one statement and counted a failure with a read and
-- a write: a burst of concurrent wrong NIPs all passed the check and overwrote each other's count,
-- so the 4-digit NIP could be enumerated. Now every NIP check claims its attempt first, in one
-- statement that locks the phone's row: concurrent claims are serialized and each sees its own
-- number. A phone gets at most five checks until a right NIP clears it; the fifth starts fifteen
-- minutes of lockout, after which the count starts again. sign_in_attempts.failures now counts
-- the checks claimed since the last right NIP.
create function public.claim_nip_attempt(p_phone text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  claimed integer;
begin
  insert into public.sign_in_attempts as attempt (phone, failures, locked_until)
  values (p_phone, 1, null)
  on conflict (phone) do update set
    failures = case
      when attempt.locked_until <= now() then 1
      else attempt.failures + 1
    end,
    locked_until = case
      when attempt.locked_until <= now() then null
      when attempt.locked_until is null and attempt.failures + 1 >= 5
        then now() + interval '15 minutes'
      else attempt.locked_until
    end
  returning failures into claimed;
  return claimed <= 5;
end;
$$;

-- Only the Edge Functions call it, with the service role.
revoke execute on function public.claim_nip_attempt(text) from public, anon, authenticated;
grant execute on function public.claim_nip_attempt(text) to service_role;
