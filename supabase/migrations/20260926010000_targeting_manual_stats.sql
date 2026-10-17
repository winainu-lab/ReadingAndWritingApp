-- 1. Dashboard summary gets the same district / network / school filters as the report.
drop function public.get_dashboard_summary();

create or replace function public.get_dashboard_summary(
  p_district text default null,
  p_network uuid default null,
  p_school uuid default null
)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  with report as (select * from public.get_school_report(p_district, p_network, p_school))
  select jsonb_build_object(
    'schools', (select count(*) from report),
    'networks', (select count(distinct network_id) from report),
    'classrooms', (select coalesce(sum(classroom_count), 0) from report),
    'students', (select coalesce(sum(student_count), 0) from report),
    'sessions', (select coalesce(sum(session_count), 0) from report),
    'completion_rate', (select coalesce(round(sum(accuracy * session_count) / nullif(sum(session_count), 0), 2), 0) from report),
    'network_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object('name', g.network_name, 'sessions', g.sessions, 'accuracy', g.accuracy) order by g.sort_order)
      from (
        select r.network_name, nc.sort_order,
               sum(r.session_count) as sessions,
               coalesce(round(sum(r.accuracy * r.session_count) / nullif(sum(r.session_count), 0), 2), 0) as accuracy
        from report r join public.network_centers nc on nc.id = r.network_id
        group by r.network_name, nc.sort_order
      ) g
    ), '[]'::jsonb),
    'recent_sessions', coalesce((
      select jsonb_agg(row_data) from (
        select jsonb_build_object('id', a.id, 'school_name', s.name, 'grade_level', c.grade_level, 'completed_at', a.completed_at, 'accuracy', a.accuracy) row_data
        from public.assessment_sessions a
        join public.schools s on s.id = a.school_id
        join public.classrooms c on c.id = a.classroom_id
        where a.completed_at is not null and a.school_id in (select school_id from report)
        order by a.completed_at desc
        limit 6
      ) latest
    ), '[]'::jsonb)
  )
  where public.current_role() is not null
$$;

revoke execute on function public.get_dashboard_summary(text, uuid, uuid) from public, anon;
grant execute on function public.get_dashboard_summary(text, uuid, uuid) to authenticated;

-- 2. Central tests can be limited to chosen districts and/or network centers.
--    No targets at all means every school.
alter table public.test_templates
  add column target_districts text[],
  add column target_network_ids uuid[];

create or replace function public.test_targets_school(p_test public.test_templates, p_school_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select (coalesce(cardinality(p_test.target_districts), 0) = 0 and coalesce(cardinality(p_test.target_network_ids), 0) = 0)
    or exists (
      select 1 from public.schools s
      where s.id = p_school_id
        and (s.district = any(coalesce(p_test.target_districts, '{}'))
             or s.network_center_id = any(coalesce(p_test.target_network_ids, '{}')))
    )
$$;

drop policy "tests readable by scope" on public.test_templates;
create policy "tests readable by scope" on public.test_templates for select to authenticated using (
  public.current_role() in ('admin', 'supervisor')
  or (public.current_role() = 'teacher' and (
    (scope = 'central' and is_published and public.test_targets_school(test_templates, public.current_school_id()))
    or (scope = 'school' and school_id = public.current_school_id())
  ))
);

create or replace function public.can_take_test(p_test_id uuid, p_started_at timestamptz default now())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((
    select case
      when public.current_role() is null or t.archived_at is not null then false
      when public.current_role() in ('admin', 'supervisor') then true
      when t.scope = 'school' then t.school_id = public.current_school_id()
      else t.is_published
        and public.test_targets_school(t, public.current_school_id())
        and p_started_at > now() - interval '2 hours'
        and (t.available_from is null or p_started_at >= t.available_from)
        and (t.available_until is null or p_started_at <= t.available_until)
    end
    from public.test_templates t
    where t.id = p_test_id
  ), false)
$$;

drop function public.create_test_template_mixed(text, text, integer, jsonb, boolean, timestamptz, timestamptz);
create or replace function public.create_test_template_mixed(
  p_title text,
  p_description text,
  p_duration_seconds integer,
  p_skills jsonb,
  p_is_published boolean default true,
  p_available_from timestamptz default null,
  p_available_until timestamptz default null,
  p_target_districts text[] default null,
  p_target_networks uuid[] default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role public.app_role := public.current_role();
  caller_school uuid := public.current_school_id();
  new_test_id uuid;
  only_skill uuid;
begin
  if auth.uid() is null or caller_role is null then raise exception 'ไม่มีสิทธิ์สร้างแบบทดสอบ'; end if;
  if caller_role = 'teacher' and caller_school is null then raise exception 'บัญชีครูต้องระบุโรงเรียนก่อนสร้างแบบทดสอบ'; end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null then raise exception 'กรุณาระบุชื่อแบบทดสอบ'; end if;
  if p_duration_seconds < 60 or p_duration_seconds > 3600 then raise exception 'ระยะเวลาไม่ถูกต้อง'; end if;
  perform public.validate_test_skills(p_skills);

  if jsonb_array_length(p_skills) = 1 then only_skill := (p_skills -> 0 ->> 'skill_id')::uuid; end if;

  insert into public.test_templates (
    title, description, skill_id, duration_seconds, item_count, created_by,
    scope, school_id, is_published, available_from, available_until, target_districts, target_network_ids
  ) values (
    btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), only_skill, p_duration_seconds, 0, auth.uid(),
    case when caller_role = 'teacher' then 'school' else 'central' end,
    case when caller_role = 'teacher' then caller_school else null end,
    case when caller_role = 'teacher' then true else coalesce(p_is_published, true) end,
    case when caller_role = 'teacher' then null else p_available_from end,
    case when caller_role = 'teacher' then null else p_available_until end,
    case when caller_role = 'teacher' or coalesce(cardinality(p_target_districts), 0) = 0 then null else p_target_districts end,
    case when caller_role = 'teacher' or coalesce(cardinality(p_target_networks), 0) = 0 then null else p_target_networks end
  ) returning id into new_test_id;

  perform public.fill_test_template_items(new_test_id, p_skills);
  return new_test_id;
end;
$$;

drop function public.update_test_template_mixed(uuid, text, text, integer, jsonb, boolean, timestamptz, timestamptz);
create or replace function public.update_test_template_mixed(
  p_test_id uuid,
  p_title text,
  p_description text,
  p_duration_seconds integer,
  p_skills jsonb,
  p_is_published boolean default true,
  p_available_from timestamptz default null,
  p_available_until timestamptz default null,
  p_target_districts text[] default null,
  p_target_networks uuid[] default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role public.app_role := public.current_role();
  target public.test_templates;
begin
  select * into target from public.test_templates where id = p_test_id and archived_at is null;
  if not found then raise exception 'ไม่พบแบบทดสอบที่ต้องการแก้ไข'; end if;
  if caller_role is null
     or not (caller_role in ('admin', 'supervisor') or (caller_role = 'teacher' and target.scope = 'school' and target.created_by = auth.uid())) then
    raise exception 'ไม่มีสิทธิ์แก้ไขแบบทดสอบนี้';
  end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null then raise exception 'กรุณาระบุชื่อแบบทดสอบ'; end if;
  if p_duration_seconds < 60 or p_duration_seconds > 3600 then raise exception 'ระยะเวลาไม่ถูกต้อง'; end if;

  if p_skills is not null then
    if exists (select 1 from public.assessment_sessions where test_template_id = p_test_id) then
      raise exception 'แบบทดสอบนี้มีผลประเมินแล้ว แก้ชุดคำไม่ได้ กรุณาสร้างแบบทดสอบใหม่';
    end if;
    perform public.validate_test_skills(p_skills);
  end if;

  update public.test_templates
  set title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      duration_seconds = p_duration_seconds,
      is_published = case when target.scope = 'school' then true else coalesce(p_is_published, true) end,
      available_from = case when target.scope = 'school' then null else p_available_from end,
      available_until = case when target.scope = 'school' then null else p_available_until end,
      target_districts = case when target.scope = 'school' or coalesce(cardinality(p_target_districts), 0) = 0 then null else p_target_districts end,
      target_network_ids = case when target.scope = 'school' or coalesce(cardinality(p_target_networks), 0) = 0 then null else p_target_networks end,
      skill_id = case when p_skills is null then skill_id
                      when jsonb_array_length(p_skills) = 1 then (p_skills -> 0 ->> 'skill_id')::uuid
                      else null end
  where id = p_test_id;

  if p_skills is not null then perform public.fill_test_template_items(p_test_id, p_skills); end if;
end;
$$;

grant execute on function public.create_test_template_mixed(text, text, integer, jsonb, boolean, timestamptz, timestamptz, text[], uuid[]) to authenticated;
grant execute on function public.update_test_template_mixed(uuid, text, text, integer, jsonb, boolean, timestamptz, timestamptz, text[], uuid[]) to authenticated;

-- 3. Link to the user manual (a Google Drive PDF), shown from the landing page and app menu.
alter table public.app_settings add column manual_url text;

-- 4. Lightweight visit statistics. One counter row per day and page group: a visit costs a
--    single upsert, nothing is stored per visitor, and the browser dedupes to one call per
--    session, so database growth is a few rows per day regardless of traffic.
create table public.site_visit_stats (
  day date not null,
  page text not null check (page in ('landing', 'learn', 'resources', 'app')),
  visits integer not null default 0,
  new_visitors integer not null default 0,
  primary key (day, page)
);

alter table public.site_visit_stats enable row level security;
revoke all on public.site_visit_stats from anon, authenticated;

create or replace function public.record_visit(p_page text, p_new_visitor boolean default false)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_page not in ('landing', 'learn', 'resources', 'app') then return; end if;
  insert into public.site_visit_stats as stats (day, page, visits, new_visitors)
  values ((now() at time zone 'Asia/Bangkok')::date, p_page, 1, case when coalesce(p_new_visitor, false) then 1 else 0 end)
  on conflict (day, page) do update
    set visits = stats.visits + 1,
        new_visitors = stats.new_visitors + case when coalesce(p_new_visitor, false) then 1 else 0 end;
end;
$$;

grant execute on function public.record_visit(text, boolean) to anon, authenticated;

create or replace function public.get_visit_stats(p_days integer default 30)
returns table (day date, page text, visits integer, new_visitors integer)
language sql
stable
security definer set search_path = public
as $$
  select s.day, s.page, s.visits, s.new_visitors
  from public.site_visit_stats s
  where public.current_role() = 'admin'
    and s.day > (now() at time zone 'Asia/Bangkok')::date - greatest(1, least(coalesce(p_days, 30), 365))
  order by s.day, s.page
$$;

revoke execute on function public.get_visit_stats(integer) from public, anon;
grant execute on function public.get_visit_stats(integer) to authenticated;

-- Account activity comes straight from sign-in times Supabase already keeps; no extra writes.
create or replace function public.get_user_activity()
returns jsonb
language sql
stable
security definer set search_path = public, auth
as $$
  select jsonb_build_object(
    'total', count(*),
    'pending', count(*) filter (where p.status = 'pending'),
    'suspended', count(*) filter (where p.status = 'suspended'),
    'admins', count(*) filter (where p.status = 'approved' and p.role = 'admin'),
    'supervisors', count(*) filter (where p.status = 'approved' and p.role = 'supervisor'),
    'teachers', count(*) filter (where p.status = 'approved' and p.role = 'teacher'),
    'active_today', count(*) filter (where u.last_sign_in_at >= date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'),
    'active_7d', count(*) filter (where u.last_sign_in_at >= now() - interval '7 days'),
    'active_30d', count(*) filter (where u.last_sign_in_at >= now() - interval '30 days')
  )
  from public.profiles p
  join auth.users u on u.id = p.id
  having public.current_role() = 'admin'
$$;

revoke execute on function public.get_user_activity() from public, anon;
grant execute on function public.get_user_activity() to authenticated;
