-- 010: published results for everyone (players can't read each other's rows).
-- Bingo (not disqualified) by time, then everyone else by total squares, then A–Z.

create or replace function public.game_results(p_code text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_game   public.games;
  v_result json;
begin
  select * into v_game from public.games where code = upper(p_code);
  if not found then
    raise exception 'Game not found';
  end if;
  if v_game.status <> 'finished' then
    raise exception 'Results are not published yet';
  end if;

  with stats as (
    select
      p.id,
      p.name,
      p.user_id,
      case when p.finished_at is not null and not p.disqualified
           then p.finished_at end as bingo_at,
      (select count(*) from public.marks m where m.player_id = p.id) as total
    from public.players p
    where p.game_id = v_game.id
  ),
  ranked as (
    select
      s.*,
      row_number() over (order by s.bingo_at asc nulls last, s.total desc, s.name asc) as place
    from stats s
  )
  select json_build_object(
    'winners_count', v_game.winners_count,
    'player_count',  (select count(*) from ranked),
    'top', coalesce((
      select json_agg(json_build_object(
               'rank', r.place,
               'name', r.name,
               'time_sec', case when r.bingo_at is not null
                 then floor(extract(epoch from r.bingo_at - v_game.started_at))::int end,
               'total', r.total
             ) order by r.place)
      from ranked r
      where r.place <= 10
    ), '[]'::json),
    'me', (
      select json_build_object(
               'rank', r.place,
               'name', r.name,
               'time_sec', case when r.bingo_at is not null
                 then floor(extract(epoch from r.bingo_at - v_game.started_at))::int end,
               'total', r.total
             )
      from ranked r
      where r.user_id = auth.uid()
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.game_results(text) from public, anon;
grant  execute on function public.game_results(text) to authenticated;