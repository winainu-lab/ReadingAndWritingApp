-- Top up B31 to 50 words (see 20260924010000_extend_late_vocabulary.sql).
with extra(word, pronunciation, syllable_count) as (values
  ('ทรยศ', 'ทอ-ระ-ยด', 3),
  ('บรมราชา', 'บอ-รม-มะ-ราด-ชา', 5),
  ('จระเข้', 'จอ-ระ-เข้', 3),
  ('มรสุม', 'มอ-ระ-สุม', 3)
), inserted as (
  insert into public.words (display_text, normalized_text, pronunciation, syllable_count, difficulty, source_note)
  select word, word, pronunciation, syllable_count, 3, 'เพิ่มตามกฎของบทในแบบเรียนเร็วใหม่ เล่ม ๑ ตอนปลาย (รอครูตรวจทาน)'
  from extra e
  where not exists (select 1 from public.words w where w.normalized_text = e.word)
  returning id
)
select count(*) from inserted;

insert into public.word_skills (word_id, skill_id)
select w.id, s.id
from public.words w, public.skills s
where s.code = 'B31' and w.normalized_text in ('ทรยศ', 'บรมราชา', 'จระเข้', 'มรสุม')
on conflict do nothing;
