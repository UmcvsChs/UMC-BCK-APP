insert into public.admin_department_assignments (user_id, department, assigned_by)
select id, 'super', id from auth.users where email = 'ruftims234@gmail.com'
on conflict (user_id) do update set department = 'super';