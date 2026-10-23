-- 006: live host view + ending a game
-- Run once in Supabase SQL Editor.

-- 1. Host receives live events when squares are marked
alter publication supabase_realtime add table public.marks;

-- 2. End early: pull ends_at forward to now.
--    Status stays 'playing' so photos already uploading get the 5 s grace.
create or replace function public.end_game_now(p_game_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ends timestamptz;
begin
  update games
     set ends_at = least(ends_at, now())
   where id = p_game_id
     and host_id = auth.uid()
     and status = 'playing'
  returning ends_at into v_ends;

  if v_ends is null then
    raise exception 'Game not found, not yours, or not playing';
  end if;

  return v_ends;
end;
$$;

-- 3. Close after the grace period.
--    playing -> review, or -> finished if nobody got bingo (review skipped).
--    Safe to call twice: returns the current status if already closed.
create or replace function public.close_game(p_game_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_next text;
begin
  select * into v_game from games where id = p_game_id for update;

  if not found or v_game.host_id <> auth.uid() then
    raise exception 'Game not found or not yours';
  end if;

  if v_game.status <> 'playing' then
    return v_game.status;
  end if;

  if now() < v_game.ends_at + interval '5 seconds' then
    raise exception 'Still in the grace period';
  end if;

  if exists (
    select 1 from players
     where game_id = p_game_id and finished_at is not null
  ) then
    v_next := 'review';
  else
    v_next := 'finished';
  end if;

  update games set status = v_next where id = p_game_id;
  return v_next;
end;
$$;

grant execute on function public.end_game_now(uuid) to authenticated;
grant execute on function public.close_game(uuid) to authenticated;