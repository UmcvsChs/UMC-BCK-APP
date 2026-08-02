create function public.submit_demand_request(p_hub text, p_description text, p_category text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in to submit a request'; end if;
  if p_description is null or length(trim(p_description)) = 0 then raise exception 'Description is required'; end if;
  insert into public.demand_requests (requester_id, hub, category, description)
  values (v_caller, p_hub, p_category, p_description)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.close_demand_request(p_id uuid, p_status public.demand_status default 'closed')
returns void
language plpgsql security definer set search_path = public
as $$
declare v_requester uuid; v_caller uuid := auth.uid();
begin
  select requester_id into v_requester from public.demand_requests where id = p_id;
  if v_requester is null then raise exception 'Request not found'; end if;
  if v_caller is null or (v_requester <> v_caller and public.get_user_role(v_caller) <> 'admin') then
    raise exception 'Only the requester or an admin can close this request';
  end if;
  update public.demand_requests set status = p_status where id = p_id;
end;
$$;

revoke execute on function public.submit_demand_request(text, text, text) from public, anon;
revoke execute on function public.close_demand_request(uuid, public.demand_status) from public, anon;
