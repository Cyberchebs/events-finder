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

create policy "ticket_card_images_public_read"
on storage.objects for select
using (bucket_id = 'ticket-card-images');

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