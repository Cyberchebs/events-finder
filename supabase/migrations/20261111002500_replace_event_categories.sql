alter table public.events
  drop constraint if exists events_published_in_person_coordinates_check;

update public.events
set category = case category
  when 'Music' then 'Music & Concerts'
  when 'Sports' then 'Sports & Fitness'
  when 'Comedy' then 'Comedy & Performing Arts'
  when 'Nightlife' then 'Parties & Nightlife'
  when 'Business' then 'Tech & Business'
  else category
end
where category in ('Music', 'Sports', 'Comedy', 'Nightlife', 'Business');

alter table public.events
  add constraint events_published_in_person_coordinates_check
  check (
    status <> 'published'
    or format <> 'in_person'
    or (venue_latitude is not null and venue_longitude is not null)
  )
  not valid;

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
        or (
          card_color not in ('tier-a', 'tier-b', 'tier-c', 'ink', 'yellow', 'red')
          and card_color !~ '^#[0-9A-Fa-f]{6}$'
        )
        or card_style not in ('solid', 'torn')
        or card_finish not in ('normal', 'metallic')
        or card_text_color not in ('black', 'white')
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
