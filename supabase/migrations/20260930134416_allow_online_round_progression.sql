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

revoke all on function public.syh_submit_state(uuid, uuid, bigint, jsonb, text) from public;
grant execute on function public.syh_submit_state(uuid, uuid, bigint, jsonb, text) to anon, authenticated;
