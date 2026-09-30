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

  select r.*
    into v_room
  from public.syh_rooms as r
  where r.code = upper(trim(p_code))
    and r.status = 'waiting'
    and r.expires_at > now()
  for update;

  if not found then
    raise exception 'Room not found or no longer joinable';
  end if;

  select count(*) into v_count
  from public.syh_room_players as rp
  where rp.room_id = v_room.id;

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

revoke all on function public.syh_join_room(text, text) from public;
grant execute on function public.syh_join_room(text, text) to anon, authenticated;
