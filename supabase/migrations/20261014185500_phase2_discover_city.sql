alter table public.events
  add column if not exists city text;

create index if not exists idx_events_published_city_start
on public.events (city, starts_at)
where status = 'published';

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
      and (format = 'online' or city in ('Lagos', 'Abuja', 'Jos'))
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
