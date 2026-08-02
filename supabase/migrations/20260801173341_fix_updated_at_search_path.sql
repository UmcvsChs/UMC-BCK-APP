-- The linter correctly flagged that set_updated_at() had no pinned search_path,
-- which is a real (if minor) risk: a malicious search_path could shadow objects
-- the function references. Every function should pin this explicitly.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
