-- Tik-Booth Supabase schema
-- Phase 4: core database, storage bucket, and row-level security foundation

create extension if not exists pgcrypto;

create type public.event_format as enum ('in_person', 'online');
create type public.event_status as enum ('draft', 'published');
create type public.reservation_status as enum ('pending', 'confirmed', 'expired');
create type public.order_status as enum ('pending', 'paid', 'failed', 'cancelled');
create type public.ticket_status as enum ('issued', 'used', 'void');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_organizer boolean not null default false,
  organizer_name text,
  organizer_bio text,
  logo_url text,
  onboarding_step integer not null default 0,
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
  format public.event_format not null,
  venue_address text,
  online_join_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.event_status not null default 'draft',
  currency text not null default 'NGN',
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

-- Storage bucket setup is project-specific; run in the Supabase dashboard or CLI.
-- Example CLI: supabase storage create bucket ticket-card-images --public
-- then add the bucket policies in the Supabase dashboard or via a storage migration.

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
