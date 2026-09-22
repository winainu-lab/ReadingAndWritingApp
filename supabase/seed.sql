insert into public.network_centers (code, name, district_name, sort_order) values
  ('CKR-1', 'จักราช 1', 'จักราช', 1),
  ('CKR-2', 'จักราช 2', 'จักราช', 2),
  ('CKR-3', 'จักราช 3', 'จักราช', 3),
  ('CKR-4', 'จักราช 4', 'จักราช', 4),
  ('CPK-1', 'เฉลิมพระเกียรติ 1', 'เฉลิมพระเกียรติ', 5),
  ('CPK-2', 'เฉลิมพระเกียรติ 2', 'เฉลิมพระเกียรติ', 6),
  ('CC-1', 'โชคชัย 1', 'โชคชัย', 7),
  ('CC-2', 'โชคชัย 2', 'โชคชัย', 8),
  ('CC-3', 'โชคชัย 3', 'โชคชัย', 9),
  ('CC-4', 'โชคชัย 4', 'โชคชัย', 10),
  ('NBM-1', 'หนองบุญมาก 1', 'หนองบุญมาก', 11),
  ('NBM-2', 'หนองบุญมาก 2', 'หนองบุญมาก', 12),
  ('NBM-3', 'หนองบุญมาก 3', 'หนองบุญมาก', 13),
  ('HTL-1', 'ห้วยแถลง 1', 'ห้วยแถลง', 14),
  ('HTL-2', 'ห้วยแถลง 2', 'ห้วยแถลง', 15),
  ('HTL-3', 'ห้วยแถลง 3', 'ห้วยแถลง', 16),
  ('HTL-4', 'ห้วยแถลง 4', 'ห้วยแถลง', 17)
on conflict (code) do update set name = excluded.name, district_name = excluded.district_name, sort_order = excluded.sort_order;

insert into public.skills (code, name, level_code, description, sort_order) values
  ('B01', 'อักษรกลางประสมสระพื้นฐาน ไม่มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 1', 1),
  ('B02', 'ผันวรรณยุกต์อักษรกลาง ไม่มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 2', 2),
  ('B03', 'อักษรสูงประสมสระพื้นฐาน ไม่มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 3', 3),
  ('B04', 'ผันวรรณยุกต์อักษรสูง', 'ป.1 ตอนต้น', 'บทที่ 4', 4),
  ('B05', 'อักษรต่ำประสมสระพื้นฐาน', 'ป.1 ตอนต้น', 'บทที่ 5', 5),
  ('B06', 'ผันวรรณยุกต์อักษรต่ำ', 'ป.1 ตอนต้น', 'บทที่ 6', 6),
  ('B07', 'อักษรกลาง มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 7', 7),
  ('B08', 'อักษรสูง มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 8', 8),
  ('B09', 'อักษรต่ำ มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 9', 9),
  ('B10', 'สระเอ แอ โอ ออ ไม่มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 10', 10),
  ('B11', 'สระเอ แอ โอ ออ มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 11', 11),
  ('B12', 'สระอัว เอีย เอือ เออ ไม่มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 12', 12),
  ('B13', 'สระอัว เอีย เอือ เออ มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 13', 13),
  ('B14', 'สระอำ ใอ ไอ เอา', 'ป.1 ตอนต้น', 'บทที่ 14', 14),
  ('B15', 'เปรียบเทียบสระสั้นยาว ไม่มีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 15', 15),
  ('B16', 'คำเป็นคำตายและคำมีตัวสะกด', 'ป.1 ตอนต้น', 'บทที่ 16', 16),
  ('B17', 'ห นำ ไม่มีตัวสะกด', 'ป.2 ตอนกลาง', 'บทที่ 17', 17),
  ('B18', 'ห นำ มีตัวสะกด และ อ นำ', 'ป.2 ตอนกลาง', 'บทที่ 18', 18),
  ('B19', 'อักษรสูงและอักษรกลางนำ ไม่มีตัวสะกด', 'ป.2 ตอนกลาง', 'บทที่ 19', 19),
  ('B20', 'อักษรสูงและอักษรกลางนำ มีตัวสะกด', 'ป.2 ตอนกลาง', 'บทที่ 20', 20),
  ('B21', 'คำควบกล้ำ ไม่มีตัวสะกด', 'ป.2 ตอนกลาง', 'บทที่ 21', 21),
  ('B22', 'คำควบกล้ำ มีตัวสะกดและควบไม่แท้', 'ป.2 ตอนกลาง', 'บทที่ 22', 22),
  ('B23', 'คำไม่ประวิสรรชนีย์', 'ป.2 ตอนกลาง', 'บทที่ 23', 23),
  ('B24', 'ทบทวนพยัญชนะและอักษรสามหมู่', 'ป.2 ตอนกลาง', 'บทที่ 24', 24)
on conflict (code) do update set name = excluded.name, level_code = excluded.level_code, description = excluded.description, sort_order = excluded.sort_order;

with source(skill_code, items) as (values
  ('B01', array['กา','ตา','ปู','ดี','จะ','บิดา']),
  ('B02', array['กา','ก่า','ก้า','ก๊า','ก๋า','ป่า']),
  ('B03', array['ขา','ผี','ฝา','สี่','หู','ฉี']),
  ('B04', array['ข่า','ข้า','ผ่า','ผ้า','สู่','สู้']),
  ('B05', array['คา','งู','นา','มา','ยา','เรา']),
  ('B06', array['ค่า','ค้า','น่า','น้า','มู่','มู้']),
  ('B07', array['กิน','จาน','ดิน','ตาก','บ้าน','เป็ด']),
  ('B08', array['ขน','ขาด','ฝน','ผัก','หิน','สิบ']),
  ('B09', array['คน','นก','ลม','งาน','มด','รัก']),
  ('B10', array['เกะ','เก','แกะ','โก','เกาะ','พอ']),
  ('B11', array['เป็น','เด็ก','แกง','โคม','นอน','ชอบ']),
  ('B12', array['บัว','เสีย','เรือ','เจอ','ตัว','เพื่อ']),
  ('B13', array['สวน','เรียน','เดือน','เดิน','เตือน','เลือก']),
  ('B14', array['คำ','ใจ','ไป','เขา','น้ำ','ไก่']),
  ('B15', array['กะ','กา','มิ','มี','ดุ','ดู']),
  ('B16', array['นอน','ลม','รัก','ภาพ','เด็ก','บ้าน']),
  ('B17', array['หนา','หมู','หวี','หล่อ','ไหม','หญิง']),
  ('B18', array['หนึ่ง','หวาน','หมอน','อย่า','อยู่','อย่าง']),
  ('B19', array['ขยะ','ถนน','ฉลาด','สนุก','จมูก','ตลาด']),
  ('B20', array['ขนม','สมุด','สนับสนุน','อร่อย','ตลก','ขยัน']),
  ('B21', array['ปลา','กวาง','ครู','กลัว','พราว','ขวา']),
  ('B22', array['กราบ','พร้อม','คลอง','สร้าง','จริง','ทราย']),
  ('B23', array['สบาย','ทหาร','ขนาด','ฉลาด','ตลาด','สนุก']),
  ('B24', array['กอ','ขอ','คอ','งอ','จอ','ฉอ'])
), expanded as (
  select skill_code, unnest(items) as word from source
)
insert into public.words (display_text, normalized_text, difficulty, source_note)
select distinct word, word, greatest(1, least(5, ceil(length(word)::numeric / 2)::integer)), 'ตัวอย่างคำตามลำดับทักษะแบบเรียนเร็วใหม่ เล่ม 1'
from expanded;

with source(skill_code, items) as (values
  ('B01', array['กา','ตา','ปู','ดี','จะ','บิดา']),
  ('B02', array['กา','ก่า','ก้า','ก๊า','ก๋า','ป่า']),
  ('B03', array['ขา','ผี','ฝา','สี่','หู','ฉี']),
  ('B04', array['ข่า','ข้า','ผ่า','ผ้า','สู่','สู้']),
  ('B05', array['คา','งู','นา','มา','ยา','เรา']),
  ('B06', array['ค่า','ค้า','น่า','น้า','มู่','มู้']),
  ('B07', array['กิน','จาน','ดิน','ตาก','บ้าน','เป็ด']),
  ('B08', array['ขน','ขาด','ฝน','ผัก','หิน','สิบ']),
  ('B09', array['คน','นก','ลม','งาน','มด','รัก']),
  ('B10', array['เกะ','เก','แกะ','โก','เกาะ','พอ']),
  ('B11', array['เป็น','เด็ก','แกง','โคม','นอน','ชอบ']),
  ('B12', array['บัว','เสีย','เรือ','เจอ','ตัว','เพื่อ']),
  ('B13', array['สวน','เรียน','เดือน','เดิน','เตือน','เลือก']),
  ('B14', array['คำ','ใจ','ไป','เขา','น้ำ','ไก่']),
  ('B15', array['กะ','กา','มิ','มี','ดุ','ดู']),
  ('B16', array['นอน','ลม','รัก','ภาพ','เด็ก','บ้าน']),
  ('B17', array['หนา','หมู','หวี','หล่อ','ไหม','หญิง']),
  ('B18', array['หนึ่ง','หวาน','หมอน','อย่า','อยู่','อย่าง']),
  ('B19', array['ขยะ','ถนน','ฉลาด','สนุก','จมูก','ตลาด']),
  ('B20', array['ขนม','สมุด','สนับสนุน','อร่อย','ตลก','ขยัน']),
  ('B21', array['ปลา','กวาง','ครู','กลัว','พราว','ขวา']),
  ('B22', array['กราบ','พร้อม','คลอง','สร้าง','จริง','ทราย']),
  ('B23', array['สบาย','ทหาร','ขนาด','ฉลาด','ตลาด','สนุก']),
  ('B24', array['กอ','ขอ','คอ','งอ','จอ','ฉอ'])
), expanded as (
  select skill_code, unnest(items) as word from source
)
insert into public.word_skills (word_id, skill_id)
select w.id, s.id
from expanded e
join public.words w on w.normalized_text = e.word
join public.skills s on s.code = e.skill_code
on conflict do nothing;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'authenticated', 'authenticated', 'admin@korat2.local',
  extensions.crypt('Admin1234!', extensions.gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{"full_name":"ผู้ดูแลระบบเขตพื้นที่"}', now(), now()
)
on conflict (id) do nothing;

update auth.users
set confirmation_token = '', recovery_token = '', email_change_token_new = '', email_change = '',
    phone_change = '', phone_change_token = '', reauthentication_token = '', email_change_token_current = ''
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  'daaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"admin@korat2.local"}',
  'email', now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

update public.profiles set role = 'admin', status = 'approved' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

with template_data(title, description, skill_code, duration_seconds, item_limit) as (values
  ('อ่านคำพื้นฐาน ป.1', 'ประเมินการอ่านคำพยัญชนะอักษรกลางประสมสระพื้นฐาน', 'B01', 300, 6),
  ('อ่านคำมีตัวสะกด', 'ประเมินการอ่านคำพื้นฐานที่มีตัวสะกด', 'B07', 300, 6),
  ('อ่านคำ ห นำ', 'ประเมินการอ่านคำที่ใช้ ห นำ', 'B17', 360, 6),
  ('อ่านคำควบกล้ำ', 'ประเมินการอ่านคำควบกล้ำพื้นฐาน', 'B21', 360, 6)
), new_templates as (
  insert into public.test_templates (title, description, skill_id, duration_seconds, item_count, is_published, created_by)
  select t.title, t.description, s.id, t.duration_seconds, t.item_limit, true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  from template_data t join public.skills s on s.code = t.skill_code
  returning id, title, skill_id
)
insert into public.test_template_items (test_template_id, word_id, prompt, position)
select nt.id, selected.word_id, selected.display_text, selected.position
from new_templates nt
cross join lateral (
  select w.id word_id, w.display_text, row_number() over (order by w.display_text) position
  from public.words w join public.word_skills ws on ws.word_id = w.id
  where ws.skill_id = nt.skill_id
  order by w.display_text limit 6
) selected;
