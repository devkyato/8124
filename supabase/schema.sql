-- Run this once in the Supabase SQL editor. It creates local email/password
-- player accounts, protected profiles, verified ownership rules, badges,
-- game runs, weekly rankings, and automatic progression.

create extension if not exists pgcrypto;

create type public.player_rank as enum (
  'Unranked', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 32),
  rank public.player_rank not null default 'Unranked',
  xp integer not null default 0 check (xp >= 0),
  best_score integer not null default 0 check (best_score >= 0),
  max_tile integer not null default 2 check (max_tile >= 2),
  fastest_2048_ms integer check (fastest_2048_ms > 0),
  games_played integer not null default 0 check (games_played >= 0),
  total_score bigint not null default 0 check (total_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 10000000),
  max_tile integer not null constraint game_runs_max_tile_check check (max_tile between 2 and 131072 and (max_tile & (max_tile - 1)) = 0),
  duration_ms integer not null check (duration_ms between 1000 and 86400000),
  moves integer not null check (moves between 1 and 100000),
  won boolean not null default false constraint game_runs_won_tile_check check (not won or max_tile >= 2048),
  completed_at timestamptz not null default now(),
  week_start date generated always as ((date_trunc('week', completed_at at time zone 'UTC'))::date) stored
);

create index game_runs_week_score_idx on public.game_runs (week_start, score desc);
create index game_runs_user_completed_idx on public.game_runs (user_id, completed_at desc);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null
);

create table public.player_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

insert into public.badges (slug, name, description, icon) values
  ('first-run', 'First Move', 'Complete your first ranked run.', 'spark'),
  ('tile-128', 'Getting Warm', 'Create a 128 tile.', '128'),
  ('tile-512', 'Grid Tactician', 'Create a 512 tile.', '512'),
  ('tile-2048', 'The 2048', 'Create the legendary 2048 tile.', '2048'),
  ('speedrunner', 'Speedrunner', 'Reach 2048 in under ten minutes.', 'timer'),
  ('ten-games', 'Regular', 'Complete ten ranked runs.', '10x'),
  ('score-20000', 'High Roller', 'Score at least 20,000 in one run.', '20k')
on conflict (slug) do nothing;

create or replace function public.rank_for_xp(value integer)
returns public.player_rank
language sql immutable strict
as $$
  select case
    when value >= 18000 then 'Grandmaster'::public.player_rank
    when value >= 10000 then 'Master'::public.player_rank
    when value >= 6000 then 'Diamond'::public.player_rank
    when value >= 3000 then 'Platinum'::public.player_rank
    when value >= 1500 then 'Gold'::public.player_rank
    when value >= 750 then 'Silver'::public.player_rank
    when value >= 250 then 'Bronze'::public.player_rank
    else 'Unranked'::public.player_rank
  end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'));
  base_username := left(coalesce(nullif(base_username, ''), 'player'), 14) || '_' || left(replace(new.id::text, '-', ''), 5);

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    base_username,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Player'), 32)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.process_game_run()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  run_xp integer;
  new_games integer;
begin
  run_xp := greatest(5, floor(new.score / 100.0)::integer + floor(new.max_tile / 8.0)::integer + case when new.won then 250 else 0 end);

  update public.profiles
  set
    xp = xp + run_xp,
    rank = public.rank_for_xp(xp + run_xp),
    best_score = greatest(best_score, new.score),
    max_tile = greatest(max_tile, new.max_tile),
    fastest_2048_ms = case
      when new.won then least(coalesce(fastest_2048_ms, new.duration_ms), new.duration_ms)
      else fastest_2048_ms
    end,
    games_played = games_played + 1,
    total_score = total_score + new.score,
    updated_at = now()
  where id = new.user_id
  returning games_played into new_games;

  insert into public.player_badges (user_id, badge_id)
  select new.user_id, id from public.badges
  where slug = 'first-run'
     or (slug = 'tile-128' and new.max_tile >= 128)
     or (slug = 'tile-512' and new.max_tile >= 512)
     or (slug = 'tile-2048' and new.max_tile >= 2048)
     or (slug = 'speedrunner' and new.won and new.duration_ms < 600000)
     or (slug = 'ten-games' and new_games >= 10)
     or (slug = 'score-20000' and new.score >= 20000)
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_game_run_created
  after insert on public.game_runs
  for each row execute function public.process_game_run();

create or replace view public.weekly_leaderboard as
select
  p.id,
  p.username,
  p.display_name,
  p.rank,
  p.xp,
  p.best_score,
  p.max_tile,
  p.fastest_2048_ms,
  coalesce(sum(r.score) filter (where r.week_start = date_trunc('week', now() at time zone 'UTC')::date), 0)::bigint as weekly_score,
  count(r.id) filter (where r.week_start = date_trunc('week', now() at time zone 'UTC')::date)::integer as weekly_games
from public.profiles p
left join public.game_runs r on r.user_id = p.id
group by p.id;

alter table public.profiles enable row level security;
alter table public.game_runs enable row level security;
alter table public.badges enable row level security;
alter table public.player_badges enable row level security;

grant select on public.profiles, public.game_runs, public.badges, public.player_badges to anon, authenticated;
grant insert on public.game_runs to authenticated;

create policy "Public profiles are readable" on public.profiles for select using (true);
create policy "Players update their own public identity" on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
create policy "Runs are publicly readable" on public.game_runs for select using (true);
create policy "Players submit their own runs" on public.game_runs for insert
  with check (auth.uid() = user_id);
create policy "Badges are publicly readable" on public.badges for select using (true);
create policy "Earned badges are publicly readable" on public.player_badges for select using (true);

revoke update on public.profiles from authenticated;
grant update (username, display_name) on public.profiles to authenticated;
grant select on public.weekly_leaderboard to anon, authenticated;
