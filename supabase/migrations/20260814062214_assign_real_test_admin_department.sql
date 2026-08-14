insert into public.admin_department_assignments (user_id, department, assigned_by)
select id, 'logistics', (select id from auth.users where email = 'ruftims234@gmail.com')
from auth.users where email = 'amina.attendant@umcbck.ng'
on conflict (user_id) do update set department = 'logistics';