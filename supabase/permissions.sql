-- Portfolio content: everyone can read, only the verified Admin email can write.
grant usage on schema public to anon, authenticated;
grant select on public.portfolio_content to anon, authenticated;
grant insert, update, delete on public.portfolio_content to authenticated;

alter table public.portfolio_content enable row level security;

drop policy if exists "Portfolio content is publicly readable" on public.portfolio_content;
drop policy if exists "Portfolio admin can insert content" on public.portfolio_content;
drop policy if exists "Portfolio admin can update content" on public.portfolio_content;
drop policy if exists "Portfolio admin can delete content" on public.portfolio_content;

create policy "Portfolio content is publicly readable"
on public.portfolio_content for select
to anon, authenticated
using (true);

create policy "Portfolio admin can insert content"
on public.portfolio_content for insert
to authenticated
with check ((select auth.jwt() ->> 'email') = 'kenghin0909@gmail.com');

create policy "Portfolio admin can update content"
on public.portfolio_content for update
to authenticated
using ((select auth.jwt() ->> 'email') = 'kenghin0909@gmail.com')
with check ((select auth.jwt() ->> 'email') = 'kenghin0909@gmail.com');

create policy "Portfolio admin can delete content"
on public.portfolio_content for delete
to authenticated
using ((select auth.jwt() ->> 'email') = 'kenghin0909@gmail.com');

-- Storage: files are public to view, but only the same Admin can manage them.
drop policy if exists "Portfolio files are publicly readable" on storage.objects;
drop policy if exists "Portfolio admin can upload files" on storage.objects;
drop policy if exists "Portfolio admin can update files" on storage.objects;
drop policy if exists "Portfolio admin can delete files" on storage.objects;

create policy "Portfolio files are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'portfolio-files');

create policy "Portfolio admin can upload files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'portfolio-files'
  and (select auth.jwt() ->> 'email') = 'kenghin0909@gmail.com'
);

create policy "Portfolio admin can update files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'portfolio-files'
  and (select auth.jwt() ->> 'email') = 'kenghin0909@gmail.com'
)
with check (
  bucket_id = 'portfolio-files'
  and (select auth.jwt() ->> 'email') = 'kenghin0909@gmail.com'
);

create policy "Portfolio admin can delete files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'portfolio-files'
  and (select auth.jwt() ->> 'email') = 'kenghin0909@gmail.com'
);
