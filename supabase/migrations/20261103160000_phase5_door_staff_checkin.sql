create index if not exists idx_tickets_ticket_type_status
on public.tickets (ticket_type_id, status);

create or replace function public.validate_door_staff_access(
  p_event_id uuid,
  p_token_hash text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'valid', true,
    'gate_id', access.id,
    'gate_label', access.gate_label,
    'event_title', event.title
  )
  from public.door_staff_access as access
  join public.events as event on event.id = access.event_id
  where access.event_id = p_event_id
    and access.access_token_hash = p_token_hash
    and access.revoked_at is null
  limit 1;
$$;

create or replace function public.get_door_staff_scan_context(
  p_event_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gate_id uuid;
  v_gate_label text;
  v_event_title text;
  v_total bigint;
  v_checked_in bigint;
begin
  select access.id, access.gate_label, event.title
  into v_gate_id, v_gate_label, v_event_title
  from public.door_staff_access as access
  join public.events as event on event.id = access.event_id
  where access.event_id = p_event_id
    and access.access_token_hash = p_token_hash
    and access.revoked_at is null;

  if v_gate_id is null then
    return jsonb_build_object('valid', false);
  end if;

  select
    count(*),
    count(*) filter (where ticket.status = 'used')
  into v_total, v_checked_in
  from public.tickets as ticket
  join public.ticket_types as tier on tier.id = ticket.ticket_type_id
  join public.orders as ticket_order on ticket_order.id = ticket.order_id
  where tier.event_id = p_event_id
    and ticket_order.status = 'paid'
    and ticket.status in ('issued', 'used');

  return jsonb_build_object(
    'valid', true,
    'gate_id', v_gate_id,
    'gate_label', v_gate_label,
    'event_title', v_event_title,
    'total_tickets', coalesce(v_total, 0),
    'checked_in', coalesce(v_checked_in, 0)
  );
end;
$$;

create or replace function public.scan_door_staff_ticket(
  p_event_id uuid,
  p_token_hash text,
  p_ticket_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gate_label text;
  v_ticket record;
  v_scanned_at timestamptz;
begin
  select access.gate_label
  into v_gate_label
  from public.door_staff_access as access
  where access.event_id = p_event_id
    and access.access_token_hash = p_token_hash
    and access.revoked_at is null;

  if v_gate_label is null then
    return jsonb_build_object('result', 'invalid_gate');
  end if;

  select ticket.status, ticket.scanned_at, ticket.scanned_gate_label, tier.name as tier_name
  into v_ticket
  from public.tickets as ticket
  join public.ticket_types as tier on tier.id = ticket.ticket_type_id
  join public.orders as ticket_order on ticket_order.id = ticket.order_id
  where ticket.id = p_ticket_id
    and tier.event_id = p_event_id
    and ticket_order.status = 'paid'
    and ticket.status in ('issued', 'used');

  if not found then
    return jsonb_build_object('result', 'invalid');
  end if;

  if v_ticket.status = 'used' then
    return jsonb_build_object(
      'result', 'already_used',
      'tier_name', v_ticket.tier_name,
      'scanned_at', v_ticket.scanned_at,
      'scanned_gate_label', v_ticket.scanned_gate_label
    );
  end if;

  update public.tickets as ticket
  set status = 'used',
      scanned_at = now(),
      scanned_gate_label = v_gate_label
  where ticket.id = p_ticket_id
    and ticket.status = 'issued'
  returning ticket.scanned_at into v_scanned_at;

  if not found then
    select ticket.status, ticket.scanned_at, ticket.scanned_gate_label, tier.name as tier_name
    into v_ticket
    from public.tickets as ticket
    join public.ticket_types as tier on tier.id = ticket.ticket_type_id
    where ticket.id = p_ticket_id;

    if v_ticket.status is distinct from 'used' then
      return jsonb_build_object('result', 'invalid');
    end if;

    return jsonb_build_object(
      'result', 'already_used',
      'tier_name', v_ticket.tier_name,
      'scanned_at', v_ticket.scanned_at,
      'scanned_gate_label', v_ticket.scanned_gate_label
    );
  end if;

  return jsonb_build_object(
    'result', 'success',
    'tier_name', v_ticket.tier_name,
    'scanned_at', v_scanned_at,
    'scanned_gate_label', v_gate_label
  );
end;
$$;

revoke all on function public.get_door_staff_scan_context(uuid, text) from public, authenticated;
revoke all on function public.validate_door_staff_access(uuid, text) from public, authenticated;
revoke all on function public.scan_door_staff_ticket(uuid, text, uuid) from public, authenticated;
grant execute on function public.get_door_staff_scan_context(uuid, text) to anon, authenticated;
grant execute on function public.validate_door_staff_access(uuid, text) to anon, authenticated;
grant execute on function public.scan_door_staff_ticket(uuid, text, uuid) to anon, authenticated;

create or replace function public.get_organizer_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_organizer
  ) then
    return jsonb_build_object('authorized', false);
  end if;

  with event_metrics as (
    select
      event.id,
      event.title,
      event.status,
      event.starts_at,
      event.ends_at,
      coalesce(tickets.sold, 0)::bigint as tickets_sold,
      coalesce(tiers.capacity, 0)::bigint as capacity,
      coalesce(orders.net_earnings, 0)::bigint as net_earnings
    from public.events as event
    left join lateral (
      select sum(tier.quantity_available)::bigint as capacity
      from public.ticket_types as tier
      where tier.event_id = event.id
    ) as tiers on true
    left join lateral (
      select count(*)::bigint as sold
      from public.tickets as ticket
      join public.ticket_types as tier on tier.id = ticket.ticket_type_id
      join public.orders as ticket_order on ticket_order.id = ticket.order_id
      where tier.event_id = event.id
        and ticket.status in ('issued', 'used')
        and ticket_order.status = 'paid'
    ) as tickets on true
    left join lateral (
      select sum(ticket_order.total_kobo - ticket_order.commission_kobo)::bigint as net_earnings
      from public.orders as ticket_order
      where ticket_order.event_id = event.id
        and ticket_order.status = 'paid'
    ) as orders on true
    where event.organizer_id = auth.uid()
  )
  select jsonb_build_object(
    'authorized', true,
    'tickets_sold', coalesce(sum(metrics.tickets_sold), 0),
    'net_earnings_kobo', coalesce(sum(metrics.net_earnings), 0),
    'events', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', metrics.id,
          'title', metrics.title,
          'status', metrics.status,
          'starts_at', metrics.starts_at,
          'ends_at', metrics.ends_at,
          'tickets_sold', metrics.tickets_sold,
          'capacity', metrics.capacity,
          'net_earnings_kobo', metrics.net_earnings
        ) order by metrics.starts_at desc
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from event_metrics as metrics;

  return v_result;
end;
$$;

create or replace function public.get_organizer_event_dashboard(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_organizer
  ) then
    return null;
  end if;

  with event_metrics as (
    select
      event.id,
      event.title,
      event.status,
      event.starts_at,
      event.ends_at,
      coalesce(tickets.sold, 0)::bigint as tickets_sold,
      coalesce(tiers.capacity, 0)::bigint as capacity,
      coalesce(orders.net_earnings, 0)::bigint as net_earnings
    from public.events as event
    left join lateral (
      select sum(tier.quantity_available)::bigint as capacity
      from public.ticket_types as tier
      where tier.event_id = event.id
    ) as tiers on true
    left join lateral (
      select count(*)::bigint as sold
      from public.tickets as ticket
      join public.ticket_types as tier on tier.id = ticket.ticket_type_id
      join public.orders as ticket_order on ticket_order.id = ticket.order_id
      where tier.event_id = event.id
        and ticket.status in ('issued', 'used')
        and ticket_order.status = 'paid'
    ) as tickets on true
    left join lateral (
      select sum(ticket_order.total_kobo - ticket_order.commission_kobo)::bigint as net_earnings
      from public.orders as ticket_order
      where ticket_order.event_id = event.id
        and ticket_order.status = 'paid'
    ) as orders on true
    where event.id = p_event_id
      and event.organizer_id = auth.uid()
  ),
  gate_metrics as (
    select gates.gate_label, count(ticket.id)::bigint as scanned
    from (
      select distinct access.gate_label
      from public.door_staff_access as access
      where access.event_id = p_event_id
    ) as gates
    left join public.tickets as ticket
      on ticket.scanned_gate_label = gates.gate_label
      and ticket.status = 'used'
      and exists (
        select 1
        from public.ticket_types as tier
        join public.orders as ticket_order on ticket_order.id = ticket.order_id
        where tier.id = ticket.ticket_type_id
          and tier.event_id = p_event_id
          and ticket_order.status = 'paid'
      )
    group by gates.gate_label
  )
  select jsonb_build_object(
    'id', metrics.id,
    'title', metrics.title,
    'status', metrics.status,
    'starts_at', metrics.starts_at,
    'ends_at', metrics.ends_at,
    'tickets_sold', metrics.tickets_sold,
    'capacity', metrics.capacity,
    'net_earnings_kobo', metrics.net_earnings,
    'gate_checkins', coalesce(
      (select jsonb_agg(jsonb_build_object('label', gates.gate_label, 'scanned', gates.scanned)
        order by gates.gate_label) from gate_metrics as gates),
      '[]'::jsonb
    )
  )
  into v_result
  from event_metrics as metrics;

  return v_result;
end;
$$;

revoke all on function public.get_organizer_dashboard_summary() from public, anon;
revoke all on function public.get_organizer_event_dashboard(uuid) from public, anon;
grant execute on function public.get_organizer_dashboard_summary() to authenticated;
grant execute on function public.get_organizer_event_dashboard(uuid) to authenticated;
