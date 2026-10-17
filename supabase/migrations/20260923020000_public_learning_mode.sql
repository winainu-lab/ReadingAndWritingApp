-- Learning mode (/learn) works without signing in, so the practice vocabulary must
-- be readable by anonymous visitors. Only skills, active words and their links are
-- exposed; schools, classrooms, students and assessment data stay behind RLS.
grant select on public.skills, public.words, public.word_skills to anon;

create policy "skills are public for learning mode" on public.skills for select to anon using (true);
create policy "active words are public for learning mode" on public.words for select to anon using (is_active);
create policy "word skills are public for learning mode" on public.word_skills for select to anon using (true);
