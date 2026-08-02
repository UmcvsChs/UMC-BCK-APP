drop policy "Admin manages states" on public.states;
create policy "Admin inserts states" on public.states for insert with check (public.get_user_role((select auth.uid())) = 'admin');
create policy "Admin updates states" on public.states for update using (public.get_user_role((select auth.uid())) = 'admin');
create policy "Admin deletes states" on public.states for delete using (public.get_user_role((select auth.uid())) = 'admin');

drop policy "Admin manages LGAs" on public.local_government_areas;
create policy "Admin inserts LGAs" on public.local_government_areas for insert with check (public.get_user_role((select auth.uid())) = 'admin');
create policy "Admin updates LGAs" on public.local_government_areas for update using (public.get_user_role((select auth.uid())) = 'admin');
create policy "Admin deletes LGAs" on public.local_government_areas for delete using (public.get_user_role((select auth.uid())) = 'admin');

drop policy "Admin manages neighborhood areas" on public.neighborhood_areas;
create policy "Admin inserts neighborhood areas" on public.neighborhood_areas for insert with check (public.get_user_role((select auth.uid())) = 'admin');
create policy "Admin updates neighborhood areas" on public.neighborhood_areas for update using (public.get_user_role((select auth.uid())) = 'admin');
create policy "Admin deletes neighborhood areas" on public.neighborhood_areas for delete using (public.get_user_role((select auth.uid())) = 'admin');

create index idx_coverage_areas_neighborhood_id on public.delivery_agent_coverage_areas(neighborhood_area_id);
