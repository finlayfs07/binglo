-- 005_fix_storage_policies.sql
-- Bug in 004: inside the subqueries, "name" resolved to players.name (the
-- player's display name) instead of storage.objects.name (the file path).
-- Fix: qualify it as objects.name.

drop policy "Players upload into their own folder" on storage.objects;
drop policy "Players and hosts can view proofs" on storage.objects;

create policy "Players upload into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'proofs'
    and exists (
      select 1 from public.players p
      where p.id::text      = (storage.foldername(objects.name))[2]
        and p.game_id::text = (storage.foldername(objects.name))[1]
        and p.user_id       = (select auth.uid())
    )
  );

create policy "Players and hosts can view proofs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'proofs'
    and (
      exists (
        select 1 from public.players p
        where p.id::text = (storage.foldername(objects.name))[2]
          and p.user_id  = (select auth.uid())
      )
      or exists (
        select 1 from public.games g
        where g.id::text = (storage.foldername(objects.name))[1]
          and g.host_id  = (select auth.uid())
      )
    )
  );