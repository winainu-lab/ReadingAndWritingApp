alter table public.profiles
  add column if not exists requested_role public.app_role not null default 'teacher';

update public.profiles
set requested_role = role
where requested_role = 'teacher' and role in ('admin', 'supervisor');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_school uuid;
  requested_role public.app_role;
begin
  begin
    requested_school := nullif(new.raw_user_meta_data ->> 'school_id', '')::uuid;
  exception when invalid_text_representation then
    requested_school := null;
  end;

  -- A public signup can request supervisor review, but it never receives
  -- supervisor privileges until an administrator approves the profile.
  requested_role := case
    when new.raw_user_meta_data ->> 'requested_role' = 'supervisor' then 'supervisor'
    else 'teacher'
  end;

  if requested_role = 'teacher' and requested_school is null then
    raise exception 'กรุณาเลือกโรงเรียนสำหรับบัญชีครูผู้ทดสอบ';
  end if;

  insert into public.profiles (id, email, full_name, role, requested_role, status, school_id)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    'teacher',
    requested_role,
    'pending',
    requested_school
  );
  return new;
end;
$$;
