-- District registration code: a teacher who signs up with the correct code is approved
-- immediately; everyone else still waits for an administrator. The code lives in a table
-- that only admins can read, so it never reaches anonymous visitors.
create table public.registration_settings (
  id text primary key default 'default' check (id = 'default'),
  teacher_code text not null,
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.registration_settings (id, teacher_code)
values ('default', upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)));

create trigger registration_settings_set_updated_at
before update on public.registration_settings
for each row execute function public.set_updated_at();

alter table public.registration_settings enable row level security;

create policy "admins manage registration settings"
on public.registration_settings for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

grant select, insert, update on public.registration_settings to authenticated;

create or replace function public.registration_code_matches(p_code text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.registration_settings
    where is_enabled
      and nullif(btrim(coalesce(p_code, '')), '') is not null
      and lower(teacher_code) = lower(btrim(p_code))
  )
$$;

-- Lets the signup form say "wrong code" before creating an account.
create or replace function public.check_registration_code(p_code text)
returns boolean
language sql
stable
security definer set search_path = public
as $$ select public.registration_code_matches(p_code) $$;

grant execute on function public.check_registration_code(text) to anon, authenticated;
revoke execute on function public.registration_code_matches(text) from public, anon, authenticated;

-- Unapproved or suspended accounts must not act with their role through the API.
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and status = 'approved' $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_school uuid;
  requested_role public.app_role;
  supplied_code text;
  auto_approved boolean := false;
begin
  begin
    requested_school := nullif(new.raw_user_meta_data ->> 'school_id', '')::uuid;
  exception when invalid_text_representation then
    requested_school := null;
  end;

  requested_role := case
    when new.raw_user_meta_data ->> 'requested_role' = 'supervisor' then 'supervisor'
    else 'teacher'
  end;

  if requested_role = 'teacher' and requested_school is null then
    raise exception 'กรุณาเลือกโรงเรียนสำหรับบัญชีครูผู้ทดสอบ';
  end if;

  -- The code only ever unlocks the teacher role; supervisors always wait for an admin.
  supplied_code := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'registration_code', '')), '');
  if supplied_code is not null and requested_role = 'teacher' then
    if not public.registration_code_matches(supplied_code) then
      raise exception 'รหัสสมัครไม่ถูกต้อง';
    end if;
    auto_approved := true;
  end if;

  insert into public.profiles (id, email, full_name, role, requested_role, status, school_id)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    'teacher',
    requested_role,
    case when auto_approved then 'approved'::public.profile_status else 'pending'::public.profile_status end,
    requested_school
  );
  return new;
end;
$$;
