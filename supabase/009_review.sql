-- 009: host review: approve / disqualify finishers, then publish results.
-- Run once in Supabase SQL Editor.

-- 1. Approved by the host (disqualified already exists from 002)
alter table public.players add column approved boolean not null default false;

-- 2. One decision per finisher: 'approved' | 'disqualified' | 'pending' (undo).
--    Host only, only during review, only players who got bingo.
create or replace function public.review_player(p_player_id uuid, p_decision text)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.players;
  v_game   public.games;
begin
  if p_decision not in ('approved', 'disqualified', 'pending') then
    raise exception 'Invalid decision';
  end if;

  select * into v_player from public.players where id = p_player_id for update;
  if not found then
    raise exception 'Player not found';
  end if;

  select * into v_game from public.games where id = v_player.game_id;

  if v_game.host_id is distinct from auth.uid() then
    raise exception 'Only the host can review';
  end if;
  if v_game.status <> 'review' then
    raise exception 'The game is not in review';
  end if;
  if v_player.finished_at is null then
    raise exception 'This player did not get bingo';
  end if;

  update public.players
     set approved     = (p_decision = 'approved'),
         disqualified = (p_decision = 'disqualified')
   where id = p_player_id
  returning * into v_player;

  return v_player;
end;
$$;

-- 3. Publish: only when the top N non-disqualified finishers are all approved.
--    Sets status = 'finished', which shows Results to everyone.
create or replace function public.publish_results(p_game_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game    public.games;
  v_pending int;
begin
  select * into v_game from public.games where id = p_game_id for update;
  if not found or v_game.host_id is distinct from auth.uid() then
    raise exception 'Game not found or not yours';
  end if;
  if v_game.status = 'finished' then
    return 'finished'; -- already published, safe to call twice
  end if;
  if v_game.status <> 'review' then
    raise exception 'The game is not in review';
  end if;

  select count(*) into v_pending
  from (
    select p.approved
    from public.players p
    where p.game_id = p_game_id
      and p.finished_at is not null
      and not p.disqualified
    order by p.finished_at
    limit v_game.winners_count
  ) top
  where not top.approved;

  if v_pending > 0 then
    raise exception 'Approve or disqualify the top % first', v_game.winners_count;
  end if;

  update public.games set status = 'finished' where id = p_game_id;
  return 'finished';
end;
$$;

revoke execute on function public.review_player(uuid, text) from public, anon;
grant  execute on function public.review_player(uuid, text) to authenticated;
revoke execute on function public.publish_results(uuid) from public, anon;
grant  execute on function public.publish_results(uuid) to authenticated;