-- Tests now come in two scopes:
--   central: written by admins/supervisors for the whole district; teachers see them only when
--            published, and can start them only inside the optional availability window.
--   school:  written by a teacher; visible and usable only inside that teacher's school.
-- A test can mix several skills and carries any title, not necessarily a skill name.
alter table public.test_templates
  add column scope text not null default 'central' check (scope in ('central', 'school')),
  add column school_id uuid references public.schools(id),
  add column available_from timestamptz,
  add column available_until timestamptz,
  add constraint test_templates_scope_school check ((scope = 'school') = (school_id is not null)),
  add constraint test_templates_window_order check (available_from is null or available_until is null or available_until > available_from);

create index test_templates_school_idx on public.test_templates (school_id) where school_id is not null;

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
        and p_started_at > now() - interval '2 hours'
        and (t.available_from is null or p_started_at >= t.available_from)
        and (t.available_until is null or p_started_at <= t.available_until)
    end
    from public.test_templates t
    where t.id = p_test_id
  ), false)
$$;

grant execute on function public.can_take_test(uuid, timestamptz) to authenticated;

drop policy "tests readable" on public.test_templates;
create policy "tests readable by scope" on public.test_templates for select to authenticated using (
  public.current_role() in ('admin', 'supervisor')
  or (public.current_role() = 'teacher' and (
    (scope = 'central' and is_published)
    or (scope = 'school' and school_id = public.current_school_id())
  ))
);

drop policy "authorized users create sessions" on public.assessment_sessions;
create policy "authorized users create sessions" on public.assessment_sessions for insert to authenticated
with check (
  assessor_id = auth.uid()
  and public.can_access_school(school_id)
  and public.can_take_test(test_template_id, started_at)
);

create or replace function public.fill_test_template_items(p_test_id uuid, p_skills jsonb)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare actual_count integer;
begin
  delete from public.test_template_items where test_template_id = p_test_id;

  with wanted as (
    select (entry ->> 'skill_id')::uuid as skill_id, (entry ->> 'count')::integer as cnt
    from jsonb_array_elements(p_skills) entry
  ), ranked as (
    select w.id, w.display_text, wanted.cnt,
           row_number() over (partition by wanted.skill_id order by random()) as rn
    from wanted
    join public.word_skills ws on ws.skill_id = wanted.skill_id
    join public.words w on w.id = ws.word_id and w.is_active
  ), chosen as (
    select distinct on (id) id, display_text from ranked where rn <= cnt order by id
  )
  insert into public.test_template_items (test_template_id, word_id, prompt, position)
  select p_test_id, id, display_text, row_number() over (order by random())
  from chosen;

  select count(*) into actual_count from public.test_template_items where test_template_id = p_test_id;
  if actual_count < 1 then raise exception 'ยังไม่มีคำในทักษะที่เลือก'; end if;
  update public.test_templates set item_count = actual_count where id = p_test_id;
  return actual_count;
end;
$$;
revoke execute on function public.fill_test_template_items(uuid, jsonb) from public, anon, authenticated;

create or replace function public.validate_test_skills(p_skills jsonb)
returns void
language plpgsql
immutable
as $$
declare entry jsonb; wanted integer; total integer := 0;
begin
  if p_skills is null or jsonb_typeof(p_skills) <> 'array' or jsonb_array_length(p_skills) = 0 then
    raise exception 'กรุณาเลือกอย่างน้อย 1 ทักษะ';
  end if;
  for entry in select * from jsonb_array_elements(p_skills) loop
    wanted := (entry ->> 'count')::integer;
    if (entry ->> 'skill_id') is null or wanted is null or wanted < 1 or wanted > 50 then
      raise exception 'จำนวนคำของแต่ละทักษะต้องอยู่ระหว่าง 1 ถึง 50';
    end if;
    total := total + wanted;
  end loop;
  if total < 3 or total > 100 then raise exception 'จำนวนคำรวมต้องอยู่ระหว่าง 3 ถึง 100'; end if;
end;
$$;

create or replace function public.create_test_template_mixed(
  p_title text,
  p_description text,
  p_duration_seconds integer,
  p_skills jsonb,
  p_is_published boolean default true,
  p_available_from timestamptz default null,
  p_available_until timestamptz default null
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
    scope, school_id, is_published, available_from, available_until
  ) values (
    btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), only_skill, p_duration_seconds, 0, auth.uid(),
    case when caller_role = 'teacher' then 'school' else 'central' end,
    case when caller_role = 'teacher' then caller_school else null end,
    case when caller_role = 'teacher' then true else coalesce(p_is_published, true) end,
    case when caller_role = 'teacher' then null else p_available_from end,
    case when caller_role = 'teacher' then null else p_available_until end
  ) returning id into new_test_id;

  perform public.fill_test_template_items(new_test_id, p_skills);
  return new_test_id;
end;
$$;

-- p_skills = null keeps the existing words (the only option once results exist).
create or replace function public.update_test_template_mixed(
  p_test_id uuid,
  p_title text,
  p_description text,
  p_duration_seconds integer,
  p_skills jsonb,
  p_is_published boolean default true,
  p_available_from timestamptz default null,
  p_available_until timestamptz default null
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
      skill_id = case when p_skills is null then skill_id
                      when jsonb_array_length(p_skills) = 1 then (p_skills -> 0 ->> 'skill_id')::uuid
                      else null end
  where id = p_test_id;

  if p_skills is not null then perform public.fill_test_template_items(p_test_id, p_skills); end if;
end;
$$;

create or replace function public.archive_test_template(p_test_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role public.app_role := public.current_role();
  target public.test_templates;
begin
  select * into target from public.test_templates where id = p_test_id and archived_at is null;
  if not found then raise exception 'ไม่พบแบบทดสอบที่ต้องการลบ'; end if;
  if caller_role is null
     or not (caller_role in ('admin', 'supervisor') or (caller_role = 'teacher' and target.scope = 'school' and target.created_by = auth.uid())) then
    raise exception 'ไม่มีสิทธิ์ลบแบบทดสอบนี้';
  end if;
  update public.test_templates set archived_at = now(), is_published = false where id = p_test_id;
end;
$$;

grant execute on function public.create_test_template_mixed(text, text, integer, jsonb, boolean, timestamptz, timestamptz) to authenticated;
grant execute on function public.update_test_template_mixed(uuid, text, text, integer, jsonb, boolean, timestamptz, timestamptz) to authenticated;
