-- =============================================================================
-- Storage: private product-images bucket, owner-scoped by path prefix.
-- Files are stored under `<auth.uid()>/<filename>`; policies restrict every
-- operation to the folder whose first path segment equals the user's id.
-- File size / MIME limits are enforced at the bucket level.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  5242880, -- 5 MiB
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- The first folder in the object path must be the authenticated user's id.
drop policy if exists "product-images owner select" on storage.objects;
create policy "product-images owner select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "product-images owner insert" on storage.objects;
create policy "product-images owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "product-images owner update" on storage.objects;
create policy "product-images owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "product-images owner delete" on storage.objects;
create policy "product-images owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
