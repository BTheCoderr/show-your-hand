create table public.syh_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-F0-9]{6}$'),
  status text not null default 'waiting' check (status in ('waiting','in_game','completed','abandoned')),
  max_players integer not null default 2 check (max_players between 2 and 6),
  game_state jsonb,
  state_version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours')
);

create table public.syh_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.syh_rooms(id) on delete cascade,
  seat integer not null check (seat between 0 and 5),
  game_player_id text not null,
  display_name text not null check (char_length(display_name) between 1 and 24),
  player_token uuid not null default gen_random_uuid(),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, seat),
  unique (room_id, player_token),
  unique (room_id, game_player_id)
);

create index syh_rooms_code_idx on public.syh_rooms(code);
create index syh_room_players_room_idx on public.syh_room_players(room_id);

alter table public.syh_rooms enable row level security;
alter table public.syh_room_players enable row level security;

revoke all on public.syh_rooms from anon, authenticated;
revoke all on public.syh_room_players from anon, authenticated;

create or replace function public.syh_actor_id(p_state jsonb)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_state #>> '{phase,type}'
    when 'choose_action' then p_state #>> array['players', (coalesce((p_state->>'currentPlayerIndex')::int, 0))::text, 'id']
    when 'choose_targets' then p_state #>> array['players', (coalesce((p_state->>'currentPlayerIndex')::int, 0))::text, 'id']
    when 'await_defense' then p_state #>> '{phase,responderId}'
    when 'claim_dropped' then p_state #>> '{phase,claimantId}'
    when 'trim_hand' then p_state #>> '{phase,playerId}'
    when 'choose_reverse_color' then p_state #>> '{phase,reverserId}'
    when 'await_reverse_blank' then p_state #>> '{phase,attack,attackerId}'
    when 'may_declare' then p_state #>> '{phase,playerId}'
    when 'review_hands' then p_state #>> array['players', (coalesce((p_state->>'currentPlayerIndex')::int, 0))::text, 'id']
    else null
  end
$$;

create or replace function public.syh_create_room(p_display_name text default 'Player 1')
returns table (
  room_id uuid,
  room_code text,
  player_id uuid,
  player_token uuid,
  seat integer,
  game_player_id text,
  state_version bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.syh_rooms%rowtype;
  v_player public.syh_room_players%rowtype;
  v_code text;
  v_name text;
begin
  v_name := left(trim(coalesce(nullif(p_display_name, ''), 'Player 1')), 24);

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.syh_rooms(code, max_players)
      values (v_code, 2)
      returning * into v_room;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  insert into public.syh_room_players(room_id, seat, game_player_id, display_name)
  values (v_room.id, 0, 'human', v_name)
  returning * into v_player;

  return query
  select v_room.id, v_room.code, v_player.id, v_player.player_token, v_player.seat, v_player.game_player_id, v_room.state_version;
end;
$$;

create or replace function public.syh_join_room(p_code text, p_display_name text default 'Player 2')
returns table (
  room_id uuid,
  room_code text,
  player_id uuid,
  player_token uuid,
  seat integer,
  game_player_id text,
  state_version bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.syh_rooms%rowtype;
  v_player public.syh_room_players%rowtype;
  v_name text;
  v_count integer;
begin
  v_name := left(trim(coalesce(nullif(p_display_name, ''), 'Player 2')), 24);

  select *
    into v_room
  from public.syh_rooms
  where code = upper(trim(p_code))
    and status = 'waiting'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Room not found or no longer joinable';
  end if;

  select count(*) into v_count
  from public.syh_room_players
  where room_id = v_room.id;

  if v_count >= v_room.max_players then
    raise exception 'Room is full';
  end if;

  insert into public.syh_room_players(room_id, seat, game_player_id, display_name)
  values (v_room.id, 1, 'cpu-1', v_name)
  returning * into v_player;

  return query
  select v_room.id, v_room.code, v_player.id, v_player.player_token, v_player.seat, v_player.game_player_id, v_room.state_version;
end;
$$;

create or replace function public.syh_get_room(p_code text, p_player_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.syh_rooms%rowtype;
  v_member public.syh_room_players%rowtype;
  v_players jsonb;
begin
  select *
    into v_room
  from public.syh_rooms
  where code = upper(trim(p_code))
    and expires_at > now();

  if not found then
    raise exception 'Room not found';
  end if;

  select *
    into v_member
  from public.syh_room_players
  where room_id = v_room.id
    and player_token = p_player_token;

  if not found then
    raise exception 'Invalid room token';
  end if;

  update public.syh_room_players
  set last_seen_at = now()
  where id = v_member.id
    and last_seen_at < now() - interval '15 seconds';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'seat', seat,
        'gamePlayerId', game_player_id,
        'displayName', display_name,
        'joinedAt', joined_at
      )
      order by seat
    ),
    '[]'::jsonb
  )
  into v_players
  from public.syh_room_players
  where room_id = v_room.id;

  return jsonb_build_object(
    'id', v_room.id,
    'code', v_room.code,
    'status', v_room.status,
    'maxPlayers', v_room.max_players,
    'stateVersion', v_room.state_version,
    'gameState', v_room.game_state,
    'players', v_players,
    'createdAt', v_room.created_at,
    'expiresAt', v_room.expires_at
  );
end;
$$;

create or replace function public.syh_start_room(
  p_room_id uuid,
  p_player_token uuid,
  p_game_state jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.syh_rooms%rowtype;
  v_member public.syh_room_players%rowtype;
  v_player_count integer;
  v_host_name text;
  v_guest_name text;
  v_state jsonb;
begin
  select * into v_room
  from public.syh_rooms
  where id = p_room_id
  for update;

  if not found or v_room.status <> 'waiting' then
    raise exception 'Room is not waiting';
  end if;

  select * into v_member
  from public.syh_room_players
  where room_id = p_room_id and player_token = p_player_token;

  if not found or v_member.seat <> 0 then
    raise exception 'Only the host can start the room';
  end if;

  select count(*) into v_player_count
  from public.syh_room_players
  where room_id = p_room_id;

  if v_player_count <> 2 then
    raise exception 'Two players are required to start';
  end if;

  if jsonb_array_length(coalesce(p_game_state->'players', '[]'::jsonb)) <> 2 then
    raise exception 'Online 1v1 requires exactly two game players';
  end if;

  if p_game_state #>> '{players,0,id}' <> 'human'
     or p_game_state #>> '{players,1,id}' <> 'cpu-1' then
    raise exception 'Unexpected game player mapping';
  end if;

  select display_name into v_host_name
  from public.syh_room_players
  where room_id = p_room_id and seat = 0;

  select display_name into v_guest_name
  from public.syh_room_players
  where room_id = p_room_id and seat = 1;

  v_state := p_game_state;
  v_state := jsonb_set(v_state, '{players,0,name}', to_jsonb(v_host_name), false);
  v_state := jsonb_set(v_state, '{players,1,name}', to_jsonb(v_guest_name), false);
  v_state := jsonb_set(v_state, '{players,0,isHuman}', 'true'::jsonb, false);
  v_state := jsonb_set(v_state, '{players,1,isHuman}', 'true'::jsonb, false);

  update public.syh_rooms
  set game_state = v_state,
      status = 'in_game',
      state_version = state_version + 1,
      updated_at = now()
  where id = p_room_id
  returning state_version into v_room.state_version;

  return v_room.state_version;
end;
$$;

create or replace function public.syh_submit_state(
  p_room_id uuid,
  p_player_token uuid,
  p_expected_version bigint,
  p_game_state jsonb,
  p_status text default 'in_game'
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.syh_rooms%rowtype;
  v_member public.syh_room_players%rowtype;
  v_actor text;
  v_current_phase text;
  v_new_version bigint;
begin
  if p_status not in ('in_game', 'completed', 'abandoned') then
    raise exception 'Invalid room status';
  end if;

  select * into v_room
  from public.syh_rooms
  where id = p_room_id
  for update;

  if not found or v_room.status <> 'in_game' then
    raise exception 'Room is not in an active game';
  end if;

  if v_room.state_version <> p_expected_version then
    raise exception 'STALE_STATE';
  end if;

  select * into v_member
  from public.syh_room_players
  where room_id = p_room_id and player_token = p_player_token;

  if not found then
    raise exception 'Invalid room token';
  end if;

  v_current_phase := v_room.game_state #>> '{phase,type}';
  v_actor := public.syh_actor_id(v_room.game_state);

  if v_actor is not null then
    if v_actor <> v_member.game_player_id then
      raise exception 'NOT_YOUR_TURN';
    end if;
  elsif v_current_phase <> 'round_over' then
    raise exception 'NO_ACTION_EXPECTED';
  end if;

  if jsonb_array_length(coalesce(p_game_state->'players', '[]'::jsonb)) <> 2 then
    raise exception 'Online state must keep exactly two players';
  end if;

  update public.syh_rooms
  set game_state = p_game_state,
      status = case
        when p_game_state #>> '{phase,type}' = 'match_over' then 'completed'
        else p_status
      end,
      state_version = state_version + 1,
      updated_at = now()
  where id = p_room_id
  returning state_version into v_new_version;

  return v_new_version;
end;
$$;

create or replace function public.syh_leave_room(
  p_room_id uuid,
  p_player_token uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.syh_rooms%rowtype;
  v_member public.syh_room_players%rowtype;
begin
  select * into v_room from public.syh_rooms where id = p_room_id for update;
  if not found then return; end if;

  select * into v_member
  from public.syh_room_players
  where room_id = p_room_id and player_token = p_player_token;

  if not found then return; end if;

  if v_room.status = 'completed' then
    delete from public.syh_room_players where id = v_member.id;
    return;
  end if;

  if v_member.seat = 0 and v_room.status = 'waiting' then
    delete from public.syh_rooms where id = p_room_id;
    return;
  end if;

  if v_room.status = 'waiting' then
    delete from public.syh_room_players where id = v_member.id;
  elsif v_room.status = 'in_game' then
    update public.syh_rooms
    set status = 'abandoned', updated_at = now()
    where id = p_room_id;
  end if;
end;
$$;

revoke all on function public.syh_actor_id(jsonb) from public;
revoke all on function public.syh_create_room(text) from public;
revoke all on function public.syh_join_room(text, text) from public;
revoke all on function public.syh_get_room(text, uuid) from public;
revoke all on function public.syh_start_room(uuid, uuid, jsonb) from public;
revoke all on function public.syh_submit_state(uuid, uuid, bigint, jsonb, text) from public;
revoke all on function public.syh_leave_room(uuid, uuid) from public;

grant execute on function public.syh_create_room(text) to anon, authenticated;
grant execute on function public.syh_join_room(text, text) to anon, authenticated;
grant execute on function public.syh_get_room(text, uuid) to anon, authenticated;
grant execute on function public.syh_start_room(uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.syh_submit_state(uuid, uuid, bigint, jsonb, text) to anon, authenticated;
grant execute on function public.syh_leave_room(uuid, uuid) to anon, authenticated;
