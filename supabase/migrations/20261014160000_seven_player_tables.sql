-- Private tables hold 2–7 players. Seat 0 stays "human"; later seats stay
-- "cpu-N" so the existing engine identity map does not change. This does not
-- enable team rules.

alter table public.syh_rooms
  drop constraint if exists syh_rooms_max_players_check;
alter table public.syh_rooms
  add constraint syh_rooms_max_players_check check (max_players between 2 and 7);

alter table public.syh_room_players
  drop constraint if exists syh_room_players_seat_check;
alter table public.syh_room_players
  add constraint syh_room_players_seat_check check (seat between 0 and 6);

drop function if exists public.syh_create_safe_room(uuid, text);

create function public.syh_create_safe_room(
  p_safety_install_id uuid,
  p_display_name text default 'Player 1',
  p_max_players integer default 2
)
returns table (
  room_id uuid, room_code text, player_id uuid, player_token uuid,
  seat integer, game_player_id text, state_version bigint
)
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.syh_rooms%rowtype;
  v_player public.syh_room_players%rowtype;
  v_code text;
  v_max integer;
begin
  if p_safety_install_id is null then
    raise exception 'A safety ID is required for online play';
  end if;

  v_max := coalesce(p_max_players, 2);
  if v_max < 2 or v_max > 7 then
    raise exception 'Tables hold two to seven players';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.syh_rooms(code, max_players) values (v_code, v_max)
      returning * into v_room;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  insert into public.syh_room_players
    (room_id, seat, game_player_id, display_name, safety_install_id)
  values (
    v_room.id, 0, 'human',
    left(coalesce(nullif(trim(p_display_name), ''), 'Player 1'), 24),
    p_safety_install_id
  )
  returning * into v_player;

  return query
    select v_room.id, v_room.code, v_player.id, v_player.player_token,
           v_player.seat, v_player.game_player_id, v_room.state_version;
end;
$$;

create or replace function public.syh_join_safe_room(
  p_code text, p_safety_install_id uuid, p_display_name text default 'Player 2'
)
returns table (
  room_id uuid, room_code text, player_id uuid, player_token uuid,
  seat integer, game_player_id text, state_version bigint
)
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.syh_rooms%rowtype;
  v_player public.syh_room_players%rowtype;
  v_count integer;
  v_seat integer;
begin
  if p_safety_install_id is null then
    raise exception 'A safety ID is required for online play';
  end if;

  select r.* into v_room
    from public.syh_rooms r
   where r.code = upper(trim(p_code))
     and r.status = 'waiting'
     and r.expires_at > now()
     for update;
  if not found then raise exception 'Room not found or no longer joinable'; end if;

  if exists (
    select 1 from public.syh_room_players rp
     where rp.room_id = v_room.id
       and rp.safety_install_id = p_safety_install_id
  ) then
    raise exception 'You cannot join your own room from this installation';
  end if;

  if exists (
    select 1
      from public.syh_room_players rp
      join public.syh_player_blocks b
        on (b.blocker_install_id = p_safety_install_id and b.blocked_install_id = rp.safety_install_id)
        or (b.blocker_install_id = rp.safety_install_id and b.blocked_install_id = p_safety_install_id)
     where rp.room_id = v_room.id
       and rp.safety_install_id is not null
  ) then
    raise exception 'This room is unavailable because a player is blocked';
  end if;

  select count(*) into v_count from public.syh_room_players rp
   where rp.room_id = v_room.id;
  if v_count >= v_room.max_players then raise exception 'Room is full'; end if;

  select coalesce(max(rp.seat), -1) + 1 into v_seat
    from public.syh_room_players rp
   where rp.room_id = v_room.id;
  if v_seat < 1 or v_seat > 6 then raise exception 'Room is full'; end if;

  insert into public.syh_room_players
    (room_id, seat, game_player_id, display_name, safety_install_id)
  values (
    v_room.id,
    v_seat,
    'cpu-' || v_seat::text,
    left(coalesce(nullif(trim(p_display_name), ''), 'Player ' || (v_seat + 1)::text), 24),
    p_safety_install_id
  )
  returning * into v_player;

  return query
    select v_room.id, v_room.code, v_player.id, v_player.player_token,
           v_player.seat, v_player.game_player_id, v_room.state_version;
end;
$$;

create or replace function public.syh_request_rematch(
  p_room_id uuid,
  p_player_token uuid,
  p_ready boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_total integer;
  v_ready integer;
  v_reset boolean := false;
begin
  select status into v_status
  from public.syh_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  if v_status <> 'completed' then
    raise exception 'Rematch is only available after a completed match';
  end if;

  update public.syh_room_players
  set rematch_ready = p_ready,
      last_seen_at = now()
  where room_id = p_room_id
    and player_token = p_player_token;

  if not found then
    raise exception 'Invalid room token';
  end if;

  select count(*), count(*) filter (where rematch_ready)
    into v_total, v_ready
  from public.syh_room_players
  where room_id = p_room_id;

  if v_total between 2 and 7 and v_ready = v_total then
    update public.syh_rooms
    set status = 'waiting',
        game_state = null,
        state_version = state_version + 1,
        rematch_sequence = rematch_sequence + 1,
        match_started_at = null,
        updated_at = now(),
        expires_at = now() + interval '12 hours'
    where id = p_room_id;

    update public.syh_room_players
    set ready = false,
        rematch_ready = false,
        last_seen_at = now()
    where room_id = p_room_id;

    v_reset := true;
  end if;

  return jsonb_build_object('reset', v_reset);
end;
$$;

revoke all on function public.syh_create_safe_room(uuid, text, integer) from public, authenticated;
grant execute on function public.syh_create_safe_room(uuid, text, integer) to anon;

revoke execute on function public.syh_join_safe_room(text, uuid, text) from public, authenticated;
grant execute on function public.syh_join_safe_room(text, uuid, text) to anon;

revoke execute on function public.syh_request_rematch(uuid, uuid, boolean) from public, authenticated;
grant execute on function public.syh_request_rematch(uuid, uuid, boolean) to anon;
