-- Bucket público de leitura; só webp até 200 KB (Card 1 - Storage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 204800, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- insert/update para a equipe; sem delete (nenhuma policy de delete)
create policy catalog_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'catalog' and public.my_role() is not null);
create policy catalog_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'catalog' and public.my_role() is not null)
  with check (bucket_id = 'catalog' and public.my_role() is not null);
