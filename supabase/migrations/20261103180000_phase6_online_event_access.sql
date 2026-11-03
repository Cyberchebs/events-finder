create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.event_online_join_links (
  event_id uuid primary key references public.events (id) on delete cascade,
  join_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.event_online_join_links enable row level security;
revoke all on table private.event_online_join_links from public, anon, authenticated;

insert into private.event_online_join_links (event_id, join_url, created_at, updated_at)
select e.id, btrim(e.online_join_url), e.created_at, e.updated_at
from public.events e
where nullif(btrim(e.online_join_url), '') is not null
on conflict (event_id) do update
set join_url = excluded.join_url,
    updated_at = excluded.updated_at;

alter table public.events drop column online_join_url;

create or replace function public.save_draft_online_event_join_url(
  p_event_id uuid,
  p_join_url text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_format public.event_format;
  v_join_url text;
begin
  if v_user_id is null or p_event_id is null then
    return false;
  end if;

  select e.format
  into v_event_format
  from public.events e
  where e.id = p_event_id
    and e.organizer_id = v_user_id
    and e.status = 'draft';

  if not found then
    return false;
  end if;

  if p_join_url is null or pg_catalog.btrim(p_join_url) = '' then
    delete from private.event_online_join_links
    where event_id = p_event_id;
    return true;
  end if;

  v_join_url := pg_catalog.btrim(p_join_url);
  if v_event_format <> 'online'
     or pg_catalog.length(v_join_url) not between 1 and 2048
     or v_join_url !~* '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$' then
    return false;
  end if;

  insert into private.event_online_join_links (event_id, join_url)
  values (p_event_id, v_join_url)
  on conflict (event_id) do update
  set join_url = excluded.join_url,
      updated_at = pg_catalog.now();

  return true;
end;
$$;

create or replace function public.get_draft_online_event_join_url(p_event_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select link.join_url
  from public.events e
  join private.event_online_join_links link on link.event_id = e.id
  where auth.uid() is not null
    and e.id = p_event_id
    and e.organizer_id = auth.uid()
    and e.status = 'draft'
    and e.format = 'online'
$$;

create or replace function public.get_online_event_join_access(p_ticket_id uuid)
returns table (
  event_title text,
  starts_at timestamptz,
  unlock_at timestamptz,
  server_now timestamptz,
  is_unlocked boolean,
  join_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.title,
    e.starts_at,
    e.starts_at - interval '30 minutes',
    pg_catalog.now(),
    pg_catalog.now() >= e.starts_at - interval '30 minutes',
    case
      when pg_catalog.now() >= e.starts_at - interval '30 minutes'
        and link.join_url ~* '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$'
      then link.join_url
      else null
    end
  from public.tickets t
  join public.orders o on o.id = t.order_id
  join public.ticket_types tt on tt.id = t.ticket_type_id
  join public.events e on e.id = o.event_id
  left join private.event_online_join_links link on link.event_id = e.id
  where auth.uid() is not null
    and t.id = p_ticket_id
    and t.owner_id = auth.uid()
    and t.status = 'issued'
    and o.user_id = auth.uid()
    and o.status = 'paid'
    and tt.event_id = e.id
    and e.status = 'published'
    and e.format = 'online'
  limit 1
$$;

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
      and category in ('Music', 'Sports', 'Comedy', 'Nightlife', 'Business')
      and length(trim(coalesce(venue_address, ''))) between 2 and 250
      and starts_at < ends_at
  ) then
    raise exception 'A valid draft event is required before publishing';
  end if;

  if exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.organizer_id = auth.uid()
      and e.status = 'draft'
      and e.format = 'online'
      and not exists (
        select 1 from private.event_online_join_links link
        where link.event_id = e.id
          and link.join_url ~* '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$'
      )
  ) then
    raise exception 'A valid HTTPS join URL is required before publishing an online event';
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

revoke all on function public.save_draft_online_event_join_url(uuid, text) from public, anon;
revoke all on function public.get_draft_online_event_join_url(uuid) from public, anon;
revoke all on function public.get_online_event_join_access(uuid) from public, anon;
revoke all on function public.publish_onboarding_event(uuid) from public, anon;

grant execute on function public.save_draft_online_event_join_url(uuid, text) to authenticated;
grant execute on function public.get_draft_online_event_join_url(uuid) to authenticated;
grant execute on function public.get_online_event_join_access(uuid) to authenticated;
grant execute on function public.publish_onboarding_event(uuid) to authenticated;
