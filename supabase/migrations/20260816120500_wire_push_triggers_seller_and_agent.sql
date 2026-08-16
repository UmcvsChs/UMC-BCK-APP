CREATE OR REPLACE FUNCTION public.notify_seller_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare v_seller_user_id uuid; v_store_name text;
begin
  select s.user_id, s.store_name into v_seller_user_id, v_store_name
  from public.sellers s where s.id = NEW.seller_id;

  if v_seller_user_id is not null then
    perform net.http_post(
      url := 'https://ynuoaehkrdkjubzlipll.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', 'b88f46ff6ef42478b20e7b1687fbfc871297926c1ad966b9'),
      body := jsonb_build_object(
        'user_id', v_seller_user_id,
        'title', '🛒 New order — ₦' || NEW.total_amount,
        'body', 'A new order just came in for ' || coalesce(v_store_name, 'your store') || '. Tap to review.',
        'url', '/seller'
      )
    );
  end if;
  return NEW;
end;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_new_order ON public.orders;
CREATE TRIGGER trg_notify_seller_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_seller_new_order();

CREATE OR REPLACE FUNCTION public.notify_agent_new_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare v_agent_user_id uuid;
begin
  if NEW.status = 'assigned' then
    select da.user_id into v_agent_user_id
    from public.delivery_agents da where da.id = NEW.delivery_agent_id;

    if v_agent_user_id is not null then
      perform net.http_post(
        url := 'https://ynuoaehkrdkjubzlipll.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', 'b88f46ff6ef42478b20e7b1687fbfc871297926c1ad966b9'),
        body := jsonb_build_object(
          'user_id', v_agent_user_id,
          'title', '📦 New delivery job assigned',
          'body', 'A new pickup is waiting for you. Tap to see the details.',
          'url', '/delivery'
        )
      );
    end if;
  end if;
  return NEW;
end;
$$;

DROP TRIGGER IF EXISTS trg_notify_agent_new_assignment ON public.delivery_assignments;
CREATE TRIGGER trg_notify_agent_new_assignment
  AFTER INSERT ON public.delivery_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_agent_new_assignment();
