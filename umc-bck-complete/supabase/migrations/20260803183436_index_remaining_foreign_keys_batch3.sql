-- Four genuinely actionable foreign keys flagged by the performance
-- advisor — real, low-risk additions that prevent slow lookups/locks on
-- these columns as real data accumulates. The much longer "unused index"
-- list is expected and untouched: those are all real indexes correctly
-- placed for when real traffic exists, flagged as "unused" only because
-- zero real orders/sellers/products exist yet — removing them now would
-- be actively harmful once the platform goes live.
create index idx_attendant_invites_created_by on public.attendant_invites(created_by);
create index idx_attendant_invites_used_by on public.attendant_invites(used_by);
create index idx_data_access_clients_created_by on public.data_access_clients(created_by);
create index idx_incident_reports_reported_by on public.incident_reports(reported_by);