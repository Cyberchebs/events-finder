alter table public.processed_webhook_events enable row level security;

drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "orders_update_own" on public.orders;
drop policy if exists "tickets_insert_own" on public.tickets;
drop policy if exists "tickets_update_own" on public.tickets;