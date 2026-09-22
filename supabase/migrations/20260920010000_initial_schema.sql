create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'supervisor', 'teacher');
create type public.profile_status as enum ('pending', 'approved', 'suspended');
create type public.response_outcome as enum ('correct', 'incorrect', 'self_corrected', 'skipped');

create table public.network_centers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  district_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  dmc_code text not null unique,
  moe_code text,
  name text not null,
  subdistrict text,
  district text not null,
  network_center_id uuid not null references public.network_centers(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'teacher',
  status public.profile_status not null default 'pending',
  school_id uuid references public.schools(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  level_code text not null,
  description text,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table public.words (
  id uuid primary key default gen_random_uuid(),
  display_text text not null,
  normalized_text text not null,
  meaning text,
  syllable_count integer not null default 1 check (syllable_count > 0),
  consonant_class text,
  vowel_pattern text,
  final_pattern text,
  tone_name text,
  is_meaningful boolean not null default true,
  orthography_status text not null default 'current',
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  source_note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.word_skills (
  word_id uuid not null references public.words(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (word_id, skill_id)
);

create table public.test_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  skill_id uuid references public.skills(id),
  duration_seconds integer not null check (duration_seconds between 30 and 3600),
  item_count integer not null default 0 check (item_count between 0 and 100),
  is_published boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.test_template_items (
  id uuid primary key default gen_random_uuid(),
  test_template_id uuid not null references public.test_templates(id) on delete cascade,
  word_id uuid references public.words(id),
  prompt text not null,
  item_type text not null default 'word_read',
  position integer not null,
  points numeric(6,2) not null default 1,
  unique (test_template_id, position)
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  grade_level text not null,
  room_label text not null,
  academic_year integer not null,
  student_count integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (school_id, grade_level, room_label, academic_year)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_no integer not null check (student_no > 0),
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (classroom_id, student_no)
);

create table public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  assessor_id uuid not null references public.profiles(id),
  school_id uuid not null references public.schools(id),
  classroom_id uuid not null references public.classrooms(id),
  student_id uuid not null references public.students(id),
  test_template_id uuid not null references public.test_templates(id),
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_seconds integer not null default 0,
  score numeric(8,2) not null default 0,
  total_items integer not null default 0,
  accuracy numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_session_id uuid not null references public.assessment_sessions(id) on delete cascade,
  test_template_item_id uuid not null references public.test_template_items(id),
  outcome public.response_outcome not null,
  response_time_ms integer,
  note text,
  created_at timestamptz not null default now(),
  unique (assessment_session_id, test_template_item_id)
);

create index schools_network_idx on public.schools(network_center_id);
create index profiles_school_idx on public.profiles(school_id);
create index classrooms_school_idx on public.classrooms(school_id);
create index students_classroom_idx on public.students(classroom_id);
create index sessions_school_idx on public.assessment_sessions(school_id);
create index sessions_completed_idx on public.assessment_sessions(completed_at desc);
create index responses_session_idx on public.assessment_responses(assessment_session_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schools_set_updated_at before update on public.schools for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger tests_set_updated_at before update on public.test_templates for each row execute function public.set_updated_at();

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

  insert into public.profiles (id, full_name, role, status, school_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    'teacher',
    'pending',
    requested_school
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$ select school_id from public.profiles where id = auth.uid() $$;

create or replace function public.can_access_school(target_school_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    public.current_role() in ('admin', 'supervisor')
    or (public.current_role() = 'teacher' and public.current_school_id() = target_school_id),
    false
  )
$$;

create or replace function public.create_classroom_with_students(
  p_school_id uuid,
  p_grade_level text,
  p_room_label text,
  p_student_count integer,
  p_academic_year integer
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare new_classroom_id uuid;
begin
  if auth.uid() is null or not public.can_access_school(p_school_id) then raise exception 'ไม่มีสิทธิ์สร้างห้องในโรงเรียนนี้'; end if;
  if p_student_count < 1 or p_student_count > 60 then raise exception 'จำนวนนักเรียนต้องอยู่ระหว่าง 1 ถึง 60'; end if;

  insert into public.classrooms (school_id, grade_level, room_label, academic_year, student_count, created_by)
  values (p_school_id, trim(p_grade_level), trim(p_room_label), p_academic_year, p_student_count, auth.uid())
  returning id into new_classroom_id;

  insert into public.students (classroom_id, student_no, display_name)
  select new_classroom_id, number, 'นักเรียนคนที่ ' || number::text
  from generate_series(1, p_student_count) as number;
  return new_classroom_id;
end;
$$;

create or replace function public.create_test_template_from_skill(
  p_title text,
  p_description text,
  p_skill_id uuid,
  p_duration_seconds integer,
  p_item_count integer
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare new_test_id uuid; actual_count integer;
begin
  if auth.uid() is null or public.current_role() not in ('admin', 'supervisor') then raise exception 'ไม่มีสิทธิ์สร้างแบบทดสอบ'; end if;
  if p_item_count < 3 or p_item_count > 50 then raise exception 'จำนวนข้อต้องอยู่ระหว่าง 3 ถึง 50'; end if;
  if p_duration_seconds < 60 or p_duration_seconds > 3600 then raise exception 'ระยะเวลาไม่ถูกต้อง'; end if;

  insert into public.test_templates (title, description, skill_id, duration_seconds, item_count, created_by)
  values (trim(p_title), nullif(trim(p_description), ''), p_skill_id, p_duration_seconds, 0, auth.uid())
  returning id into new_test_id;

  insert into public.test_template_items (test_template_id, word_id, prompt, position)
  select new_test_id, selected.id, selected.display_text, row_number() over ()
  from (
    select w.id, w.display_text
    from public.words w join public.word_skills ws on ws.word_id = w.id
    where ws.skill_id = p_skill_id and w.is_active
    order by random() limit p_item_count
  ) selected;

  select count(*) into actual_count from public.test_template_items where test_template_id = new_test_id;
  if actual_count < 1 then raise exception 'ยังไม่มีคำในทักษะที่เลือก'; end if;
  update public.test_templates set item_count = actual_count where id = new_test_id;
  return new_test_id;
end;
$$;

create or replace function public.admin_update_profile(p_profile_id uuid, p_role public.app_role, p_status public.profile_status)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if public.current_role() <> 'admin' then raise exception 'เฉพาะผู้ดูแลระบบ'; end if;
  update public.profiles set role = p_role, status = p_status where id = p_profile_id;
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
  left join public.classrooms c on c.school_id = s.id
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
    'classrooms', (select count(*) from public.classrooms),
    'students', (select count(*) from public.students where is_active),
    'sessions', (select count(*) from public.assessment_sessions where completed_at is not null),
    'completion_rate', coalesce((select round(avg(accuracy), 2) from public.assessment_sessions where completed_at is not null), 0),
    'network_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object('name', r.network_name, 'sessions', r.session_count, 'accuracy', r.accuracy))
      from public.get_network_report() r
    ), '[]'::jsonb),
    'recent_sessions', coalesce((
      select jsonb_agg(row_data) from (
        select jsonb_build_object('id', a.id, 'school_name', s.name, 'grade_level', c.grade_level, 'completed_at', a.completed_at, 'accuracy', a.accuracy) row_data
        from public.assessment_sessions a join public.schools s on s.id = a.school_id join public.classrooms c on c.id = a.classroom_id
        where a.completed_at is not null order by a.completed_at desc limit 6
      ) latest
    ), '[]'::jsonb)
  ) where auth.uid() is not null;
$$;

alter table public.network_centers enable row level security;
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.words enable row level security;
alter table public.word_skills enable row level security;
alter table public.test_templates enable row level security;
alter table public.test_template_items enable row level security;
alter table public.classrooms enable row level security;
alter table public.students enable row level security;
alter table public.assessment_sessions enable row level security;
alter table public.assessment_responses enable row level security;

create policy "reference networks are readable" on public.network_centers for select to anon, authenticated using (true);
create policy "active schools are public" on public.schools for select to anon using (is_active);
create policy "schools are readable by signed in users" on public.schools for select to authenticated using (is_active or public.current_role() = 'admin');
create policy "admins manage schools" on public.schools for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "users read own profile or admins read all" on public.profiles for select to authenticated using (id = auth.uid() or public.current_role() = 'admin');
create policy "admins update profiles" on public.profiles for update to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "skills readable" on public.skills for select to authenticated using (true);
create policy "content managers manage skills" on public.skills for all to authenticated using (public.current_role() in ('admin','supervisor')) with check (public.current_role() in ('admin','supervisor'));
create policy "words readable" on public.words for select to authenticated using (true);
create policy "content managers manage words" on public.words for all to authenticated using (public.current_role() in ('admin','supervisor')) with check (public.current_role() in ('admin','supervisor'));
create policy "word skills readable" on public.word_skills for select to authenticated using (true);
create policy "content managers manage word skills" on public.word_skills for all to authenticated using (public.current_role() in ('admin','supervisor')) with check (public.current_role() in ('admin','supervisor'));
create policy "tests readable" on public.test_templates for select to authenticated using (is_published or public.current_role() in ('admin','supervisor'));
create policy "content managers manage tests" on public.test_templates for all to authenticated using (public.current_role() in ('admin','supervisor')) with check (public.current_role() in ('admin','supervisor'));
create policy "test items readable" on public.test_template_items for select to authenticated using (true);
create policy "content managers manage test items" on public.test_template_items for all to authenticated using (public.current_role() in ('admin','supervisor')) with check (public.current_role() in ('admin','supervisor'));
create policy "authorized users read classrooms" on public.classrooms for select to authenticated using (public.can_access_school(school_id));
create policy "authorized users manage classrooms" on public.classrooms for all to authenticated using (public.can_access_school(school_id)) with check (public.can_access_school(school_id));
create policy "authorized users read students" on public.students for select to authenticated using (exists (select 1 from public.classrooms c where c.id = classroom_id and public.can_access_school(c.school_id)));
create policy "authorized users manage students" on public.students for all to authenticated using (exists (select 1 from public.classrooms c where c.id = classroom_id and public.can_access_school(c.school_id))) with check (exists (select 1 from public.classrooms c where c.id = classroom_id and public.can_access_school(c.school_id)));
create policy "authorized users read sessions" on public.assessment_sessions for select to authenticated using (public.can_access_school(school_id));
create policy "authorized users create sessions" on public.assessment_sessions for insert to authenticated with check (assessor_id = auth.uid() and public.can_access_school(school_id));
create policy "authorized users update sessions" on public.assessment_sessions for update to authenticated using (assessor_id = auth.uid() or public.current_role() in ('admin','supervisor')) with check (public.can_access_school(school_id));
create policy "authorized users read responses" on public.assessment_responses for select to authenticated using (exists (select 1 from public.assessment_sessions a where a.id = assessment_session_id and public.can_access_school(a.school_id)));
create policy "assessors create responses" on public.assessment_responses for insert to authenticated with check (exists (select 1 from public.assessment_sessions a where a.id = assessment_session_id and a.assessor_id = auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.network_centers to anon, authenticated;
grant select on public.schools to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.create_classroom_with_students(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.create_test_template_from_skill(text,text,uuid,integer,integer) to authenticated;
grant execute on function public.admin_update_profile(uuid,public.app_role,public.profile_status) to authenticated;
grant execute on function public.get_network_report() to authenticated;
grant execute on function public.get_dashboard_summary() to authenticated;
