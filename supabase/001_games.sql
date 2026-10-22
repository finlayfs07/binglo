-- 001_games.sql: one row per game

create table public.games (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  host_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category       text not null check (category in ('apu', 'custom')),
  grid_size      int  not null check (grid_size in (4, 5, 6)),
  duration_sec   int  not null check (duration_sec in (300, 600, 900, 1200)),
  winners_count  int  not null check (winners_count in (3, 5)),
  custom_prompts text[],
  status         text not null default 'lobby'
                 check (status in ('lobby', 'playing', 'review', 'finished')),
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  ends_at        timestamptz,
  -- a Custom game must come with its prompts
  check (category <> 'custom' or custom_prompts is not null)
);

-- Row Level Security: nobody can read or write until a policy allows it
alter table public.games enable row level security;

create policy "Signed-in users can read games"
  on public.games for select
  to authenticated
  using (true);

create policy "Hosts can create their own games"
  on public.games for insert
  to authenticated
  with check (host_id = (select auth.uid()));

-- create_game: picks a unique 6-character code and inserts the game
create or replace function public.create_game(
  p_category       text,
  p_grid_size      int,
  p_duration_sec   int,
  p_winners_count  int,
  p_custom_prompts text[] default null
)
returns public.games
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I/L
  v_code     text;
  v_game     public.games;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.games g where g.code = v_code);
  end loop;

  insert into public.games (code, host_id, category, grid_size, duration_sec, winners_count, custom_prompts)
  values (v_code, auth.uid(), p_category, p_grid_size, p_duration_sec, p_winners_count, p_custom_prompts)
  returning * into v_game;

  return v_game;
end;
$$;

revoke execute on function public.create_game from public, anon;
grant  execute on function public.create_game to authenticated;