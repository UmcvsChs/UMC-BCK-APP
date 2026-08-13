delete from public.wholesale_group_buy_participants where group_buy_id = '72825e30-9971-4807-9b3a-18d919903098';
delete from public.wholesale_group_buys where id = '72825e30-9971-4807-9b3a-18d919903098';
update public.sellers set wholesale_min_quantity = null where id = 'ac9ebb70-90f6-4306-a8b9-ce2ea69bf790';