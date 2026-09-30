revoke execute on function public.syh_create_room(text) from authenticated;
revoke execute on function public.syh_join_room(text, text) from authenticated;
revoke execute on function public.syh_get_room(text, uuid) from authenticated;
revoke execute on function public.syh_start_room(uuid, uuid, jsonb) from authenticated;
revoke execute on function public.syh_submit_state(uuid, uuid, bigint, jsonb, text) from authenticated;
revoke execute on function public.syh_leave_room(uuid, uuid) from authenticated;
