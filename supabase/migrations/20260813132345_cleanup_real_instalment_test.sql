delete from public.platform_revenue_ledger where reference_id = '2057fe4b-0604-4f42-8313-555f50d0f5ed';
delete from public.wallet_transactions where reference_id = '2057fe4b-0604-4f42-8313-555f50d0f5ed';
delete from public.order_payments where order_id = '2057fe4b-0604-4f42-8313-555f50d0f5ed';
delete from public.order_instalment_details where order_id = '2057fe4b-0604-4f42-8313-555f50d0f5ed';
delete from public.orders where id = '2057fe4b-0604-4f42-8313-555f50d0f5ed';
update public.wallets set balance = 0 where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd';