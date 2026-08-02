-- Views created inside a migration inherit the migration-runner's elevated
-- privileges by default, which means this view was silently bypassing every
-- RLS policy on delivery_agents — anyone could read every agent's data
-- through it regardless of the access rules just built. security_invoker
-- makes the view respect the querying user's own RLS, exactly as intended.
alter view public.delivery_agents_with_rate set (security_invoker = true);
