revoke execute on function public.syh_actor_id(jsonb) from anon, authenticated;
revoke execute on function public.syh_project_state(jsonb, text) from anon, authenticated;
revoke execute on function public.syh_commit_authoritative_state(uuid, bigint, jsonb) from anon, authenticated;
revoke execute on function public.syh_start_room(uuid, uuid, jsonb) from anon, authenticated;
revoke execute on function public.syh_submit_state(uuid, uuid, bigint, jsonb, text) from anon, authenticated;

revoke execute on function public.syh_create_room(text) from authenticated;
revoke execute on function public.syh_join_room(text, text) from authenticated;
revoke execute on function public.syh_get_room(text, uuid) from authenticated;
revoke execute on function public.syh_leave_room(uuid, uuid) from authenticated;
revoke execute on function public.syh_set_ready(uuid, uuid, boolean) from authenticated;
revoke execute on function public.syh_set_room_options(uuid, uuid, boolean, text) from authenticated;
revoke execute on function public.syh_request_rematch(uuid, uuid, boolean) from authenticated;

grant execute on function public.syh_actor_id(jsonb) to service_role;
grant execute on function public.syh_project_state(jsonb, text) to service_role;
grant execute on function public.syh_commit_authoritative_state(uuid, bigint, jsonb) to service_role;
