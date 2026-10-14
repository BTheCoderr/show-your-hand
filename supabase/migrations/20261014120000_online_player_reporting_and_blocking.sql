-- Show Your Hand: real report and block controls for anonymous online players.
-- Installation tokens are opaque, device-scoped bearer identifiers; they are
-- NEVER returned by the room projection or exposed to other participants.
-- A reinstall/new browser profile can bypass a device-level block. Full bans
-- require verified accounts in a later release.
alter table public.syh_room_players
  add column if not exists safety_install_id uuid;

create index if not exists syh_room_players_safety_id_idx
  on public.syh_room_players(safety_install_id)
  where safety_install_id is not null;

create table if not exists public.syh_player_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_install_id uuid not null,
  blocked_install_id uuid not null,
  blocked_room_code text not null,
  blocked_seat integer not null check (blocked_seat between 0 and 5),
  created_at timestamptz not null default now(),
  unique(blocker_install_id, blocked_install_id),
  constraint syh_cannot_block_self check (blocker_install_id <> blocked_install_id)
);

create index if not exists syh_blocks_blocked_idx on public.syh_player_blocks(blocked_install_id);

create table if not exists public.syh_player_reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  reporting_player_id uuid not null,
  reported_player_id uuid not null,
  reporting_install_id uuid,
  reported_install_id uuid,
  reason text not null check (reason in ('harassment', 'inappropriate_name', 'cheating', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check(reporting_player_id <> reported_player_id)
);

create index if not exists syh_reports_status_created_idx
  on public.syh_player_reports(status, created_at desc);

alter table public.syh_player_blocks enable row level security;
alter table public.syh_player_reports enable row level security;
revoke all on public.syh_player_blocks from public, anon, authenticated;
revoke all on public.syh_player_reports from public, anon, authenticated;
-- The backend service role can review and resolve reports in Supabase.
grant select, update, delete on public.syh_player_reports to service_role;
grant select, delete on public.syh_player_blocks to service_role;

-- Mint opaque, high-entropy IDs on the server so clients do not need an
-- extra native UUID dependency. This function returns only the caller's new ID.
create or replace function public.syh_issue_safety_id()
returns uuid
language sql volatile
set search_path = public, pg_temp
as $$
  select gen_random_uuid()
$$;

-- The "safe" room endpoints are distinct from the existing legacy RPCs so
-- existing web builds keep functioning while the clients are updated.
create or replace function public.syh_create_safe_room(p_safety_install_id uuid)
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
begin
  if p_safety_install_id is null then
    raise exception 'A safety ID is required for online play';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.syh_rooms(code, max_players) values (v_code, 2)
      returning * into v_room;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  insert into public.syh_room_players
    (room_id, seat, game_player_id, display_name, safety_install_id)
  values (v_room.id, 0, 'human', 'Player 1', p_safety_install_id)
  returning * into v_player;

  return query
    select v_room.id, v_room.code, v_player.id, v_player.player_token,
           v_player.seat, v_player.game_player_id, v_room.state_version;
end;
$$;

create or replace function public.syh_join_safe_room(
  p_code text, p_safety_install_id uuid
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

  select * into v_host from public.syh_room_players
   where room_id = v_room.id and seat = 0;
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

  select count(*) into v_count from public.syh_room_players
   where room_id = v_room.id;
  if v_count >= v_room.max_players then raise exception 'Room is full'; end if;

  insert into public.syh_room_players
    (room_id, seat, game_player_id, display_name, safety_install_id)
  values (v_room.id, 1, 'cpu-1', 'Player 2', p_safety_install_id)
  returning * into v_player;

  return query
    select v_room.id, v_room.code, v_player.id, v_player.player_token,
           v_player.seat, v_player.game_player_id, v_room.state_version;
end;
$$;

-- Prevent older clients from joining a modern protected room without an
-- identity. They must update to the current web/mobile app to join.
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

  select count(*) into v_count from public.syh_room_players
   where room_id = v_room.id;
  if v_count >= v_room.max_players then raise exception 'Room is full'; end if;

  insert into public.syh_room_players(room_id, seat, game_player_id, display_name)
  values (v_room.id, 1, 'cpu-1', v_name)
  returning * into v_player;

  return query
    select v_room.id, v_room.code, v_player.id, v_player.player_token,
           v_player.seat, v_player.game_player_id, v_room.state_version;
end;
$$;

-- All reports are tied to a valid, current room seat. The other player cannot
-- submit one as you. Limit one installation to 5 reports per room per 24h.
create or replace function public.syh_report_opponent(
  p_room_id uuid, p_player_token uuid, p_target_player_id uuid,
  p_reason text, p_details text default ''
)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_reporter public.syh_room_players%rowtype;
  v_target public.syh_room_players%rowtype;
  v_report_id uuid;
begin
  if p_reason not in ('harassment', 'inappropriate_name', 'cheating', 'other') then
    raise exception 'Choose a valid report reason';
  end if;
  select * into v_reporter from public.syh_room_players
   where room_id = p_room_id and player_token = p_player_token;
  if not found then raise exception 'Invalid room session'; end if;
  select * into v_target from public.syh_room_players
   where room_id = p_room_id and id = p_target_player_id
     and id <> v_reporter.id;
  if not found then raise exception 'Choose the opposing player'; end if;
  if (select count(*) from public.syh_player_reports
      where reporting_player_id = v_reporter.id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Report limit reached for this room';
  end if;

  insert into public.syh_player_reports (
    room_id, reporting_player_id, reported_player_id,
    reporting_install_id, reported_install_id, reason, details
  ) values (
    p_room_id, v_reporter.id, v_target.id,
    v_reporter.safety_install_id, v_target.safety_install_id,
    p_reason, left(trim(coalesce(p_details, '')), 500)
  ) returning id into v_report_id;
  return v_report_id;
end;
$$;

-- Blocking ends the current table and is enforced in future room joins.
create or replace function public.syh_block_opponent(
  p_room_id uuid, p_player_token uuid, p_target_player_id uuid
)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.syh_rooms%rowtype;
  v_reporter public.syh_room_players%rowtype;
  v_target public.syh_room_players%rowtype;
  v_block_id uuid;
begin
  select * into v_room from public.syh_rooms
   where id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  select * into v_reporter from public.syh_room_players
   where room_id = p_room_id and player_token = p_player_token;
  if not found then raise exception 'Invalid room session'; end if;
  select * into v_target from public.syh_room_players
   where room_id = p_room_id and id = p_target_player_id
     and id <> v_reporter.id;
  if not found then raise exception 'Choose the opposing player'; end if;

  if v_reporter.safety_install_id is null or v_target.safety_install_id is null then
    raise exception 'This player is using an older version. Please report them and leave the room';
  end if;

  insert into public.syh_player_blocks (
    blocker_install_id, blocked_install_id, blocked_room_code, blocked_seat
  ) values (
    v_reporter.safety_install_id, v_target.safety_install_id,
    v_room.code, v_target.seat
  )
  on conflict(blocker_install_id, blocked_install_id)
  do update set blocked_room_code = excluded.blocked_room_code,
                blocked_seat = excluded.blocked_seat
  returning id into v_block_id;

  -- A player who just blocked an opponent must not be forced into their match.
  update public.syh_rooms
     set status = 'abandoned', state_version = state_version + 1,
         updated_at = now()
   where id = p_room_id and status in ('waiting','in_game','completed');

  return v_block_id;
end;
$$;

-- Listing/unblocking is scoped by the installation's unguessable UUID.
-- This does not claim authentication equivalent to a verified account.
create or replace function public.syh_list_blocked_players(p_safety_install_id uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'roomCode', blocked_room_code,
    'playerLabel', 'PLAYER ' || (blocked_seat + 1)::text,
    'createdAt', created_at
  ) order by created_at desc), '[]'::jsonb)
  from (select id, blocked_room_code, blocked_seat, created_at
        from public.syh_player_blocks
        where blocker_install_id = p_safety_install_id
        order by created_at desc limit 100) recent
$$;

create or replace function public.syh_unblock_player(
  p_safety_install_id uuid, p_block_id uuid
)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.syh_player_blocks
  where id = p_block_id and blocker_install_id = p_safety_install_id;
  return found;
end;
$$;

revoke all on function public.syh_issue_safety_id() from public, authenticated;
revoke all on function public.syh_create_safe_room(uuid) from public, authenticated;
revoke all on function public.syh_join_safe_room(text,uuid) from public, authenticated;
revoke all on function public.syh_report_opponent(uuid,uuid,uuid,text,text) from public, authenticated;
revoke all on function public.syh_block_opponent(uuid,uuid,uuid) from public, authenticated;
revoke all on function public.syh_list_blocked_players(uuid) from public, authenticated;
revoke all on function public.syh_unblock_player(uuid,uuid) from public, authenticated;
revoke execute on function public.syh_join_room(text,text) from authenticated;
grant execute on function public.syh_issue_safety_id() to anon;
grant execute on function public.syh_create_safe_room(uuid) to anon;
grant execute on function public.syh_join_safe_room(text,uuid) to anon;
grant execute on function public.syh_report_opponent(uuid,uuid,uuid,text,text) to anon;
grant execute on function public.syh_block_opponent(uuid,uuid,uuid) to anon;
grant execute on function public.syh_list_blocked_players(uuid) to anon;
grant execute on function public.syh_unblock_player(uuid,uuid) to anon;
