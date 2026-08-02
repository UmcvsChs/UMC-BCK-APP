create type public.prescription_status as enum ('pending', 'approved', 'declined');

-- prescription_requests — deliberately NOT a products row, ever. This table
-- has no public/live visibility path at all — RLS only allows the submitting
-- buyer, the targeted pharma seller, and admin to see any given row.
create table public.prescription_requests (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.sellers(id),
  medication_name text not null,
  dosage text,
  requested_quantity integer not null default 5 check (requested_quantity > 0),
  prescription_image_url text not null,
  notes text,
  status public.prescription_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

comment on table public.prescription_requests is 'requested_quantity defaults to 5 and is only ever honoured as written when dosage is specified, matching the prototype policy exactly. This is the highest-compliance-risk table in the schema — never expose it through any public-facing query, only the three RLS-permitted parties.';

create index idx_prescription_requests_buyer_id on public.prescription_requests(buyer_id);
create index idx_prescription_requests_seller_id on public.prescription_requests(seller_id);

alter table public.prescription_requests enable row level security;

create policy "Buyer views own requests, targeted seller views theirs, or admin"
  on public.prescription_requests for select
  using (
    (select auth.uid()) = buyer_id
    or exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create function public.submit_prescription_request(
  p_seller_id uuid, p_medication_name text, p_prescription_image_url text,
  p_dosage text default null, p_requested_quantity integer default null, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_request_id uuid; v_qty integer;
begin
  if auth.uid() is null then raise exception 'Must be signed in to submit a prescription request'; end if;
  if p_prescription_image_url is null or p_prescription_image_url = '' then
    raise exception 'A prescription image is required — this cannot be submitted without one';
  end if;
  -- Quantity is only honoured as specified when a dosage is given; otherwise capped at 5.
  v_qty := case when p_dosage is not null and p_requested_quantity is not null then p_requested_quantity else least(coalesce(p_requested_quantity, 5), 5) end;

  insert into public.prescription_requests (buyer_id, seller_id, medication_name, dosage, requested_quantity, prescription_image_url, notes)
  values (auth.uid(), p_seller_id, p_medication_name, p_dosage, v_qty, p_prescription_image_url, p_notes)
  returning id into v_request_id;
  return v_request_id;
end;
$$;

-- review_prescription_request — pharmacist/admin only. This is the one place
-- in the whole platform where a human, not a database rule, makes the final
-- call — the schema's job is only to make sure that human is qualified to.
create function public.review_prescription_request(p_request_id uuid, p_decision public.prescription_status, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_status public.prescription_status;
begin
  if auth.uid() is null or public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Only an admin (acting as or on behalf of the reviewing pharmacist) can review a prescription request';
  end if;
  if p_decision not in ('approved','declined') then raise exception 'Decision must be approved or declined'; end if;
  select status into v_status from public.prescription_requests where id = p_request_id;
  if v_status is null then raise exception 'Prescription request not found'; end if;
  if v_status <> 'pending' then raise exception 'Request is already %', v_status; end if;

  update public.prescription_requests
  set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes
  where id = p_request_id;
end;
$$;

revoke execute on function public.submit_prescription_request(uuid, text, text, text, integer, text) from public, anon;
revoke execute on function public.review_prescription_request(uuid, public.prescription_status, text) from public, anon;
