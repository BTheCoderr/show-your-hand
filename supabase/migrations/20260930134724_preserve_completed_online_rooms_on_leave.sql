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

revoke all on function public.syh_leave_room(uuid, uuid) from public;
grant execute on function public.syh_leave_room(uuid, uuid) to anon, authenticated;
