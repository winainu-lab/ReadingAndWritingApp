insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'supervisor@korat2.local', extensions.crypt('Supervisor1234!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"ศึกษานิเทศก์ตัวอย่าง"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'authenticated', 'authenticated', 'teacher@korat2.local', extensions.crypt('Teacher1234!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"ครูผู้ทดสอบตัวอย่าง"}', now(), now())
on conflict (id) do nothing;

update auth.users
set confirmation_token = '', recovery_token = '', email_change_token_new = '', email_change = '',
    phone_change = '', phone_change_token = '', reauthentication_token = '', email_change_token_current = ''
where id in ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('dbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"supervisor@korat2.local"}', 'email', now(), now(), now()),
  ('dccccccc-cccc-4ccc-8ccc-cccccccccccc', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","email":"teacher@korat2.local"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

update public.profiles set role = 'supervisor', status = 'approved' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
update public.profiles
set role = 'teacher', status = 'approved', school_id = (select id from public.schools where dmc_code = '30020001')
where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

with created_class as (
  insert into public.classrooms (school_id, grade_level, room_label, academic_year, student_count, created_by)
  values ((select id from public.schools where dmc_code = '30020001'), 'ป.1', 'ห้อง 1', 2569, 20, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
  returning id
)
insert into public.students (classroom_id, student_no, display_name)
select created_class.id, number, 'นักเรียนคนที่ ' || number::text from created_class, generate_series(1, 20) number;

insert into public.assessment_sessions (assessor_id, school_id, classroom_id, student_id, test_template_id, started_at, completed_at, duration_seconds, score, total_items, accuracy)
select
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', c.school_id, c.id, st.id, tt.id,
  now() - (st.student_no || ' days')::interval,
  now() - (st.student_no || ' days')::interval + interval '4 minutes',
  240,
  case st.student_no when 1 then 5 when 2 then 4 else 6 end,
  6,
  case st.student_no when 1 then 83.33 when 2 then 66.67 else 100 end
from public.classrooms c
join public.students st on st.classroom_id = c.id and st.student_no <= 3
cross join lateral (select id from public.test_templates order by created_at limit 1) tt
where c.created_by = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
