-- 008: player count + finished count in one call, for the players' 3 s poll.
-- Players can't read other players' rows (RLS), so this is security definer.

create or replace function public.game_progress(p_code text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'players',  count(p.id),
    'finished', count(p.finished_at)   -- counts only non-null finished_at
  )
  from public.games g
  left join public.players p on p.game_id = g.id
  where g.code = upper(p_code);
$$;

revoke execute on function public.game_progress(text) from public, anon;
grant  execute on function public.game_progress(text) to authenticated;