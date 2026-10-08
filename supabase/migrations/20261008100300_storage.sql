-- Storage buckets (PRD section 9)

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('review-images', 'review-images', true),
  ('board-attachments', 'board-attachments', false),
  ('event-assets', 'event-assets', true)
on conflict (id) do nothing;

create policy product_images_read on storage.objects
for select to public
using (bucket_id = 'product-images');

create policy product_images_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

create policy product_images_update on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

create policy product_images_delete on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());

create policy review_images_read on storage.objects
for select to public
using (bucket_id = 'review-images');

create policy review_images_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'review-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy review_images_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'review-images'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy board_attachments_read on storage.objects
for select to authenticated
using (
  bucket_id = 'board-attachments'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy board_attachments_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'board-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy board_attachments_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'board-attachments'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy event_assets_read on storage.objects
for select to public
using (bucket_id = 'event-assets');

create policy event_assets_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'event-assets' and public.is_admin());

create policy event_assets_update on storage.objects
for update to authenticated
using (bucket_id = 'event-assets' and public.is_admin())
with check (bucket_id = 'event-assets' and public.is_admin());

create policy event_assets_delete on storage.objects
for delete to authenticated
using (bucket_id = 'event-assets' and public.is_admin());
