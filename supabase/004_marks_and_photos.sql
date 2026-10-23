-- 004_marks_and_photos.sql

-- 1. Private bucket for proof photos (max 1 MB, JPEG only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 1048576, array['image/jpeg']);

-- Paths look like: <game_id>/<player_id>/<cell>-<timestamp>.jpg
-- A player can upload into their own folder only
create policy "Players upload into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'proofs'
    and exists (
      select 1 from public.players p
      where p.id::text      = (storage.foldername(name))[2]
        and p.game_id::text = (storage.foldername(name))[1]
        and p.user_id       = (select auth.uid())
    )
  );

-- A player can see their own photos; the host can see every photo in their game
create policy "Players and hosts can view proofs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'proofs'
    and (
      exists (
        select 1 from public.players p
        where p.id::text = (storage.foldername(name))[2]
          and p.user_id  = (select auth.uid())
      )
      or exists (
        select 1 from public.games g
        where g.id::text = (storage.foldername(name))[1]
          and g.host_id  = (select auth.uid())
      )
    )
  );

-- 2. Marks: one row per square with a photo
create table public.marks (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players (id) on delete cascade,
  cell_index  int  not null check (cell_index between 0 and 35),
  photo_path  text not null,
  created_at  timestamptz not null default now(),
  unique (player_id, cell_index)
);

alter table public.marks enable row level security;

create policy "Players read their own marks"
  on public.marks for select
  to authenticated
  using (exists (
    select 1 from public.players p
    where p.id = marks.player_id and p.user_id = (select auth.uid())
  ));

create policy "Hosts read marks in their games"
  on public.marks for select
  to authenticated
  using (exists (
    select 1 from public.players p
    join public.games g on g.id = p.game_id
    where p.id = marks.player_id and g.host_id = (select auth.uid())
  ));

-- 3. mark_square: the server checks everything, saves the mark,
--    looks for a completed line and sets finished_at with the SERVER's clock
create function public.mark_square(p_player_id uuid, p_cell_index int, p_photo_path text)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.players;
  v_game   public.games;
  v_n      int;
  v_bingo  boolean;
begin
  select * into v_player from public.players
  where id = p_player_id and user_id = auth.uid();
  if not found then
    raise exception 'Player not found';
  end if;

  select * into v_game from public.games where id = v_player.game_id;

  if v_game.status <> 'playing' or now() > v_game.ends_at + interval '5 seconds' then
    raise exception 'The game is over';
  end if;

  if v_player.finished_at is not null then
    raise exception 'You already have bingo';
  end if;

  v_n := v_game.grid_size;

  if p_cell_index < 0 or p_cell_index >= v_n * v_n then
    raise exception 'Invalid square';
  end if;

  if v_player.board -> p_cell_index ->> 'type' = 'free' then
    raise exception 'The FREE square is already marked';
  end if;

  if p_photo_path not like v_game.id::text || '/' || v_player.id::text || '/%' then
    raise exception 'Invalid photo path';
  end if;

  -- save (a retake replaces the photo)
  insert into public.marks (player_id, cell_index, photo_path)
  values (v_player.id, p_cell_index, p_photo_path)
  on conflict (player_id, cell_index)
  do update set photo_path = excluded.photo_path, created_at = now();

  -- any complete row, column or diagonal? (FREE counts as marked)
  with marked as (
    select m.cell_index from public.marks m where m.player_id = v_player.id
    union
    select (v_n * v_n) / 2 where v_n % 2 = 1
  ),
  lines as (
    select 'r' || r as line_id, r * v_n + c as cell
      from generate_series(0, v_n - 1) r, generate_series(0, v_n - 1) c
    union all
    select 'c' || c, r * v_n + c
      from generate_series(0, v_n - 1) r, generate_series(0, v_n - 1) c
    union all
    select 'd1', i * v_n + i from generate_series(0, v_n - 1) i
    union all
    select 'd2', i * v_n + (v_n - 1 - i) from generate_series(0, v_n - 1) i
  )
  select exists (
    select 1 from lines l
    join marked mk on mk.cell_index = l.cell
    group by l.line_id
    having count(*) = v_n
  ) into v_bingo;

  if v_bingo then
    update public.players set finished_at = now()
    where id = v_player.id
    returning * into v_player;
  end if;

  return v_player;
end;
$$;

revoke execute on function public.mark_square from public, anon;
grant  execute on function public.mark_square to authenticated;