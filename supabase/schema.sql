-- Tik-Booth Supabase schema
-- Phase 4: core database, storage bucket, and row-level security foundation

create extension if not exists pgcrypto;

create type public.event_format as enum ('in_person', 'online');
create type public.event_status as enum ('draft', 'published');
create type public.reservation_status as enum ('pending', 'confirmed', 'expired');
create type public.order_status as enum ('pending', 'paid', 'failed', 'cancelled');
create type public.ticket_status as enum ('issued', 'used', 'void');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_organizer boolean not null default false,
  organizer_name text,
  organizer_bio text,
  logo_url text,
  onboarding_step integer default 0,
  paystack_subaccount_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  category text not null,
  city text,
  format public.event_format not null,
  venue_address text,
  venue_latitude double precision,
  venue_longitude double precision,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.event_status not null default 'draft',
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_venue_coordinates_pair_check
    check ((venue_latitude is null) = (venue_longitude is null)),
  constraint events_venue_latitude_range_check
    check (venue_latitude is null or venue_latitude between -90 and 90),
  constraint events_venue_longitude_range_check
    check (venue_longitude is null or venue_longitude between -180 and 180),
  constraint events_published_in_person_coordinates_check
    check (
      status <> 'published'
      or format <> 'in_person'
      or (venue_latitude is not null and venue_longitude is not null)
    )
);

create table if not exists private.event_online_join_links (
  event_id uuid primary key references public.events (id) on delete cascade,
  join_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  price_kobo integer not null check (price_kobo >= 0),
  quantity_available integer not null check (quantity_available >= 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  card_color text,
  card_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  ticket_type_id uuid not null references public.ticket_types (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  total_kobo integer not null check (total_kobo >= 0),
  commission_kobo integer not null check (commission_kobo >= 0),
  paystack_reference text not null,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  qr_token text not null,
  status public.ticket_status not null default 'issued',
  scanned_at timestamptz,
  scanned_gate_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.door_staff_access (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  gate_label text not null,
  access_token_hash text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.processed_webhook_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

create index if not exists idx_events_organizer_status on public.events (organizer_id, status, starts_at);
create index if not exists idx_ticket_types_event_id on public.ticket_types (event_id);
create index if not exists idx_events_published_city_start
on public.events (city, starts_at)
where status = 'published';
create index if not exists idx_reservations_user_id on public.reservations (user_id, status, expires_at);
create index if not exists idx_orders_user_id on public.orders (user_id, status);
create index if not exists idx_tickets_owner_id on public.tickets (owner_id, status);
create index if not exists idx_door_staff_access_event_id on public.door_staff_access (event_id, revoked_at);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.reservations enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.door_staff_access enable row level security;
alter table public.processed_webhook_events enable row level security;
alter table private.event_online_join_links enable row level security;
revoke all on table private.event_online_join_links from public, anon, authenticated;

create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "events_select_public_published"
on public.events for select
using (status = 'published');

create policy "events_manage_own"
on public.events for all
using (organizer_id = auth.uid())
with check (organizer_id = auth.uid());

create policy "ticket_types_select_public_published"
on public.ticket_types for select
using (
  exists (
    select 1 from public.events e
    where e.id = ticket_types.event_id and e.status = 'published'
  )
);

create policy "ticket_types_manage_own"
on public.ticket_types for all
using (
  exists (
    select 1 from public.events e
    where e.id = ticket_types.event_id and e.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events e
    where e.id = ticket_types.event_id and e.organizer_id = auth.uid()
  )
);

create policy "reservations_select_own"
on public.reservations for select
using (user_id = auth.uid());

create policy "reservations_insert_own"
on public.reservations for insert
with check (user_id = auth.uid());

create policy "reservations_update_own"
on public.reservations for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "orders_select_own"
on public.orders for select
using (user_id = auth.uid());

create policy "tickets_select_own"
on public.tickets for select
using (owner_id = auth.uid());

create policy "door_staff_access_select_event_owner"
on public.door_staff_access for select
using (
  exists (
    select 1 from public.events e
    where e.id = door_staff_access.event_id and e.organizer_id = auth.uid()
  )
);

create policy "door_staff_access_manage_own"
on public.door_staff_access for all
using (created_by = auth.uid())
with check (created_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-card-images',
  'ticket-card-images',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ticket_card_images_public_read" on storage.objects;
create policy "ticket_card_images_public_read"
on storage.objects for select
using (bucket_id = 'ticket-card-images');

drop policy if exists "ticket_card_images_organizer_insert" on storage.objects;
create policy "ticket_card_images_organizer_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'ticket-card-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  )
);

drop policy if exists "ticket_card_images_organizer_update" on storage.objects;
create policy "ticket_card_images_organizer_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'ticket-card-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  )
)
with check (
  bucket_id = 'ticket-card-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  )
);

drop policy if exists "ticket_card_images_organizer_delete" on storage.objects;
create policy "ticket_card_images_organizer_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'ticket-card-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  )
);

-- Phase 4 onboarding storage and publication support
alter table public.profiles
  alter column onboarding_step drop not null;

drop policy if exists "events_manage_own" on public.events;

create policy "events_select_own"
on public.events for select to authenticated
using (organizer_id = auth.uid());

create policy "events_insert_own_drafts"
on public.events for insert to authenticated
with check (organizer_id = auth.uid() and status = 'draft');

create policy "events_update_own_drafts"
on public.events for update to authenticated
using (organizer_id = auth.uid() and status = 'draft')
with check (organizer_id = auth.uid() and status = 'draft');

create policy "events_delete_own_drafts"
on public.events for delete to authenticated
using (organizer_id = auth.uid() and status = 'draft');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('organizer-logos', 'organizer-logos', true, 52428800, array['image/jpeg', 'image/png', 'image/webp']),
  ('event-images', 'event-images', true, 52428800, array['image/jpeg', 'image/png', 'image/webp']),
  ('onboarding-image-uploads', 'onboarding-image-uploads', false, 52428800, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "organizer_logos_public_read"
on storage.objects for select
using (bucket_id = 'organizer-logos');

create policy "organizer_logos_organizer_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'organizer-logos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  )
);

create policy "organizer_logos_organizer_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'organizer-logos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  )
)
with check (
  bucket_id = 'organizer-logos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  )
);

create policy "organizer_logos_organizer_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'organizer-logos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  )
);

create policy "event_images_public_read"
on storage.objects for select
using (bucket_id = 'event-images');

create policy "event_images_organizer_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.events
    where id::text = (storage.foldername(name))[2]
      and organizer_id = (select auth.uid())
      and status = 'draft'
  )
);

create policy "event_images_organizer_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.events
    where id::text = (storage.foldername(name))[2]
      and organizer_id = (select auth.uid())
      and status = 'draft'
  )
)
with check (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.events
    where id::text = (storage.foldername(name))[2]
      and organizer_id = (select auth.uid())
      and status = 'draft'
  )
);

create policy "event_images_organizer_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.events
    where id::text = (storage.foldername(name))[2]
      and organizer_id = (select auth.uid())
  )
);

create policy "onboarding_image_uploads_organizer_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'onboarding-image-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  )
);

create policy "onboarding_image_uploads_organizer_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'onboarding-image-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "onboarding_image_uploads_organizer_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'onboarding-image-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  )
);

create or replace function public.save_onboarding_ticket_tiers(
  p_event_id uuid,
  p_tiers jsonb
)
returns table (tier_id uuid, "position" integer)
language plpgsql
set search_path = public
as $$
declare
  v_item jsonb;
  v_position integer;
  v_id uuid;
  v_seen_ids uuid[] := array[]::uuid[];
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id
      and organizer_id = auth.uid()
      and status = 'draft'
  ) then
    raise exception 'Draft event not found';
  end if;

  if jsonb_typeof(p_tiers) is distinct from 'array' then
    raise exception 'At least one ticket tier is required';
  end if;

  if jsonb_array_length(p_tiers) = 0 or jsonb_array_length(p_tiers) > 20 then
    raise exception 'At least one ticket tier is required';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_tiers) as elements(item)
    where elements.item->>'id' is not null
    group by elements.item->>'id'
    having count(*) > 1
  ) then
    raise exception 'Ticket tier IDs must be unique';
  end if;

  for v_item, v_position in
    select value, ordinality::integer
    from jsonb_array_elements(p_tiers) with ordinality
  loop
    if nullif(trim(v_item->>'name'), '') is null
      or length(trim(v_item->>'name')) > 80
      or coalesce(v_item->>'price_kobo', '') !~ '^[0-9]{1,10}$'
      or coalesce(v_item->>'quantity_available', '') !~ '^[1-9][0-9]{0,9}$'
      or coalesce(v_item->>'card_color', '') not in ('tier-a', 'tier-b', 'tier-c', 'ink') then
      raise exception 'Invalid ticket tier';
    end if;

    if (v_item->>'price_kobo')::bigint > 2147483647
      or (v_item->>'quantity_available')::bigint > 2147483647 then
      raise exception 'Ticket tier value exceeds the supported limit';
    end if;

    if (v_item->>'price_kobo')::bigint > 2147483647
      or (v_item->>'quantity_available')::bigint > 2147483647 then
      raise exception 'Ticket tier value exceeds the supported limit';
    end if;

    if nullif(v_item->>'id', '') is not null then
      if (v_item->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'Invalid ticket tier ID';
      end if;

      v_id := (v_item->>'id')::uuid;
      update public.ticket_types
      set name = trim(v_item->>'name'),
          price_kobo = (v_item->>'price_kobo')::integer,
          quantity_available = (v_item->>'quantity_available')::integer,
          card_color = v_item->>'card_color'
      where id = v_id
        and event_id = p_event_id
        and quantity_sold = 0;

      if not found then
        raise exception 'Ticket tier cannot be edited';
      end if;
    else
      insert into public.ticket_types (
        event_id,
        name,
        price_kobo,
        quantity_available,
        card_color
      )
      values (
        p_event_id,
        trim(v_item->>'name'),
        (v_item->>'price_kobo')::integer,
        (v_item->>'quantity_available')::integer,
        v_item->>'card_color'
      )
      returning id into v_id;
    end if;

    v_seen_ids := array_append(v_seen_ids, v_id);
    return query select v_id, v_position;
  end loop;

  if exists (
    select 1 from public.ticket_types
    where event_id = p_event_id
      and not (id = any(v_seen_ids))
      and quantity_sold > 0
  ) then
    raise exception 'A tier with sold tickets cannot be removed';
  end if;

  delete from public.ticket_types
  where event_id = p_event_id
    and not (id = any(v_seen_ids));
end;
$$;

revoke all on function public.save_onboarding_ticket_tiers(uuid, jsonb) from public, anon;
grant execute on function public.save_onboarding_ticket_tiers(uuid, jsonb) to authenticated;

create or replace function public.publish_onboarding_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_organizer
      and nullif(trim(paystack_subaccount_code), '') is not null
  ) then
    raise exception 'Payout setup is required before publishing';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id
      and organizer_id = auth.uid()
      and status = 'draft'
      and length(trim(title)) between 3 and 120
      and (description is null or length(description) <= 5000)
      and category in (
        'Music & Concerts',
        'Comedy & Performing Arts',
        'Fan Culture & Conventions',
        'Gaming & Esports',
        'Festivals & Culture',
        'Food & Drink',
        'Parties & Nightlife',
        'Sports & Fitness',
        'Tech & Business',
        'Arts, Film & Fashion',
        'Workshops & Learning',
        'Family, Faith & Causes'
      )
      and length(trim(coalesce(venue_address, ''))) between 2 and 250
      and (
        format = 'online'
        or (
          city is not null
          and venue_latitude is not null
          and venue_longitude is not null
        )
      )
      and starts_at < ends_at
  ) then
    raise exception 'A valid draft event is required before publishing';
  end if;

  if not exists (
    select 1 from public.ticket_types
    where event_id = p_event_id
  ) or exists (
    select 1 from public.ticket_types
    where event_id = p_event_id
      and (
        length(trim(name)) not between 1 and 80
        or price_kobo < 0
        or quantity_available < 1
        or card_color is null
        or card_color not in ('tier-a', 'tier-b', 'tier-c', 'ink')
      )
  ) then
    raise exception 'At least one ticket tier is required before publishing';
  end if;

  update public.events
  set status = 'published'
  where id = p_event_id
    and organizer_id = auth.uid()
    and status = 'draft';

  if not found then
    raise exception 'Draft event could not be published';
  end if;

  update public.profiles
  set onboarding_step = null
  where id = auth.uid();
end;
$$;

revoke all on function public.publish_onboarding_event(uuid) from public, anon;
grant execute on function public.publish_onboarding_event(uuid) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_updated_at_events
before update on public.events
for each row execute function public.set_updated_at();

create trigger set_updated_at_ticket_types
before update on public.ticket_types
for each row execute function public.set_updated_at();

create trigger set_updated_at_reservations
before update on public.reservations
for each row execute function public.set_updated_at();

create trigger set_updated_at_orders
before update on public.orders
for each row execute function public.set_updated_at();

create trigger set_updated_at_tickets
before update on public.tickets
for each row execute function public.set_updated_at();

create trigger set_updated_at_door_staff_access
before update on public.door_staff_access
for each row execute function public.set_updated_at();

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

revoke all on function public.get_door_staff_scan_context(uuid, text) from public, authenticated;
revoke all on function public.validate_door_staff_access(uuid, text) from public, authenticated;
revoke all on function public.scan_door_staff_ticket(uuid, text, uuid) from public, authenticated;
grant execute on function public.get_door_staff_scan_context(uuid, text) to anon, authenticated;
grant execute on function public.validate_door_staff_access(uuid, text) to anon, authenticated;
grant execute on function public.scan_door_staff_ticket(uuid, text, uuid) to anon, authenticated;
revoke all on function public.get_organizer_dashboard_summary() from public, anon;
revoke all on function public.get_organizer_event_dashboard(uuid) from public, anon;
grant execute on function public.get_organizer_dashboard_summary() to authenticated;
grant execute on function public.get_organizer_event_dashboard(uuid) to authenticated;
