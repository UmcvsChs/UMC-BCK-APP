create type public.dispute_status as enum ('open', 'investigating', 'resolved_buyer', 'resolved_seller', 'resolved_split', 'dismissed');

create table public.disputes (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id),
  raised_by uuid not null references public.profiles(id),
  reason text not null,
  description text not null,
  status public.dispute_status not null default 'open',
  resolution_notes text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_disputes_order_id on public.disputes(order_id);
create index idx_disputes_raised_by on public.disputes(raised_by);
create index idx_disputes_status on public.disputes(status);

alter table public.disputes enable row level security;

create policy "View own dispute, dispute on own order as seller, or admin views any"
  on public.disputes for select
  using (
    (select auth.uid()) = raised_by
    or exists (select 1 from public.orders o where o.id = order_id and (
         o.buyer_id = (select auth.uid())
         or exists (select 1 from public.sellers s where s.id = o.seller_id and s.user_id = (select auth.uid()))
       ))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- raise_dispute — either party to the order can raise one.
create function public.raise_dispute(p_order_id uuid, p_reason text, p_description text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_caller uuid := auth.uid(); v_order record;
begin
  if v_caller is null then raise exception 'Must be signed in to raise a dispute'; end if;
  select o.buyer_id, s.user_id as seller_owner into v_order
  from public.orders o join public.sellers s on s.id = o.seller_id where o.id = p_order_id;
  if v_order.buyer_id is null then raise exception 'Order not found'; end if;
  if v_caller <> v_order.buyer_id and v_caller <> v_order.seller_owner then
    raise exception 'Only the buyer or seller on this order can raise a dispute';
  end if;

  insert into public.disputes (order_id, raised_by, reason, description)
  values (p_order_id, v_caller, p_reason, p_description)
  returning id into v_id;
  return v_id;
end;
$$;

-- resolve_dispute — admin-only, and logged to the admin actions log.
create function public.resolve_dispute(p_dispute_id uuid, p_status public.dispute_status, p_resolution_notes text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_admin uuid := auth.uid();
begin
  if v_admin is null or public.get_user_role(v_admin) <> 'admin' then
    raise exception 'Only an admin can resolve a dispute';
  end if;
  if p_status not in ('resolved_buyer','resolved_seller','resolved_split','dismissed') then
    raise exception 'Invalid resolution status %', p_status;
  end if;

  update public.disputes
  set status = p_status, resolution_notes = p_resolution_notes, resolved_by = v_admin, resolved_at = now()
  where id = p_dispute_id;

  insert into public.admin_actions_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'resolve_dispute', 'dispute', p_dispute_id, p_resolution_notes);
end;
$$;

revoke execute on function public.raise_dispute(uuid, text, text) from public, anon;
revoke execute on function public.resolve_dispute(uuid, public.dispute_status, text) from public, anon;
