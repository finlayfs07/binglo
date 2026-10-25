-- 007: after bingo, lock only the winning line; other squares stay open.
-- Run once in Supabase SQL Editor.

-- 1. Remember which line won (cell indexes, e.g. {10,11,12,13,14})
alter table public.players add column winning_line int[];

-- 2. mark_square, same as 004 except:
--    - no "already have bingo" block; only winning-line cells are locked
--    - only the first bingo sets finished_at and winning_line
--    - the player row is locked while marking (no double first-bingo)
create or replace function public.mark_square(p_player_id uuid, p_cell_index int, p_photo_path text)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.players;
  v_game   public.games;
  v_n      int;
  v_line   int[];
begin
  select * into v_player from public.players
  where id = p_player_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'Player not found';
  end if;

  select * into v_game from public.games where id = v_player.game_id;

  if v_game.status <> 'playing' or now() > v_game.ends_at + interval '5 seconds' then
    raise exception 'The game is over';
  end if;

  v_n := v_game.grid_size;

  if p_cell_index < 0 or p_cell_index >= v_n * v_n then
    raise exception 'Invalid square';
  end if;

  if v_player.board -> p_cell_index ->> 'type' = 'free' then
    raise exception 'The FREE square is already marked';
  end if;

  if p_cell_index = any(v_player.winning_line) then
    raise exception 'That square is part of your bingo and is locked';
  end if;

  if p_photo_path not like v_game.id::text || '/' || v_player.id::text || '/%' then
    raise exception 'Invalid photo path';
  end if;

  -- save (a retake replaces the photo)
  insert into public.marks (player_id, cell_index, photo_path)
  values (v_player.id, p_cell_index, p_photo_path)
  on conflict (player_id, cell_index)
  do update set photo_path = excluded.photo_path, created_at = now();

  -- first bingo only: find the first complete line (FREE counts as marked)
  if v_player.finished_at is null then
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
    select array_agg(l.cell order by l.cell) into v_line
    from lines l
    where l.line_id = (
      select l2.line_id from lines l2
      join marked mk on mk.cell_index = l2.cell
      group by l2.line_id
      having count(*) = v_n
      order by l2.line_id
      limit 1
    );

    if v_line is not null then
      update public.players
         set finished_at = now(), winning_line = v_line
       where id = v_player.id
      returning * into v_player;
    end if;
  end if;

  return v_player;
end;
$$;

revoke execute on function public.mark_square from public, anon;
grant  execute on function public.mark_square to authenticated;