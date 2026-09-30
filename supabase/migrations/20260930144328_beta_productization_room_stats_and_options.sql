alter table public.syh_rooms
  add column if not exists mode text not null default 'standard',
  add column if not exists beginner_mode boolean not null default true,
  add column if not exists match_started_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'syh_rooms_mode_check') then
    alter table public.syh_rooms
      add constraint syh_rooms_mode_check
      check (mode in ('standard','hardcore'));
  end if;
end $$;

create table if not exists public.syh_room_player_stats (
  room_id uuid not null references public.syh_rooms(id) on delete cascade,
  game_player_id text not null,
  attacks_played integer not null default 0,
  defenses_played integer not null default 0,
  blank_defenses integer not null default 0,
  rounds_won integer not null default 0,
  specials_played integer not null default 0,
  match_wins integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (room_id, game_player_id)
);

create table if not exists public.syh_match_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.syh_rooms(id) on delete cascade,
  rematch_sequence integer not null default 0,
  winner_game_player_id text not null,
  winner_display_name text not null,
  summary jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  unique (room_id, rematch_sequence)
);

alter table public.syh_room_player_stats enable row level security;
alter table public.syh_match_results enable row level security;
revoke all on public.syh_room_player_stats from anon, authenticated;
revoke all on public.syh_match_results from anon, authenticated;

create or replace function public.syh_set_room_options(
  p_room_id uuid,
  p_player_token uuid,
  p_beginner_mode boolean,
  p_mode text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_seat integer;
begin
  if p_mode not in ('standard','hardcore') then raise exception 'Invalid game mode'; end if;

  select r.status, rp.seat into v_status, v_seat
  from public.syh_rooms r
  join public.syh_room_players rp on rp.room_id = r.id
  where r.id = p_room_id
    and rp.player_token = p_player_token
    and r.expires_at > now();

  if not found then raise exception 'Room not found'; end if;
  if v_seat <> 0 then raise exception 'Only the host can change room options'; end if;
  if v_status <> 'waiting' then raise exception 'Room options are locked after the match starts'; end if;

  update public.syh_rooms
  set beginner_mode = p_beginner_mode,
      mode = p_mode,
      updated_at = now()
  where id = p_room_id;
end;
$$;

revoke all on function public.syh_set_room_options(uuid, uuid, boolean, text) from public;
grant execute on function public.syh_set_room_options(uuid, uuid, boolean, text) to anon;
