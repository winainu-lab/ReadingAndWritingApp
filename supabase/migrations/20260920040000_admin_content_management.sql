alter table public.profiles
  add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

alter table public.words
  add column pronunciation text;

alter table public.test_templates
  add column archived_at timestamptz;

alter table public.classrooms
  add column archived_at timestamptz;

create index test_templates_active_idx
  on public.test_templates (archived_at, created_at desc);

create index classrooms_active_idx
  on public.classrooms (archived_at, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_school uuid;
begin
  begin
    requested_school := nullif(new.raw_user_meta_data ->> 'school_id', '')::uuid;
  exception when invalid_text_representation then
    requested_school := null;
  end;

  insert into public.profiles (id, email, full_name, role, status, school_id)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    'teacher',
    'pending',
    requested_school
  );
  return new;
end;
$$;

drop policy "authorized users manage classrooms" on public.classrooms;

create policy "authorized users create classrooms"
on public.classrooms for insert to authenticated
with check (public.can_access_school(school_id) and created_by = auth.uid());

create policy "classroom owners update classrooms"
on public.classrooms for update to authenticated
using (created_by = auth.uid() or public.current_role() = 'admin')
with check (public.can_access_school(school_id));

create or replace function public.archive_own_classroom(p_classroom_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  owner_id uuid;
begin
  select created_by into owner_id
  from public.classrooms
  where id = p_classroom_id;

  if owner_id is null then
    raise exception 'ไม่พบห้องที่ต้องการลบ';
  end if;

  if owner_id <> auth.uid() and public.current_role() <> 'admin' then
    raise exception 'ลบได้เฉพาะห้องที่คุณสร้าง';
  end if;

  update public.classrooms
  set archived_at = now()
  where id = p_classroom_id;
end;
$$;

create or replace function public.update_test_template_from_skill(
  p_test_id uuid,
  p_title text,
  p_description text,
  p_skill_id uuid,
  p_duration_seconds integer,
  p_item_count integer,
  p_is_published boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  previous_skill_id uuid;
  previous_item_count integer;
  actual_count integer;
  has_results boolean;
begin
  if auth.uid() is null or public.current_role() not in ('admin', 'supervisor') then
    raise exception 'ไม่มีสิทธิ์แก้ไขแบบทดสอบ';
  end if;
  if p_item_count < 3 or p_item_count > 50 then
    raise exception 'จำนวนข้อต้องอยู่ระหว่าง 3 ถึง 50';
  end if;
  if p_duration_seconds < 60 or p_duration_seconds > 3600 then
    raise exception 'ระยะเวลาไม่ถูกต้อง';
  end if;

  select skill_id, item_count into previous_skill_id, previous_item_count
  from public.test_templates
  where id = p_test_id and archived_at is null;

  if not found then
    raise exception 'ไม่พบแบบทดสอบที่ต้องการแก้ไข';
  end if;

  select exists (
    select 1 from public.assessment_sessions where test_template_id = p_test_id
  ) into has_results;

  if has_results and (previous_skill_id is distinct from p_skill_id or previous_item_count <> p_item_count) then
    raise exception 'แบบทดสอบนี้มีผลประเมินแล้ว แก้ทักษะหรือจำนวนคำไม่ได้ กรุณาสร้างแบบทดสอบใหม่';
  end if;

  update public.test_templates
  set title = trim(p_title),
      description = nullif(trim(p_description), ''),
      skill_id = p_skill_id,
      duration_seconds = p_duration_seconds,
      is_published = p_is_published
  where id = p_test_id;

  if not has_results then
    delete from public.test_template_items where test_template_id = p_test_id;

    insert into public.test_template_items (test_template_id, word_id, prompt, position)
    select p_test_id, selected.id, selected.display_text, row_number() over ()
    from (
      select w.id, w.display_text
      from public.words w
      join public.word_skills ws on ws.word_id = w.id
      where ws.skill_id = p_skill_id and w.is_active
      order by random()
      limit p_item_count
    ) selected;

    select count(*) into actual_count
    from public.test_template_items
    where test_template_id = p_test_id;

    if actual_count < 1 then
      raise exception 'ยังไม่มีคำในทักษะที่เลือก';
    end if;

    update public.test_templates
    set item_count = actual_count
    where id = p_test_id;
  end if;
end;
$$;

create or replace function public.archive_test_template(p_test_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.current_role() not in ('admin', 'supervisor') then
    raise exception 'ไม่มีสิทธิ์ลบแบบทดสอบ';
  end if;

  update public.test_templates
  set archived_at = now(), is_published = false
  where id = p_test_id and archived_at is null;

  if not found then
    raise exception 'ไม่พบแบบทดสอบที่ต้องการลบ';
  end if;
end;
$$;

drop function public.admin_update_profile(uuid, public.app_role, public.profile_status);

create or replace function public.admin_update_profile(
  p_profile_id uuid,
  p_role public.app_role,
  p_status public.profile_status,
  p_school_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if public.current_role() <> 'admin' then
    raise exception 'เฉพาะผู้ดูแลระบบ';
  end if;
  if p_role = 'teacher' and p_school_id is null then
    raise exception 'บัญชีครูต้องระบุโรงเรียน';
  end if;

  update public.profiles
  set role = p_role, status = p_status, school_id = p_school_id
  where id = p_profile_id;
end;
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
    count(distinct s.id),
    count(distinct c.id),
    count(distinct st.id),
    count(distinct a.id),
    coalesce(round(avg(a.accuracy), 2), 0)
  from public.network_centers nc
  left join public.schools s on s.network_center_id = nc.id and s.is_active
  left join public.classrooms c on c.school_id = s.id and c.archived_at is null
  left join public.students st on st.classroom_id = c.id and st.is_active
  left join public.assessment_sessions a on a.classroom_id = c.id and a.completed_at is not null
  where auth.uid() is not null
  group by nc.id, nc.name, nc.district_name, nc.sort_order
  order by nc.sort_order;
$$;

create or replace function public.get_dashboard_summary()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'schools', (select count(*) from public.schools where is_active),
    'networks', (select count(*) from public.network_centers),
    'classrooms', (select count(*) from public.classrooms where archived_at is null),
    'students', (
      select count(*)
      from public.students st
      join public.classrooms c on c.id = st.classroom_id
      where st.is_active and c.archived_at is null
    ),
    'sessions', (select count(*) from public.assessment_sessions where completed_at is not null),
    'completion_rate', coalesce((select round(avg(accuracy), 2) from public.assessment_sessions where completed_at is not null), 0),
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
        where a.completed_at is not null
        order by a.completed_at desc
        limit 6
      ) latest
    ), '[]'::jsonb)
  ) where auth.uid() is not null;
$$;

grant execute on function public.archive_own_classroom(uuid) to authenticated;
grant execute on function public.update_test_template_from_skill(uuid,text,text,uuid,integer,integer,boolean) to authenticated;
grant execute on function public.archive_test_template(uuid) to authenticated;
grant execute on function public.admin_update_profile(uuid,public.app_role,public.profile_status,uuid) to authenticated;
