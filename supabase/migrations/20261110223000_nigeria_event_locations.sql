alter table public.events
  add column if not exists venue_latitude double precision,
  add column if not exists venue_longitude double precision;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_venue_coordinates_pair_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_venue_coordinates_pair_check
      check ((venue_latitude is null) = (venue_longitude is null))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_venue_latitude_range_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_venue_latitude_range_check
      check (venue_latitude is null or venue_latitude between -90 and 90)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_venue_longitude_range_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_venue_longitude_range_check
      check (venue_longitude is null or venue_longitude between -180 and 180)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_published_in_person_coordinates_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_published_in_person_coordinates_check
      check (
        status <> 'published'
        or format <> 'in_person'
        or (venue_latitude is not null and venue_longitude is not null)
      )
      not valid;
  end if;
end
$$;
