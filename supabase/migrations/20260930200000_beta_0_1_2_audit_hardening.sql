-- Beta 0.1.2 audit hardening:
-- - separate per-match stats from cumulative room stats
-- - enforce the 60-second reconnect grace period
-- - keep cumulative stats across rematches
-- - remove legacy client-state RPCs
-- - schedule expired-room cleanup
-- - re-state the canonical room projection so a fresh project matches production

create table if not exists public.syh_match_player_stats (
  room_id uuid not null references public.syh_rooms(id) on delete cascade,
  rematch_sequence integer not null,
  game_player_id text not null,
  attacks_played integer not null default 0,
  defenses_played integer not null default 0,
  blank_defenses integer not null default 0,
  rounds_won integer not null default 0,
  specials_played integer not null default 0,
  match_wins integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (room_id, rematch_sequence, game_player_id)
);

alter table public.syh_match_player_stats enable row level security;
revoke all on public.syh_match_player_stats from anon, authenticated;

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
  v_other_timed_out boolean := false;
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
    and last_seen_at < now() - interval '2 seconds';

  if v_room.status = 'in_game' then
    select exists (
      select 1
      from public.syh_room_players rp
      where rp.room_id = v_room.id
        and rp.id <> v_member.id
        and rp.last_seen_at <= now() - interval '60 seconds'
    )
    into v_other_timed_out;

    if v_other_timed_out then
      update public.syh_rooms
      set status = 'abandoned',
          updated_at = now()
      where id = v_room.id
        and status = 'in_game';

      v_room.status := 'abandoned';
      v_room.updated_at := now();
    end if;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', rp.id,
        'seat', rp.seat,
        'gamePlayerId', rp.game_player_id,
        'displayName', rp.display_name,
        'ready', rp.ready,
        'rematchReady', rp.rematch_ready,
        'joinedAt', rp.joined_at,
        'lastSeenAt', rp.last_seen_at,
        'connected', rp.last_seen_at > now() - interval '15 seconds',
        'disconnectGraceSeconds',
          greatest(
            0,
            60 - floor(extract(epoch from (now() - rp.last_seen_at)))::integer
          ),
        'stats', jsonb_build_object(
          'attacksPlayed', coalesce(total_stats.attacks_played, 0),
          'defensesPlayed', coalesce(total_stats.defenses_played, 0),
          'blankDefenses', coalesce(total_stats.blank_defenses, 0),
          'roundsWon', coalesce(total_stats.rounds_won, 0),
          'specialsPlayed', coalesce(total_stats.specials_played, 0),
          'matchWins', coalesce(total_stats.match_wins, 0)
        ),
        'matchStats', jsonb_build_object(
          'attacksPlayed', coalesce(match_stats.attacks_played, 0),
          'defensesPlayed', coalesce(match_stats.defenses_played, 0),
          'blankDefenses', coalesce(match_stats.blank_defenses, 0),
          'roundsWon', coalesce(match_stats.rounds_won, 0),
          'specialsPlayed', coalesce(match_stats.specials_played, 0),
          'matchWins', coalesce(match_stats.match_wins, 0)
        )
      )
      order by rp.seat
    ),
    '[]'::jsonb
  )
  into v_players
  from public.syh_room_players rp
  left join public.syh_room_player_stats total_stats
    on total_stats.room_id = rp.room_id
   and total_stats.game_player_id = rp.game_player_id
  left join public.syh_match_player_stats match_stats
    on match_stats.room_id = rp.room_id
   and match_stats.rematch_sequence = v_room.rematch_sequence
   and match_stats.game_player_id = rp.game_player_id
  where rp.room_id = v_room.id;

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
    'mode', v_room.mode,
    'beginnerMode', v_room.beginner_mode,
    'matchStartedAt', v_room.match_started_at,
    'createdAt', v_room.created_at,
    'expiresAt', v_room.expires_at
  );
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
        match_started_at = null,
        updated_at = now(),
        expires_at = now() + interval '12 hours'
    where id = p_room_id;

    update public.syh_room_players
    set ready = false,
        rematch_ready = false,
        last_seen_at = now()
    where room_id = p_room_id;

    -- Cumulative room stats intentionally survive rematches.
    -- The next authoritative start creates fresh syh_match_player_stats rows.
    v_reset := true;
  end if;

  return jsonb_build_object('reset', v_reset);
end;
$$;

-- These legacy RPCs accepted browser-provided game state. The live client no
-- longer uses them; remove them entirely so they cannot drift back into use.
drop function if exists public.syh_start_room(uuid, uuid, jsonb);
drop function if exists public.syh_submit_state(uuid, uuid, bigint, jsonb, text);

create or replace function public.syh_cleanup_expired_rooms()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted bigint;
begin
  delete from public.syh_rooms
  where expires_at < now();

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.syh_cleanup_expired_rooms() from public;
grant execute on function public.syh_cleanup_expired_rooms() to service_role;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname = 'syh-expired-room-cleanup'
  loop
    perform cron.unschedule(v_jobid);
  end loop;

  perform cron.schedule(
    'syh-expired-room-cleanup',
    '17 * * * *',
    'select public.syh_cleanup_expired_rooms();'
  );
end $$;
