alter table public.syh_rooms
  add column if not exists rematch_sequence integer not null default 0;

alter table public.syh_room_players
  add column if not exists ready boolean not null default false,
  add column if not exists rematch_ready boolean not null default false;

create or replace function public.syh_set_ready(
  p_room_id uuid,
  p_player_token uuid,
  p_ready boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.syh_rooms
    where id = p_room_id and status = 'waiting' and expires_at > now()
  ) then
    raise exception 'Room is not waiting';
  end if;

  update public.syh_room_players
  set ready = p_ready, last_seen_at = now()
  where room_id = p_room_id and player_token = p_player_token;

  if not found then raise exception 'Invalid room token'; end if;
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
  v_total integer;
  v_ready integer;
  v_reset boolean := false;
begin
  if not exists (
    select 1 from public.syh_rooms
    where id = p_room_id and status = 'completed'
  ) then
    raise exception 'Rematch is only available after a completed match';
  end if;

  update public.syh_room_players
  set rematch_ready = p_ready, last_seen_at = now()
  where room_id = p_room_id and player_token = p_player_token;

  if not found then raise exception 'Invalid room token'; end if;

  select count(*), count(*) filter (where rematch_ready)
    into v_total, v_ready
  from public.syh_room_players
  where room_id = p_room_id;

  if v_total = 2 and v_ready = 2 then
    update public.syh_rooms
    set status = 'waiting',
        game_state = null,
        state_version = state_version + 1,
        rematch_sequence = rematch_sequence + 1,
        updated_at = now(),
        expires_at = now() + interval '12 hours'
    where id = p_room_id;

    update public.syh_room_players
    set ready = true, rematch_ready = false, last_seen_at = now()
    where room_id = p_room_id;
    v_reset := true;
  end if;

  return jsonb_build_object('reset', v_reset);
end;
$$;

revoke all on function public.syh_set_ready(uuid, uuid, boolean) from public;
revoke all on function public.syh_request_rematch(uuid, uuid, boolean) from public;
grant execute on function public.syh_set_ready(uuid, uuid, boolean) to anon;
grant execute on function public.syh_request_rematch(uuid, uuid, boolean) to anon;
