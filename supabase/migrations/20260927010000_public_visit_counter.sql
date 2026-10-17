-- Public visitor counter on the landing page, switchable by an admin.
alter table public.app_settings add column show_visit_counter boolean not null default true;

-- Website visits only (landing, learning mode, documents). Sign-ins to the app and test
-- usage are not part of this number. Returns null when the admin has hidden the counter.
create or replace function public.get_public_visit_summary()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select case
    when (select show_visit_counter from public.app_settings where id = 'default') then (
      select jsonb_build_object(
        'total', coalesce(sum(s.visits), 0),
        'today', coalesce(sum(s.visits) filter (where s.day = (now() at time zone 'Asia/Bangkok')::date), 0)
      )
      from public.site_visit_stats s
      where s.page in ('landing', 'learn', 'resources')
    )
  end
$$;

grant execute on function public.get_public_visit_summary() to anon, authenticated;
