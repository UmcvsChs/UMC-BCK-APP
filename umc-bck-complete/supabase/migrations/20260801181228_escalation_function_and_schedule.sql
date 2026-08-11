create extension if not exists pg_cron with schema extensions;

-- escalate_overdue_assignments — flags anything still 'assigned' past its
-- 10-minute SLA. Deliberately does not try to auto-reassign to a different
-- rider itself; escalation exists specifically to bring a human into the
-- loop, matching the ops team's explicit "admin manually assigns" design.
create function public.escalate_overdue_assignments()
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_count integer;
begin
  update public.delivery_assignments
  set status = 'escalated', resolved_at = now()
  where status = 'assigned' and sla_deadline < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.escalate_overdue_assignments() from public, anon, authenticated;

-- Runs every minute — genuinely scheduled, not dependent on anyone
-- remembering to trigger it manually.
select cron.schedule(
  'escalate-overdue-delivery-assignments',
  '* * * * *',
  $$select public.escalate_overdue_assignments();$$
);
