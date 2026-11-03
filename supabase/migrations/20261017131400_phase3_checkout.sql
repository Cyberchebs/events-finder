-- Phase 3 checkout primitives. The SQL mirrors the application limits so
-- authenticated clients cannot bypass them by invoking an RPC directly.

alter table public.reservations
  add column if not exists idempotency_key uuid,
  add column if not exists total_kobo integer,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists paystack_authorization_url text;

alter table public.reservations
  add constraint reservations_payment_status_check
  check (payment_status in ('pending', 'failed', 'success'));

update public.reservations r
set total_kobo = tt.price_kobo * r.quantity
from public.ticket_types tt
where r.ticket_type_id = tt.id
  and r.total_kobo is null;

alter table public.reservations
  alter column total_kobo set not null;

create unique index if not exists reservations_user_idempotency_key
  on public.reservations (user_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists orders_paystack_reference_key
  on public.orders (paystack_reference);

create policy "ticket_types_select_ticket_holders"
on public.ticket_types for select
using (
  exists (
    select 1
    from public.tickets t
    where t.ticket_type_id = ticket_types.id
      and t.owner_id = auth.uid()
  )
);

drop policy if exists "reservations_insert_own" on public.reservations;
drop policy if exists "reservations_update_own" on public.reservations;

revoke insert, update, delete on table public.reservations, public.orders, public.tickets
  from anon, authenticated;
revoke all on table public.processed_webhook_events from anon, authenticated;
grant select on table public.reservations, public.orders, public.tickets to authenticated;

revoke insert, update, delete on table public.ticket_types from anon, authenticated;
grant select on table public.ticket_types to anon, authenticated;
grant insert (event_id, name, price_kobo, quantity_available, card_color, card_image_url)
  on table public.ticket_types to authenticated;
grant update (name, price_kobo, quantity_available, card_color, card_image_url, updated_at)
  on table public.ticket_types to authenticated;
grant delete on table public.ticket_types to authenticated;

create or replace function public.get_ticket_event_details(p_event_ids uuid[])
returns table (
  id uuid,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  format public.event_format,
  city text,
  venue_address text
)
language sql
security definer
set search_path = ''
as $$
  select e.id, e.title, e.starts_at, e.ends_at, e.format, e.city, e.venue_address
  from public.events e
  where auth.uid() is not null
    and e.id = any(p_event_ids)
    and exists (
      select 1
      from public.orders o
      where o.event_id = e.id
        and o.user_id = auth.uid()
        and o.status = 'paid'
    )
$$;

create or replace function public.get_event_paystack_subaccount(p_event_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select p.paystack_subaccount_code
  from public.events e
  join public.profiles p on p.id = e.organizer_id
  where auth.uid() is not null
    and e.id = p_event_id
    and e.status = 'published'
    and e.ends_at > pg_catalog.now()
$$;

create or replace function public.reserve_ticket_inventory(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing record;
  v_event_id uuid;
  v_organizer_id uuid;
  v_unit_price_kobo integer;
  v_total_kobo bigint;
  v_reservation_id uuid;
  v_expires_at timestamptz;
  v_subaccount_code text;
begin
  if v_user_id is null or p_ticket_type_id is null or p_idempotency_key is null
     or p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_request');
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_idempotency_key::text, 0)
  );

  select r.id, r.ticket_type_id, r.quantity, r.total_kobo, r.expires_at,
         r.status, r.paystack_authorization_url, tt.event_id,
         e.organizer_id, p.paystack_subaccount_code
  into v_existing
  from public.reservations r
  join public.ticket_types tt on tt.id = r.ticket_type_id
  join public.events e on e.id = tt.event_id
  join public.profiles p on p.id = e.organizer_id
  where r.user_id = v_user_id
    and r.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.ticket_type_id <> p_ticket_type_id
       or v_existing.quantity <> p_quantity then
      return jsonb_build_object('ok', false, 'reason', 'idempotency_conflict');
    end if;
    if v_existing.status = 'pending' and v_existing.expires_at > pg_catalog.now() then
      return jsonb_build_object(
        'ok', true,
        'reservation_id', v_existing.id,
        'total_kobo', v_existing.total_kobo,
        'expires_at', v_existing.expires_at,
        'event_id', v_existing.event_id,
        'organizer_id', v_existing.organizer_id,
        'subaccount_code', v_existing.paystack_subaccount_code,
        'authorization_url', v_existing.paystack_authorization_url,
        'reused', true
      );
    end if;
    return jsonb_build_object('ok', false, 'reason', 'checkout_already_started');
  end if;

  update public.ticket_types tt
  set quantity_sold = tt.quantity_sold + p_quantity
  from public.events e
  where tt.id = p_ticket_type_id
    and e.id = tt.event_id
    and e.status = 'published'
    and e.ends_at > pg_catalog.now()
    and tt.price_kobo > 0
    and tt.quantity_sold < tt.quantity_available
    and p_quantity <= tt.quantity_available - tt.quantity_sold
  returning tt.event_id, e.organizer_id, tt.price_kobo
  into v_event_id, v_organizer_id, v_unit_price_kobo;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'sold_out_or_unavailable');
  end if;

  v_total_kobo := v_unit_price_kobo::bigint * p_quantity;
  if v_total_kobo > 2147483647 then
    update public.ticket_types
    set quantity_sold = quantity_sold - p_quantity
    where id = p_ticket_type_id;
    return jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  end if;

  v_expires_at := pg_catalog.now() + interval '10 minutes';
  insert into public.reservations (
    ticket_type_id,
    quantity,
    user_id,
    expires_at,
    status,
    idempotency_key,
    total_kobo
  )
  values (
    p_ticket_type_id,
    p_quantity,
    v_user_id,
    v_expires_at,
    'pending',
    p_idempotency_key,
    v_total_kobo::integer
  )
  returning id into v_reservation_id;

  select p.paystack_subaccount_code
  into v_subaccount_code
  from public.profiles p
  where p.id = v_organizer_id;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_reservation_id,
    'total_kobo', v_total_kobo,
    'expires_at', v_expires_at,
    'event_id', v_event_id,
    'organizer_id', v_organizer_id,
    'subaccount_code', v_subaccount_code,
    'authorization_url', null,
    'reused', false
  );
end;
$$;

create or replace function public.save_reservation_authorization_url(
  p_reservation_id uuid,
  p_authorization_url text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or p_reservation_id is null
     or p_authorization_url is null
     or p_authorization_url !~ '^https://checkout\.paystack\.com/' then
    return false;
  end if;

  update public.reservations
  set paystack_authorization_url = p_authorization_url
  where id = p_reservation_id
    and user_id = auth.uid()
    and status = 'pending'
    and payment_status = 'pending'
    and (
      paystack_authorization_url is null
      or paystack_authorization_url = p_authorization_url
    );

  return found;
end;
$$;

create or replace function public.mark_payment_failed(
  p_event_id text,
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_id is null or pg_catalog.length(p_event_id) = 0 then
    raise exception 'Invalid Paystack event id';
  end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_event_id, 1));
  insert into public.processed_webhook_events (event_id)
  values (p_event_id)
  on conflict (event_id) do nothing;

  if not found then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  if p_reservation_id is null then
    return jsonb_build_object('ok', true, 'ignored', true);
  end if;

  update public.reservations
  set payment_status = 'failed'
  where id = p_reservation_id
    and status = 'pending';

  return jsonb_build_object('ok', true, 'duplicate', false);
end;
$$;

create or replace function public.issue_free_ticket_order(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_idempotency_key uuid,
  p_user_id uuid,
  p_ticket_payloads jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_existing record;
  v_event_id uuid;
  v_reservation_id uuid;
  v_order_id uuid;
  v_ticket_count integer;
  v_distinct_ticket_count integer;
begin
  if auth.role() is distinct from 'service_role'
     or v_user_id is null or p_ticket_type_id is null or p_idempotency_key is null
     or p_quantity is null or p_quantity < 1 or p_quantity > 10
     or p_ticket_payloads is null
     or pg_catalog.jsonb_typeof(p_ticket_payloads) is distinct from 'array' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_request');
  end if;

  if pg_catalog.jsonb_array_length(p_ticket_payloads) <> p_quantity then
    return jsonb_build_object('ok', false, 'reason', 'invalid_ticket_payloads');
  end if;

  select pg_catalog.count(*), pg_catalog.count(distinct t.id)
  into v_ticket_count, v_distinct_ticket_count
  from pg_catalog.jsonb_to_recordset(p_ticket_payloads) as t(id uuid, qr_token text)
  where t.id is not null and pg_catalog.length(t.qr_token) > 0;

  if v_ticket_count <> p_quantity or v_distinct_ticket_count <> p_quantity then
    return jsonb_build_object('ok', false, 'reason', 'invalid_ticket_payloads');
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_idempotency_key::text, 0)
  );

  select r.id, r.status, r.ticket_type_id, r.quantity
  into v_existing
  from public.reservations r
  where r.user_id = v_user_id
    and r.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.ticket_type_id <> p_ticket_type_id
       or v_existing.quantity <> p_quantity then
      return jsonb_build_object('ok', false, 'reason', 'idempotency_conflict');
    end if;
    if v_existing.status = 'confirmed' then
      select o.id into v_order_id
      from public.orders o
      where o.paystack_reference = v_existing.id::text
        and o.user_id = v_user_id;
      if v_order_id is not null then
        return jsonb_build_object(
          'ok', true,
          'reservation_id', v_existing.id,
          'order_id', v_order_id,
          'reused', true
        );
      end if;
    end if;
    return jsonb_build_object('ok', false, 'reason', 'checkout_already_started');
  end if;

  update public.ticket_types tt
  set quantity_sold = tt.quantity_sold + p_quantity
  from public.events e
  where tt.id = p_ticket_type_id
    and tt.price_kobo = 0
    and e.id = tt.event_id
    and e.status = 'published'
    and e.ends_at > pg_catalog.now()
    and tt.quantity_sold < tt.quantity_available
    and p_quantity <= tt.quantity_available - tt.quantity_sold
  returning tt.event_id into v_event_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'sold_out_or_unavailable');
  end if;

  insert into public.reservations (
    ticket_type_id,
    quantity,
    user_id,
    expires_at,
    status,
    idempotency_key,
    total_kobo,
    payment_status
  )
  values (
    p_ticket_type_id,
    p_quantity,
    v_user_id,
    pg_catalog.now(),
    'confirmed',
    p_idempotency_key,
    0,
    'success'
  )
  returning id into v_reservation_id;

  insert into public.orders (
    user_id,
    event_id,
    total_kobo,
    commission_kobo,
    paystack_reference,
    status
  )
  values (
    v_user_id,
    v_event_id,
    0,
    0,
    v_reservation_id::text,
    'paid'
  )
  returning id into v_order_id;

  insert into public.tickets (id, order_id, ticket_type_id, owner_id, qr_token)
  select t.id, v_order_id, p_ticket_type_id, v_user_id, t.qr_token
  from pg_catalog.jsonb_to_recordset(p_ticket_payloads) as t(id uuid, qr_token text);

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_reservation_id,
    'order_id', v_order_id,
    'reused', false
  );
end;
$$;

create or replace function public.release_expired_reservation(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket_type_id uuid;
  v_quantity integer;
begin
  update public.reservations
  set status = 'expired',
      payment_status = 'failed'
  where id = p_reservation_id
    and status = 'pending'
    and expires_at <= pg_catalog.now()
  returning ticket_type_id, quantity into v_ticket_type_id, v_quantity;

  if not found then
    return false;
  end if;

  update public.ticket_types
  set quantity_sold = quantity_sold - v_quantity
  where id = v_ticket_type_id
    and quantity_sold >= v_quantity;

  if not found then
    raise exception 'Reservation inventory invariant violated';
  end if;

  return true;
end;
$$;

create or replace function public.process_paid_reservation(
  p_event_id text,
  p_reservation_id uuid,
  p_amount_kobo integer,
  p_commission_kobo integer,
  p_ticket_payloads jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation record;
  v_order_id uuid;
  v_ticket_count integer;
  v_distinct_ticket_count integer;
begin
  if p_event_id is null or pg_catalog.length(p_event_id) = 0
     or p_reservation_id is null or p_amount_kobo is null or p_amount_kobo < 1
     or p_commission_kobo is null or p_commission_kobo < 0
     or p_commission_kobo > p_amount_kobo
     or p_ticket_payloads is null
     or pg_catalog.jsonb_typeof(p_ticket_payloads) is distinct from 'array' then
    raise exception 'Invalid paid reservation payload';
  end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_event_id, 1));
  if exists (
    select 1 from public.processed_webhook_events p
    where p.event_id = p_event_id
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  select r.id, r.ticket_type_id, r.quantity, r.user_id, r.total_kobo,
         tt.event_id, e.organizer_id
  into v_reservation
  from public.reservations r
  join public.ticket_types tt on tt.id = r.ticket_type_id
  join public.events e on e.id = tt.event_id
  where r.id = p_reservation_id
    and r.status = 'pending'
  for update of r;

  if not found then
    if exists (
      select 1 from public.orders o
      where o.paystack_reference = p_reservation_id::text
        and o.status = 'paid'
    ) then
      return jsonb_build_object('ok', true, 'duplicate', true);
    end if;
    raise exception 'Paid reservation is not pending';
  end if;

  if v_reservation.total_kobo <> p_amount_kobo then
    raise exception 'Paid amount does not match reservation';
  end if;

  if pg_catalog.jsonb_array_length(p_ticket_payloads) <> v_reservation.quantity then
    raise exception 'Ticket payload count does not match reservation';
  end if;

  select pg_catalog.count(*), pg_catalog.count(distinct t.id)
  into v_ticket_count, v_distinct_ticket_count
  from pg_catalog.jsonb_to_recordset(p_ticket_payloads) as t(id uuid, qr_token text)
  where t.id is not null and pg_catalog.length(t.qr_token) > 0;

  if v_ticket_count <> v_reservation.quantity
     or v_distinct_ticket_count <> v_reservation.quantity then
    raise exception 'Invalid ticket payloads';
  end if;

  insert into public.orders (
    user_id,
    event_id,
    total_kobo,
    commission_kobo,
    paystack_reference,
    status
  )
  values (
    v_reservation.user_id,
    v_reservation.event_id,
    v_reservation.total_kobo,
    p_commission_kobo,
    p_reservation_id::text,
    'paid'
  )
  returning id into v_order_id;

  update public.reservations
  set status = 'confirmed',
      payment_status = 'success'
  where id = p_reservation_id
    and status = 'pending';

  insert into public.tickets (id, order_id, ticket_type_id, owner_id, qr_token)
  select t.id, v_order_id, v_reservation.ticket_type_id, v_reservation.user_id, t.qr_token
  from pg_catalog.jsonb_to_recordset(p_ticket_payloads) as t(id uuid, qr_token text);

  insert into public.processed_webhook_events (event_id)
  values (p_event_id);

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'order_id', v_order_id,
    'reservation_id', p_reservation_id,
    'event_id', v_reservation.event_id,
    'organizer_id', v_reservation.organizer_id,
    'ticket_type_id', v_reservation.ticket_type_id,
    'user_id', v_reservation.user_id,
    'quantity', v_reservation.quantity,
    'total_kobo', v_reservation.total_kobo,
    'commission_kobo', p_commission_kobo
  );
end;
$$;

revoke all on function public.reserve_ticket_inventory(uuid, integer, uuid) from public, anon;
revoke all on function public.get_ticket_event_details(uuid[]) from public, anon;
revoke all on function public.get_event_paystack_subaccount(uuid)
  from public, anon;
revoke all on function public.save_reservation_authorization_url(uuid, text)
  from public, anon;
revoke all on function public.issue_free_ticket_order(uuid, integer, uuid, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.release_expired_reservation(uuid) from public, anon, authenticated;
revoke all on function public.mark_payment_failed(text, uuid)
  from public, anon, authenticated;
revoke all on function public.process_paid_reservation(text, uuid, integer, integer, jsonb)
  from public, anon, authenticated;

grant execute on function public.reserve_ticket_inventory(uuid, integer, uuid) to authenticated;
grant execute on function public.get_ticket_event_details(uuid[]) to authenticated;
grant execute on function public.get_event_paystack_subaccount(uuid) to authenticated;
grant execute on function public.save_reservation_authorization_url(uuid, text) to authenticated;
grant execute on function public.issue_free_ticket_order(uuid, integer, uuid, uuid, jsonb)
  to service_role;
grant execute on function public.release_expired_reservation(uuid) to service_role;
grant execute on function public.mark_payment_failed(text, uuid) to service_role;
grant execute on function public.process_paid_reservation(text, uuid, integer, integer, jsonb)
  to service_role;
