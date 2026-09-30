revoke all on function public.syh_cleanup_expired_rooms() from public;
revoke all on function public.syh_cleanup_expired_rooms() from anon;
revoke all on function public.syh_cleanup_expired_rooms() from authenticated;
grant execute on function public.syh_cleanup_expired_rooms() to service_role;
