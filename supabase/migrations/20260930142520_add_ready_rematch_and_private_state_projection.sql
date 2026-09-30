alter table public.syh_room_players
  add column if not exists ready boolean not null default false,
  add column if not exists rematch_ready boolean not null default false;

alter table public.syh_rooms
  add column if not exists rematch_sequence integer not null default 0;

create or replace function public.syh_project_state(p_state jsonb, p_viewer_id text)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_state jsonb := p_state;
  v_players jsonb := '[]'::jsonb;
  v_player jsonb;
  v_hidden jsonb;
  v_draw jsonb;
  v_visible boolean;
begin
  if p_state is null then
    return null;
  end if;

  for v_player in
    select value
    from jsonb_array_elements(coalesce(p_state->'players', '[]'::jsonb))
  loop
    v_visible :=
      (v_player->>'id' = p_viewer_id)
      or exists (
        select 1
        from jsonb_array_elements_text(
          coalesce(p_state->'revealedUntilTurnEnd', '[]'::jsonb)
        ) as revealed(player_id)
        where revealed.player_id = v_player->>'id'
      );

    if not v_visible then
      select coalesce(
        jsonb_agg(
          to_jsonb(format('__hidden_%s_%s', v_player->>'id', hand_card.ordinality))
          order by hand_card.ordinality
        ),
        '[]'::jsonb
      )
      into v_hidden
      from jsonb_array_elements(coalesce(v_player->'hand', '[]'::jsonb))
        with ordinality as hand_card(value, ordinality);

      v_player := jsonb_set(v_player, '{hand}', v_hidden, false);
    end if;

    v_players := v_players || jsonb_build_array(v_player);
  end loop;

  v_state := jsonb_set(v_state, '{players}', v_players, false);

  select coalesce(
    jsonb_agg(to_jsonb(format('__draw_%s', draw_card.ordinality)) order by draw_card.ordinality),
    '[]'::jsonb
  )
  into v_draw
  from jsonb_array_elements(coalesce(p_state->'drawPile', '[]'::jsonb))
    with ordinality as draw_card(value, ordinality);

  v_state := jsonb_set(v_state, '{drawPile}', v_draw, false);
  v_state := jsonb_set(v_state, '{rngState}', '0'::jsonb, false);

  return v_state;
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
  v_projected jsonb;
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
    and last_seen_at < now() - interval '8 seconds';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'seat', seat,
        'gamePlayerId', game_player_id,
        'displayName', display_name,
        'ready', ready,
        'rematchReady', rematch_ready,
        'joinedAt', joined_at,
        'lastSeenAt', last_seen_at
      )
      order by seat
    ),
    '[]'::jsonb
  )
  into v_players
  from public.syh_room_players
  where room_id = v_room.id;

  v_projected := public.syh_project_state(v_room.game_state, v_member.game_player_id);

  return jsonb_build_object(
    'id', v_room.id,
    'code', v_room.code,
    'status', v_room.status,
    'maxPlayers', v_room.max_players,
    'stateVersion', v_room.state_version,
    'gameState', v_projected,
    'players', v_players,
    'rematchSequence', v_room.rematch_sequence,
    'createdAt', v_room.created_at,
    'expiresAt', v_room.expires_at
  );
end;
$$;

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
declare
  v_status text;
begin
  select status into v_status
  from public.syh_rooms
  where id = p_room_id
    and expires_at > now();

  if not found then
    raise exception 'Room not found';
  end if;

  if v_status <> 'waiting' then
    raise exception 'Room is not waiting';
  end if;

  update public.syh_room_players
  set ready = p_ready,
      last_seen_at = now()
  where room_id = p_room_id
    and player_token = p_player_token;

  if not found then
    raise exception 'Invalid room token';
  end if;
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
    set ready = true,
        rematch_ready = false,
        last_seen_at = now()
    where room_id = p_room_id;

    v_reset := true;
  end if;

  return jsonb_build_object('reset', v_reset);
end;
$$;

revoke all on function public.syh_project_state(jsonb, text) from public;
revoke all on function public.syh_set_ready(uuid, uuid, boolean) from public;
revoke all on function public.syh_request_rematch(uuid, uuid, boolean) from public;

grant execute on function public.syh_set_ready(uuid, uuid, boolean) to anon;
grant execute on function public.syh_request_rematch(uuid, uuid, boolean) to anon;

revoke execute on function public.syh_start_room(uuid, uuid, jsonb) from anon, authenticated;
revoke execute on function public.syh_submit_state(uuid, uuid, bigint, jsonb, text) from anon, authenticated;
