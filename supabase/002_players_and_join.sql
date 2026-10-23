-- 002_players_and_join.sql

-- 1. Each game stores its own prompt pool (replaces custom_prompts)
delete from public.games;   -- removes the test games from yesterday
alter table public.games drop column custom_prompts;
alter table public.games add column prompts jsonb not null
  check (jsonb_typeof(prompts) = 'array');

-- 2. create_game now takes the prompt pool
drop function if exists public.create_game(text, int, int, int, text[]);

create function public.create_game(
  p_category      text,
  p_grid_size     int,
  p_duration_sec  int,
  p_winners_count int,
  p_prompts       jsonb
)
returns public.games
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_needed   int  := p_grid_size * p_grid_size - (p_grid_size % 2);
  v_code     text;
  v_game     public.games;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  if p_prompts is null or jsonb_typeof(p_prompts) <> 'array'
     or jsonb_array_length(p_prompts) < v_needed then
    raise exception 'This grid needs at least % prompts', v_needed;
  end if;

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.games g where g.code = v_code);
  end loop;

  insert into public.games (code, host_id, category, grid_size, duration_sec, winners_count, prompts)
  values (v_code, auth.uid(), p_category, p_grid_size, p_duration_sec, p_winners_count, p_prompts)
  returning * into v_game;

  return v_game;
end;
$$;

revoke execute on function public.create_game from public, anon;
grant  execute on function public.create_game to authenticated;

-- 3. Players: one row per person in a game
create table public.players (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 24),
  board        jsonb not null,
  finished_at  timestamptz,
  disqualified boolean not null default false,
  joined_at    timestamptz not null default now(),
  unique (game_id, user_id),
  unique (game_id, name)
);

create index players_game_id_idx on public.players (game_id);

alter table public.players enable row level security;

create policy "Players can read their own row"
  on public.players for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Hosts can read players in their games"
  on public.players for select
  to authenticated
  using (exists (
    select 1 from public.games g
    where g.id = players.game_id and g.host_id = (select auth.uid())
  ));

-- 4. join_game: adds the player and deals them a shuffled board
create function public.join_game(p_code text, p_name text)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game   public.games;
  v_player public.players;
  v_base   text;
  v_name   text;
  v_suffix int := 1;
  v_needed int;
  v_board  jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into v_game from public.games where code = upper(trim(p_code));
  if not found then
    raise exception 'Game not found. Check the code and try again';
  end if;

  if v_game.host_id = auth.uid() then
    raise exception 'You''re the host of this game, so you can''t join it as a player';
  end if;

  -- already joined (refresh, crashed browser): give back the same board
  select * into v_player from public.players
  where game_id = v_game.id and user_id = auth.uid();
  if found then
    return v_player;
  end if;

  if v_game.status not in ('lobby', 'playing') then
    raise exception 'This game has already ended';
  end if;

  v_base := trim(coalesce(p_name, ''));
  if char_length(v_base) < 1 or char_length(v_base) > 20 then
    raise exception 'Your name must be 1 to 20 characters';
  end if;

  -- two Aishas → "Aisha", "Aisha 2"
  v_name := v_base;
  while exists (select 1 from public.players p
                where p.game_id = v_game.id and lower(p.name) = lower(v_name)) loop
    v_suffix := v_suffix + 1;
    v_name := v_base || ' ' || v_suffix;
  end loop;

  -- deal: random prompts, at most 5 from the "country" group (extras only if needed)
  v_needed := v_game.grid_size * v_game.grid_size - (v_game.grid_size % 2);

  select jsonb_agg(picked.elem order by random()) into v_board
  from (
    select ranked.elem
    from (
      select a.elem, a.is_country, a.r,
             row_number() over (partition by a.is_country order by a.r) as rn
      from (
        select e.elem,
               coalesce(e.elem ->> 'group', '') = 'country' as is_country,
               random() as r
        from jsonb_array_elements(v_game.prompts) as e(elem)
      ) a
    ) ranked
    order by (ranked.is_country and ranked.rn > 5), ranked.r
    limit v_needed
  ) picked;

  if v_board is null or jsonb_array_length(v_board) < v_needed then
    raise exception 'This game doesn''t have enough prompts';
  end if;

  -- odd grids get a FREE centre square
  if v_game.grid_size % 2 = 1 then
    v_board := jsonb_insert(v_board, array[(v_needed / 2)::text],
                            '{"text": "FREE", "type": "free"}'::jsonb);
  end if;

  insert into public.players (game_id, user_id, name, board)
  values (v_game.id, auth.uid(), v_name, v_board)
  returning * into v_player;

  return v_player;
end;
$$;

revoke execute on function public.join_game from public, anon;
grant  execute on function public.join_game to authenticated;

-- 5. Player count for the waiting screen
create function public.game_player_count(p_code text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.players p
  join public.games g on g.id = p.game_id
  where g.code = upper(trim(p_code));
$$;

revoke execute on function public.game_player_count from public, anon;
grant  execute on function public.game_player_count to authenticated;