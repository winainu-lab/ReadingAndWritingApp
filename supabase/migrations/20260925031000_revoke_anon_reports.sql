-- Reports are for signed-in users only; PUBLIC execute is the Postgres default for new functions.
revoke execute on function public.get_school_report(text, uuid, uuid) from public, anon;
revoke execute on function public.get_network_report() from public, anon;
revoke execute on function public.get_dashboard_summary() from public, anon;
