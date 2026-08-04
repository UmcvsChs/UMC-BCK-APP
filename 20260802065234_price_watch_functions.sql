create function public.add_price_watch(p_product_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in to watch a price'; end if;
  insert into public.price_watches (watcher_id, product_id)
  values (v_caller, p_product_id)
  on conflict (watcher_id, product_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.price_watches where watcher_id = v_caller and product_id = p_product_id;
  end if;
  return v_id;
end;
$$;

create function public.remove_price_watch(p_product_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  delete from public.price_watches where watcher_id = v_caller and product_id = p_product_id;
end;
$$;

revoke execute on function public.add_price_watch(uuid) from public, anon;
revoke execute on function public.remove_price_watch(uuid) from public, anon;
