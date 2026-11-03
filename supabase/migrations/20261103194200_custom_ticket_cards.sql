alter table public.ticket_types
  add column if not exists card_style text not null default 'solid'
    check (card_style in ('solid', 'torn')),
  add column if not exists card_finish text not null default 'normal'
    check (card_finish in ('normal', 'metallic')),
  add column if not exists card_text_color text not null default 'white'
    check (card_text_color in ('black', 'white'));

alter table public.ticket_types
  add constraint ticket_types_card_color_valid
  check (
    card_color is null
    or card_color in ('tier-a', 'tier-b', 'tier-c', 'ink', 'yellow', 'red')
    or card_color ~ '^#[0-9A-Fa-f]{6}$'
  );

grant insert (card_style, card_finish, card_text_color)
  on table public.ticket_types to authenticated;
grant update (card_style, card_finish, card_text_color)
  on table public.ticket_types to authenticated;

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
  v_card_style text;
  v_card_finish text;
  v_card_text_color text;
  v_card_color text;
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
    v_card_color := coalesce(v_item->>'card_color', '');
    v_card_style := coalesce(v_item->>'card_style', 'solid');
    v_card_finish := coalesce(v_item->>'card_finish', 'normal');
    v_card_text_color := coalesce(v_item->>'card_text_color', 'white');

    if nullif(trim(v_item->>'name'), '') is null
      or length(trim(v_item->>'name')) > 80
      or coalesce(v_item->>'price_kobo', '') !~ '^[0-9]{1,10}$'
      or coalesce(v_item->>'quantity_available', '') !~ '^[1-9][0-9]{0,9}$'
      or (
        v_card_color not in ('tier-a', 'tier-b', 'tier-c', 'ink', 'yellow', 'red')
        and v_card_color !~ '^#[0-9A-Fa-f]{6}$'
      )
      or v_card_style not in ('solid', 'torn')
      or v_card_finish not in ('normal', 'metallic')
      or v_card_text_color not in ('black', 'white') then
      raise exception 'Invalid ticket tier';
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
          card_color = v_card_color,
          card_style = v_card_style,
          card_finish = v_card_finish,
          card_text_color = v_card_text_color
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
        card_color,
        card_style,
        card_finish,
        card_text_color
      )
      values (
        p_event_id,
        trim(v_item->>'name'),
        (v_item->>'price_kobo')::integer,
        (v_item->>'quantity_available')::integer,
        v_card_color,
        v_card_style,
        v_card_finish,
        v_card_text_color
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

revoke all on function public.save_onboarding_ticket_tiers(uuid, jsonb) from public, anon;
revoke all on function public.publish_onboarding_event(uuid) from public, anon;
grant execute on function public.save_onboarding_ticket_tiers(uuid, jsonb) to authenticated;
grant execute on function public.publish_onboarding_event(uuid) to authenticated;
