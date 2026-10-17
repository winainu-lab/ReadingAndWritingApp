-- Reports used to be global for every signed-in user. They now respect scope:
--   admin / supervisor: every active school, filterable by district, network center and school
--   teacher:            only their own school, whatever filters are passed
create or replace function public.get_school_report(
  p_district text default null,
  p_network uuid default null,
  p_school uuid default null
)
returns table (
  school_id uuid,
  school_name text,
  district_name text,
  network_id uuid,
  network_name text,
  classroom_count bigint,
  student_count bigint,
  session_count bigint,
  accuracy numeric
)
language sql
stable
security definer set search_path = public
as $$
  select
    s.id,
    s.name,
    s.district,
    nc.id,
    nc.name,
    (select count(*) from public.classrooms c where c.school_id = s.id and c.archived_at is null),
    (select count(*) from public.students st join public.classrooms c on c.id = st.classroom_id
       where c.school_id = s.id and c.archived_at is null and st.is_active),
    (select count(*) from public.assessment_sessions a where a.school_id = s.id and a.completed_at is not null),
    coalesce((select round(avg(a.accuracy), 2) from public.assessment_sessions a where a.school_id = s.id and a.completed_at is not null), 0)
  from public.schools s
  join public.network_centers nc on nc.id = s.network_center_id
  where s.is_active
    and public.current_role() is not null
    and public.can_access_school(s.id)
    and (p_district is null or s.district = p_district)
    and (p_network is null or s.network_center_id = p_network)
    and (p_school is null or s.id = p_school)
  order by nc.sort_order, s.name
$$;

create or replace function public.get_network_report()
returns table (
  network_id uuid,
  network_name text,
  district_name text,
  school_count bigint,
  classroom_count bigint,
  student_count bigint,
  session_count bigint,
  accuracy numeric
)
language sql
stable
security definer set search_path = public
as $$
  select
    nc.id,
    nc.name,
    nc.district_name,
    count(r.school_id),
    coalesce(sum(r.classroom_count), 0)::bigint,
    coalesce(sum(r.student_count), 0)::bigint,
    coalesce(sum(r.session_count), 0)::bigint,
    coalesce(round(sum(r.accuracy * r.session_count) / nullif(sum(r.session_count), 0), 2), 0)
  from public.network_centers nc
  join public.get_school_report(null, null, null) r on r.network_id = nc.id
  group by nc.id, nc.name, nc.district_name, nc.sort_order
  order by nc.sort_order
$$;

create or replace function public.get_dashboard_summary()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  with report as (select * from public.get_school_report(null, null, null))
  select jsonb_build_object(
    'schools', (select count(*) from report),
    'networks', (select count(distinct network_id) from report),
    'classrooms', (select coalesce(sum(classroom_count), 0) from report),
    'students', (select coalesce(sum(student_count), 0) from report),
    'sessions', (select coalesce(sum(session_count), 0) from report),
    'completion_rate', (select coalesce(round(sum(accuracy * session_count) / nullif(sum(session_count), 0), 2), 0) from report),
    'network_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object('name', r.network_name, 'sessions', r.session_count, 'accuracy', r.accuracy))
      from public.get_network_report() r
    ), '[]'::jsonb),
    'recent_sessions', coalesce((
      select jsonb_agg(row_data) from (
        select jsonb_build_object('id', a.id, 'school_name', s.name, 'grade_level', c.grade_level, 'completed_at', a.completed_at, 'accuracy', a.accuracy) row_data
        from public.assessment_sessions a
        join public.schools s on s.id = a.school_id
        join public.classrooms c on c.id = a.classroom_id
        where a.completed_at is not null and public.can_access_school(a.school_id)
        order by a.completed_at desc
        limit 6
      ) latest
    ), '[]'::jsonb)
  )
  where public.current_role() is not null
$$;

grant execute on function public.get_school_report(text, uuid, uuid) to authenticated;
