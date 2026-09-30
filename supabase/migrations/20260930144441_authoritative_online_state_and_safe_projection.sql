create or replace function public.syh_commit_authoritative_state(
  p_room_id uuid,
  p_expected_version bigint,
  p_game_state jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.syh_rooms%rowtype;
  v_new_version bigint;
begin
  select * into v_room
  from public.syh_rooms
  where id = p_room_id
  for update;

  if not found then raise exception 'Room not found'; end if;
  if v_room.status <> 'in_game' then raise exception 'Room is not in an active game'; end if;
  if v_room.state_version <> p_expected_version then raise exception 'STALE_STATE'; end if;

  update public.syh_rooms
  set game_state = p_game_state,
      status = case
        when p_game_state #>> '{phase,type}' = 'match_over' then 'completed'
        else 'in_game'
      end,
      state_version = state_version + 1,
      updated_at = now()
  where id = p_room_id
  returning state_version into v_new_version;

  return v_new_version;
end;
$$;

revoke all on function public.syh_submit_state(uuid, uuid, bigint, jsonb, text) from anon, authenticated;
revoke all on function public.syh_start_room(uuid, uuid, jsonb) from anon, authenticated;
revoke all on function public.syh_commit_authoritative_state(uuid, bigint, jsonb) from public;
grant execute on function public.syh_commit_authoritative_state(uuid, bigint, jsonb) to service_role;
