alter table public.app_settings
add column logo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "branding assets are public"
on storage.objects for select
to public
using (bucket_id = 'branding');

create policy "admins upload branding assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'branding' and public.current_role() = 'admin');

create policy "admins update branding assets"
on storage.objects for update
to authenticated
using (bucket_id = 'branding' and public.current_role() = 'admin')
with check (bucket_id = 'branding' and public.current_role() = 'admin');

create policy "admins delete branding assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'branding' and public.current_role() = 'admin');
