-- Correct ambiguous room_id/seat references in deployed security-definer room RPCs.
-- This is a follow-up to the online_player_reporting_and_blocking migration.
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
  v_host public.syh_room_players%rowtype;
  v_player public.syh_room_players%rowtype;
  v_count integer;
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

  select rp.* into v_host from public.syh_room_players rp
   where rp.room_id = v_room.id and rp.seat = 0;
  if not found then raise exception 'Room host not found'; end if;

  if v_host.safety_install_id = p_safety_install_id then
    raise exception 'You cannot join your own room from this installation';
  end if;

  if v_host.safety_install_id is not null and exists (
    select 1 from public.syh_player_blocks b
     where (b.blocker_install_id = p_safety_install_id and b.blocked_install_id = v_host.safety_install_id)
        or (b.blocker_install_id = v_host.safety_install_id and b.blocked_install_id = p_safety_install_id)
  ) then
    raise exception 'This room is unavailable because a player is blocked';
  end if;

  select count(*) into v_count from public.syh_room_players rp
   where rp.room_id = v_room.id;
  if v_count >= v_room.max_players then raise exception 'Room is full'; end if;

  insert into public.syh_room_players
    (room_id, seat, game_player_id, display_name, safety_install_id)
  values (v_room.id, 1, 'cpu-1', left(coalesce(nullif(trim(p_display_name), ''), 'Player 2'), 24), p_safety_install_id)
  returning * into v_player;

  return query
    select v_room.id, v_room.code, v_player.id, v_player.player_token,
           v_player.seat, v_player.game_player_id, v_room.state_version;
end;
$$;

create or replace function public.syh_join_room(
  p_code text, p_display_name text default 'Player 2'
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
  v_name text;
  v_count integer;
begin
  v_name := left(trim(coalesce(nullif(p_display_name, ''), 'Player 2')), 24);

  select r.* into v_room
    from public.syh_rooms r
   where r.code = upper(trim(p_code)) and r.status = 'waiting'
     and r.expires_at > now()
   for update;
  if not found then raise exception 'Room not found or no longer joinable'; end if;

  if exists (
    select 1 from public.syh_room_players rp
    where rp.room_id = v_room.id and rp.seat = 0
      and rp.safety_install_id is not null
  ) then
    raise exception 'Please update Show Your Hand to join this protected room';
  end if;

  select count(*) into v_count from public.syh_room_players rp
   where rp.room_id = v_room.id;
  if v_count >= v_room.max_players then raise exception 'Room is full'; end if;

  insert into public.syh_room_players(room_id, seat, game_player_id, display_name)
  values (v_room.id, 1, 'cpu-1', v_name)
  returning * into v_player;

  return query
    select v_room.id, v_room.code, v_player.id, v_player.player_token,
           v_player.seat, v_player.game_player_id, v_room.state_version;
end;
$$;

revoke execute on function public.syh_join_safe_room(text,uuid,text) from public, authenticated;
grant execute on function public.syh_join_safe_room(text,uuid,text) to anon;
revoke execute on function public.syh_join_room(text,text) from authenticated;
