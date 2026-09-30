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
  v_catalog jsonb;
  v_hidden_id text;
  v_index integer;
  v_winner text;
begin
  if p_state is null then return null; end if;

  v_catalog := coalesce(p_state->'catalog', '{}'::jsonb);
  v_winner := p_state #>> '{phase,winnerId}';

  for v_player in
    select value from jsonb_array_elements(coalesce(p_state->'players', '[]'::jsonb))
  loop
    v_visible :=
      (v_player->>'id' = p_viewer_id)
      or exists (
        select 1
        from jsonb_array_elements_text(
          coalesce(p_state->'revealedUntilTurnEnd', '[]'::jsonb)
        ) as revealed(player_id)
        where revealed.player_id = v_player->>'id'
      )
      or (
        (p_state #>> '{phase,type}') in ('round_over','match_over')
        and v_player->>'id' = v_winner
      );

    if not v_visible then
      v_hidden := '[]'::jsonb;
      for v_index in 1..jsonb_array_length(coalesce(v_player->'hand', '[]'::jsonb))
      loop
        v_hidden_id := format('__hidden_%s_%s', v_player->>'id', v_index);
        v_hidden := v_hidden || to_jsonb(v_hidden_id);
        v_catalog := jsonb_set(
          v_catalog,
          array[v_hidden_id],
          jsonb_build_object('id', v_hidden_id, 'kind', 'blank', 'art', '/cards/back.png'),
          true
        );
      end loop;
      v_player := jsonb_set(v_player, '{hand}', v_hidden, false);
    end if;

    v_players := v_players || jsonb_build_array(v_player);
  end loop;

  v_state := jsonb_set(v_state, '{players}', v_players, false);
  v_state := jsonb_set(v_state, '{catalog}', v_catalog, false);

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
