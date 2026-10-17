import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, Play, RotateCcw, Shuffle, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button, EmptyState, LoadingState } from '../components/ui'
import { getBrandLogoUrl, useAppSettings } from '../hooks/useAppSettings'
import { supabase } from '../lib/supabase'
import type { Skill, VocabularyWord } from '../types/app'

type Verdict = 'correct' | 'practice'
type SyllableFilter = 'all' | '1' | '2' | '3'

function shuffled<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

export function LearnPage() {
  const { session } = useAuth()
  const { settings } = useAppSettings()
  const logoUrl = getBrandLogoUrl(settings.logo_path)
  const [skillId, setSkillId] = useState('')
  const [syllables, setSyllables] = useState<SyllableFilter>('all')
  const [shuffleWords, setShuffleWords] = useState(true)
  const [showPronunciation, setShowPronunciation] = useState(true)
  const [deck, setDeck] = useState<VocabularyWord[] | null>(null)
  const [position, setPosition] = useState(0)
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
  const [finished, setFinished] = useState(false)

  const skills = useQuery({
    queryKey: ['public-skills'],
    queryFn: async () => {
      const { data, error } = await supabase.from('skills').select('id,code,name,level_code,description,sort_order').order('sort_order')
      if (error) throw error
      return data as Skill[]
    },
  })
  const words = useQuery({
    queryKey: ['public-skill-words', skillId],
    enabled: Boolean(skillId),
    queryFn: async () => {
      const { data, error } = await supabase.from('word_skills').select('word:words(id,display_text,normalized_text,pronunciation,syllable_count,difficulty,source_note,is_active)').eq('skill_id', skillId)
      if (error) throw error
      return (data as unknown as { word: VocabularyWord | null }[]).map((row) => row.word).filter((word): word is VocabularyWord => Boolean(word?.is_active))
    },
  })

  const levels = useMemo(() => {
    const groups = new Map<string, Skill[]>()
    for (const skill of skills.data ?? []) groups.set(skill.level_code, [...(groups.get(skill.level_code) ?? []), skill])
    return [...groups.entries()]
  }, [skills.data])
  const selectedSkill = skills.data?.find((skill) => skill.id === skillId)
  const candidates = useMemo(() => (words.data ?? []).filter((word) => syllables === 'all' || (syllables === '3' ? word.syllable_count >= 3 : word.syllable_count === Number(syllables))), [words.data, syllables])

  const start = (source: VocabularyWord[]) => {
    setDeck(shuffleWords ? shuffled(source) : [...source].sort((a, b) => a.display_text.localeCompare(b.display_text, 'th')))
    setPosition(0)
    setVerdicts({})
    setFinished(false)
  }
  const mark = (verdict: Verdict) => {
    if (!deck) return
    setVerdicts((value) => ({ ...value, [deck[position].id]: verdict }))
    if (position < deck.length - 1) setPosition(position + 1)
    else setFinished(true)
  }
  const leave = () => { setDeck(null); setFinished(false) }

  useEffect(() => {
    if (!deck || finished) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setPosition((value) => Math.min(deck.length - 1, value + 1))
      if (event.key === 'ArrowLeft') setPosition((value) => Math.max(0, value - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck, finished])

  if (deck && !finished) {
    const word = deck[position]
    return <main className="learn-page learn-page--practice">
      <section className="runner">
        <header className="runner__header"><div><p>โหมดเรียนรู้ · ไม่บันทึกผล</p><strong>{selectedSkill?.code} · {selectedSkill?.name}</strong></div><button className="learn-exit" onClick={leave}><X size={18} /> ออก</button></header>
        <div className="runner__progress"><span style={{ width: `${((position + 1) / deck.length) * 100}%` }} /></div>
        <div className="runner__stage">
          <p className="eyebrow">คำที่ {position + 1} จาก {deck.length}</p>
          <div className="reading-prompt" lang="th">{word.display_text}</div>
          {showPronunciation && <p className="learn-pronunciation"><Volume2 size={18} /> {word.pronunciation || 'ไม่มีคำอ่านกำกับ'}</p>}
        </div>
        <footer className="runner__controls runner__controls--two">
          <button className="score-button score-button--wrong" onClick={() => mark('practice')}><X /> ต้องฝึกเพิ่ม</button>
          <button className="score-button score-button--correct" onClick={() => mark('correct')}><Check /> อ่านถูก</button>
        </footer>
        <div className="runner__bottom">
          <button disabled={position === 0} onClick={() => setPosition(position - 1)}><ChevronLeft /> ก่อนหน้า</button>
          <label className="learn-toggle"><input type="checkbox" checked={showPronunciation} onChange={(event) => setShowPronunciation(event.target.checked)} /> แสดงคำอ่าน</label>
          {position === deck.length - 1 ? <Button onClick={() => setFinished(true)}>สรุปผล</Button> : <button onClick={() => setPosition(position + 1)}>ถัดไป <ChevronRight /></button>}
        </div>
      </section>
    </main>
  }

  if (deck && finished) {
    const correct = deck.filter((word) => verdicts[word.id] === 'correct').length
    const needPractice = deck.filter((word) => verdicts[word.id] === 'practice')
    const unmarked = deck.length - correct - needPractice.length
    return <main className="learn-page">
      <section className="learn-summary">
        <p className="eyebrow">สรุปการฝึก (ไม่บันทึกลงระบบ)</p>
        <h1>{selectedSkill?.code} · {selectedSkill?.name}</h1>
        <div className="learn-summary__stats"><div><strong>{correct}</strong><span>อ่านถูก</span></div><div><strong>{needPractice.length}</strong><span>ต้องฝึกเพิ่ม</span></div><div><strong>{unmarked}</strong><span>ยังไม่ได้ให้คะแนน</span></div></div>
        {needPractice.length > 0 && <><h2>คำที่ควรฝึกซ้ำ</h2><div className="learn-chips">{needPractice.map((word) => <span key={word.id}>{word.display_text}</span>)}</div></>}
        <div className="learn-summary__actions">
          {needPractice.length > 0 && <Button onClick={() => start(needPractice)}><RotateCcw size={18} /> ฝึกเฉพาะคำที่ยังไม่คล่อง</Button>}
          <Button variant="secondary" onClick={() => start(candidates)}><Shuffle size={18} /> เริ่มใหม่ทั้งชุด</Button>
          <Button variant="ghost" onClick={leave}>เลือกทักษะอื่น</Button>
        </div>
      </section>
    </main>
  }

  return <main className="learn-page resource-library">
    <header className="resource-library__header thai-pattern">
      <Link to="/" className="resource-back"><ArrowLeft size={18} /> {session ? 'กลับแดชบอร์ด' : 'กลับหน้าแรก'}</Link>
      <div className="resource-library__brand">{logoUrl ? <img src={logoUrl} alt={`โลโก้ ${settings.affiliation}`} /> : <BookOpen />}<div><strong>{settings.system_name}</strong><span>{settings.affiliation}</span></div></div>
    </header>
    <section className="resource-library__hero">
      <p className="eyebrow">ไม่ต้องเข้าสู่ระบบ</p>
      <h1>โหมดเรียนรู้</h1>
      <p>เลือกทักษะแล้วใช้บัตรคำฝึกอ่านกับนักเรียนได้ทันที ผลการฝึกอยู่ในหน้านี้เท่านั้น ไม่ถูกบันทึกและไม่ระบุตัวตนนักเรียน</p>
    </section>
    <section className="learn-setup">
      {skills.isLoading ? <LoadingState label="กำลังเตรียมทักษะ" /> : skills.error ? <EmptyState icon={<BookOpen />} title="โหลดทักษะไม่สำเร็จ" description="กรุณาลองใหม่อีกครั้ง" /> : <>
        {levels.map(([level, items]) => <div className="learn-level" key={level}><h2>{level}</h2><div className="learn-skill-grid">{items.map((skill) => <button key={skill.id} className={skill.id === skillId ? 'learn-skill active' : 'learn-skill'} onClick={() => setSkillId(skill.id)}><span>{skill.code}</span><strong>{skill.name}</strong></button>)}</div></div>)}
        <div className="learn-options">
          <h2>{selectedSkill ? `${selectedSkill.code} · ${selectedSkill.name}` : 'เลือกทักษะด้านบนก่อน'}</h2>
          <div className="learn-options__row">
            <label>จำนวนพยางค์<select value={syllables} onChange={(event) => setSyllables(event.target.value as SyllableFilter)}><option value="all">ทุกคำ</option><option value="1">1 พยางค์</option><option value="2">2 พยางค์</option><option value="3">3 พยางค์ขึ้นไป</option></select></label>
            <label className="learn-toggle"><input type="checkbox" checked={shuffleWords} onChange={(event) => setShuffleWords(event.target.checked)} /> สลับลำดับคำ</label>
            <label className="learn-toggle"><input type="checkbox" checked={showPronunciation} onChange={(event) => setShowPronunciation(event.target.checked)} /> แสดงคำอ่านให้ครู</label>
          </div>
          <Button disabled={!skillId || words.isLoading || !candidates.length} onClick={() => start(candidates)}><Play size={20} /> {skillId && !words.isLoading ? `เริ่มฝึก ${candidates.length} คำ` : 'เริ่มฝึก'}</Button>
        </div>
      </>}
    </section>
    <footer className="resource-library__footer"><strong>{settings.system_name}</strong><span>{settings.footer_text}</span></footer>
  </main>
}
