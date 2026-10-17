import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, Clock3, Pause, Play, RotateCcw, Search, Shuffle, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button, EmptyState, LoadingState, NumberInput } from '../components/ui'
import { getBrandLogoUrl, useAppSettings } from '../hooks/useAppSettings'
import { supabase } from '../lib/supabase'
import type { Skill, VocabularyWord } from '../types/app'

type Verdict = 'correct' | 'practice'
type SyllableFilter = 'all' | '1' | '2' | '3'
type SelectionMode = 'random' | 'manual'
type TimerMode = 'none' | 'perWord' | 'total'

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function shuffled<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? Math.round(value) : min))
}

function formatClock(totalSeconds: number) {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`
}

function speak(text: string) {
  if (!speechSupported) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'th-TH'
  utterance.rate = 0.8
  const thaiVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('th'))
  if (thaiVoice) utterance.voice = thaiVoice
  window.speechSynthesis.speak(utterance)
}

export function LearnPage() {
  const { session } = useAuth()
  const { settings } = useAppSettings()
  const logoUrl = getBrandLogoUrl(settings.logo_path)
  const [skillId, setSkillId] = useState('')
  const [syllables, setSyllables] = useState<SyllableFilter>('all')
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('random')
  const [wordCount, setWordCount] = useState(20)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [pickSearch, setPickSearch] = useState('')
  const [shuffleWords, setShuffleWords] = useState(true)
  const [showPronunciation, setShowPronunciation] = useState(true)
  const [showSpeaker, setShowSpeaker] = useState(true)
  const [timerMode, setTimerMode] = useState<TimerMode>('none')
  const [perWordSeconds, setPerWordSeconds] = useState(10)
  const [totalSeconds, setTotalSeconds] = useState(120)

  const [chosen, setChosen] = useState<VocabularyWord[]>([])
  const [deck, setDeck] = useState<VocabularyWord[] | null>(null)
  const [position, setPosition] = useState(0)
  const [rounds, setRounds] = useState(1)
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
  const [finished, setFinished] = useState(false)
  const [paused, setPaused] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const activeTimer = useRef<TimerMode>('none')
  const settingsRef = useRef<HTMLDivElement>(null)

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
  const selectedLevelIndex = Math.max(0, levels.findIndex(([level]) => level === selectedSkill?.level_code))
  const candidates = useMemo(
    () => (words.data ?? []).filter((word) => syllables === 'all' || (syllables === '3' ? word.syllable_count >= 3 : word.syllable_count === Number(syllables))).sort((a, b) => a.display_text.localeCompare(b.display_text, 'th')),
    [words.data, syllables],
  )
  const visibleCandidates = useMemo(() => {
    const keyword = pickSearch.trim()
    return keyword ? candidates.filter((word) => word.display_text.includes(keyword) || word.pronunciation?.includes(keyword)) : candidates
  }, [candidates, pickSearch])
  const effectiveCount = clampNumber(wordCount, 1, Math.max(1, candidates.length))
  const sessionSize = selectionMode === 'manual' ? candidates.filter((word) => picked.has(word.id)).length : Math.min(effectiveCount, candidates.length)

  const chooseSkill = (id: string) => {
    setSkillId(id); setPicked(new Set()); setPickSearch('')
    // Bring the settings into view once they have rendered, so it is obvious what was selected.
    window.setTimeout(() => settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  const togglePick = (id: string) => setPicked((value) => { const next = new Set(value); if (next.has(id)) next.delete(id); else next.add(id); return next })

  const begin = (source: VocabularyWord[]) => {
    if (!source.length) return
    setChosen(source)
    setDeck(shuffleWords ? shuffled(source) : source)
    setPosition(0)
    setRounds(1)
    setVerdicts({})
    setFinished(false)
    setPaused(false)
    activeTimer.current = timerMode
    setRemaining(timerMode === 'perWord' ? perWordSeconds : timerMode === 'total' ? totalSeconds : 0)
  }
  const startFromSetup = () => {
    const pool = selectionMode === 'manual' ? candidates.filter((word) => picked.has(word.id)) : shuffled(candidates).slice(0, effectiveCount)
    begin(pool)
  }

  const goNext = () => {
    if (!deck) return
    if (position < deck.length - 1) { setPosition(position + 1); return }
    if (activeTimer.current === 'total') {
      setRounds((value) => value + 1)
      if (shuffleWords) setDeck(shuffled(deck))
      setPosition(0)
      return
    }
    setFinished(true)
  }
  const goPrevious = () => setPosition((value) => Math.max(0, value - 1))
  const mark = (verdict: Verdict) => {
    if (!deck) return
    setVerdicts((value) => ({ ...value, [deck[position].id]: verdict }))
    goNext()
  }
  const leave = () => { setDeck(null); setFinished(false); if (speechSupported) window.speechSynthesis.cancel() }

  // Per-word timer restarts whenever the word changes.
  useEffect(() => {
    if (deck && !finished && activeTimer.current === 'perWord') setRemaining(perWordSeconds)
  }, [position, deck, finished, perWordSeconds])

  useEffect(() => {
    if (!deck || finished || paused || activeTimer.current === 'none') return
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [deck, finished, paused])

  useEffect(() => {
    if (!deck || finished || paused || remaining > 0) return
    if (activeTimer.current === 'total') setFinished(true)
    else if (activeTimer.current === 'perWord') goNext()
  }, [remaining])

  useEffect(() => {
    if (!deck || finished) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goNext()
      if (event.key === 'ArrowLeft') goPrevious()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck, finished, position])

  if (deck && !finished) {
    const word = deck[position]
    const mode = activeTimer.current
    return <main className="learn-page learn-page--practice">
      <section className="runner">
        <header className="runner__header">
          <div><p>โหมดเรียนรู้ · ไม่บันทึกผล{mode === 'total' ? ` · รอบที่ ${rounds}` : ''}</p><strong>{selectedSkill?.code} · {selectedSkill?.name}</strong></div>
          <div className="learn-header-actions">
            {mode !== 'none' && <div className={`runner__timer ${remaining <= 5 ? 'runner__timer--urgent' : ''}`}><Clock3 /> {mode === 'perWord' ? `${remaining} วิ` : formatClock(remaining)}</div>}
            {mode !== 'none' && <button className="learn-exit" onClick={() => setPaused((value) => !value)}>{paused ? <><Play size={18} /> เล่นต่อ</> : <><Pause size={18} /> หยุดเวลา</>}</button>}
            <button className="learn-exit" onClick={leave}><X size={18} /> ออก</button>
          </div>
        </header>
        <div className="runner__progress"><span style={{ width: `${((position + 1) / deck.length) * 100}%` }} /></div>
        <div className="runner__stage">
          <p className="eyebrow">คำที่ {position + 1} จาก {deck.length}{mode === 'perWord' ? ' · เปลี่ยนคำอัตโนมัติเมื่อหมดเวลา' : ''}</p>
          <div className="reading-prompt" lang="th">{word.display_text}</div>
          {showPronunciation && <p className="learn-pronunciation">{word.pronunciation || 'ไม่มีคำอ่านกำกับ'}</p>}
          {showSpeaker && <button className="learn-speaker" onClick={() => speak(word.display_text)} disabled={!speechSupported} aria-label={`ฟังเสียงคำว่า ${word.display_text}`} title={speechSupported ? 'ฟังเสียงอ่าน' : 'เบราว์เซอร์นี้ไม่รองรับเสียงอ่าน'}><Volume2 /></button>}
          {paused && <p className="learn-paused">หยุดเวลาอยู่</p>}
        </div>
        <footer className="runner__controls runner__controls--two">
          <button className="score-button score-button--wrong" onClick={() => mark('practice')}><X /> อ่านผิด</button>
          <button className="score-button score-button--correct" onClick={() => mark('correct')}><Check /> อ่านถูก · คำถัดไป</button>
        </footer>
        <div className="runner__bottom">
          <button disabled={position === 0} onClick={goPrevious}><ChevronLeft /> ก่อนหน้า</button>
          <span className="learn-toggles">
            <label className="learn-toggle"><input type="checkbox" checked={showPronunciation} onChange={(event) => setShowPronunciation(event.target.checked)} /> คำอ่าน</label>
            <label className="learn-toggle"><input type="checkbox" checked={showSpeaker} onChange={(event) => setShowSpeaker(event.target.checked)} /> ลำโพง</label>
          </span>
          <span className="learn-bottom-actions">
            <button onClick={() => setFinished(true)}>สรุปผล</button>
            <button onClick={goNext}>{position === deck.length - 1 && mode !== 'total' ? 'จบ' : 'ข้าม'} <ChevronRight /></button>
          </span>
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
        <p className="eyebrow">สรุปการฝึก (ไม่บันทึกลงระบบ){activeTimer.current === 'total' ? ` · อ่านครบ ${rounds} รอบ` : ''}</p>
        <h1>{selectedSkill?.code} · {selectedSkill?.name}</h1>
        <div className="learn-summary__stats"><div><strong>{correct}</strong><span>อ่านถูก</span></div><div><strong>{needPractice.length}</strong><span>อ่านผิด</span></div><div><strong>{unmarked}</strong><span>ยังไม่ได้ให้คะแนน</span></div></div>
        {needPractice.length > 0 && <><h2>คำที่ควรฝึกซ้ำ</h2><div className="learn-chips">{needPractice.map((word) => <span key={word.id}>{word.display_text}</span>)}</div></>}
        <div className="learn-summary__actions">
          {needPractice.length > 0 && <Button onClick={() => begin(needPractice)}><RotateCcw size={18} /> ฝึกเฉพาะคำที่อ่านผิด</Button>}
          <Button variant="secondary" onClick={() => begin(chosen)}><Shuffle size={18} /> เริ่มใหม่ด้วยชุดเดิม</Button>
          <Button variant="ghost" onClick={leave}>กลับไปตั้งค่า</Button>
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
      <p>เลือกทักษะ เลือกคำเองหรือสุ่มตามจำนวน ตั้งเวลา แล้วใช้บัตรคำฝึกอ่านกับนักเรียนได้ทันที ผลอยู่ในหน้านี้เท่านั้น ไม่ถูกบันทึกและไม่ระบุตัวตนนักเรียน</p>
    </section>
    <section className="learn-setup">
      {skills.isLoading ? <LoadingState label="กำลังเตรียมทักษะ" /> : skills.error ? <EmptyState icon={<BookOpen />} title="โหลดทักษะไม่สำเร็จ" description="กรุณาลองใหม่อีกครั้ง" /> : <>
        {levels.map(([level, items], index) => <section className={`learn-level learn-level--${index % 3}`} key={level}><header className="learn-level__header"><span className="learn-level__badge">{index + 1}</span><div><h2>{level}</h2><p>{items.length} ทักษะ · {items[0].code}–{items[items.length - 1].code}</p></div></header><div className="learn-skill-grid">{items.map((skill) => <button key={skill.id} className={skill.id === skillId ? 'learn-skill active' : 'learn-skill'} onClick={() => chooseSkill(skill.id)}><span>{skill.code}</span><strong>{skill.name}</strong></button>)}</div></section>)}

        {selectedSkill && <div ref={settingsRef} className={`learn-selected learn-level--${selectedLevelIndex % 3}`}>
          <span className="learn-selected__badge">{selectedSkill.code}</span>
          <div><small>ทักษะที่เลือก · {selectedSkill.level_code}</small><strong>{selectedSkill.name}</strong></div>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>เปลี่ยนทักษะ</button>
        </div>}

        {skillId && <div className="learn-panel">
          <h2>1 · เลือกคำ <small>{words.isLoading ? 'กำลังโหลด…' : `ในคลังมี ${(words.data ?? []).length} คำ${candidates.length !== (words.data ?? []).length ? ` (ตรงตัวกรอง ${candidates.length} คำ)` : ''}`}</small></h2>
          <div className="learn-options__row">
            <label>จำนวนพยางค์<select value={syllables} onChange={(event) => { setSyllables(event.target.value as SyllableFilter); setPicked(new Set()) }}><option value="all">ทุกคำ</option><option value="1">1 พยางค์</option><option value="2">2 พยางค์</option><option value="3">3 พยางค์ขึ้นไป</option></select></label>
            <div className="learn-segment" role="radiogroup" aria-label="วิธีเลือกคำ">
              <button role="radio" aria-checked={selectionMode === 'random'} className={selectionMode === 'random' ? 'active' : ''} onClick={() => setSelectionMode('random')}>สุ่มตามจำนวน</button>
              <button role="radio" aria-checked={selectionMode === 'manual'} className={selectionMode === 'manual' ? 'active' : ''} onClick={() => setSelectionMode('manual')}>เลือกคำเอง</button>
            </div>
          </div>
          {selectionMode === 'random' ? <div className="learn-options__row">
            <label>จำนวนคำ<NumberInput min={1} max={Math.max(1, candidates.length)} value={Math.min(wordCount, Math.max(1, candidates.length))} onChange={setWordCount} /></label>
            <Button type="button" variant="ghost" disabled={!candidates.length} onClick={() => setWordCount(candidates.length)}>ใช้ทั้งหมด ({candidates.length})</Button>
          </div> : <>
            <div className="learn-options__row">
              <label className="learn-search"><Search size={17} /><input value={pickSearch} onChange={(event) => setPickSearch(event.target.value)} placeholder="ค้นหาคำ" /></label>
              <Button type="button" variant="ghost" onClick={() => setPicked(new Set([...picked, ...visibleCandidates.map((word) => word.id)]))}>เลือกทั้งหมดที่แสดง</Button>
              <Button type="button" variant="ghost" onClick={() => setPicked(new Set())}>ล้างที่เลือก</Button>
            </div>
            <div className="learn-word-picker">{visibleCandidates.map((word) => <button key={word.id} className={picked.has(word.id) ? 'active' : ''} aria-pressed={picked.has(word.id)} onClick={() => togglePick(word.id)}>{word.display_text}</button>)}{!visibleCandidates.length && <p>ไม่พบคำที่ตรงกับตัวกรอง</p>}</div>
          </>}
          <p className="learn-count">เลือกไว้ <strong>{sessionSize}</strong> คำ</p>
        </div>}

        {skillId && <div className="learn-panel">
          <h2>2 · ตั้งเวลา</h2>
          <div className="learn-segment" role="radiogroup" aria-label="รูปแบบการจับเวลา">
            <button role="radio" aria-checked={timerMode === 'none'} className={timerMode === 'none' ? 'active' : ''} onClick={() => setTimerMode('none')}>ไม่จับเวลา</button>
            <button role="radio" aria-checked={timerMode === 'perWord'} className={timerMode === 'perWord' ? 'active' : ''} onClick={() => setTimerMode('perWord')}>เวลาต่อคำ</button>
            <button role="radio" aria-checked={timerMode === 'total'} className={timerMode === 'total' ? 'active' : ''} onClick={() => setTimerMode('total')}>เวลารวมทั้งชุด</button>
          </div>
          {timerMode === 'perWord' && <div className="learn-options__row"><label>วินาทีต่อคำ<NumberInput min={1} max={120} value={perWordSeconds} onChange={setPerWordSeconds} /></label><p className="learn-hint">หมดเวลาแล้วเปลี่ยนคำเอง ครูกด "อ่านถูก" เพื่อไปคำถัดไปก่อนเวลาได้ อ่านครบทุกคำแล้วจบ</p></div>}
          {timerMode === 'total' && <div className="learn-options__row"><label>เวลาทั้งหมด (วินาที)<NumberInput min={10} max={3600} value={totalSeconds} onChange={setTotalSeconds} /></label><p className="learn-hint">≈ {formatClock(totalSeconds)} นาที อ่านครบชุดแล้วถ้าเวลายังไม่หมดจะวนกลับไปอ่านรอบใหม่ จนเวลาหมด</p></div>}
        </div>}

        {skillId && <div className="learn-options">
          {selectedSkill && <p className="learn-options__skill"><strong>{selectedSkill.code}</strong> · {selectedSkill.name}</p>}
          <div className="learn-options__row">
            <label className="learn-toggle"><input type="checkbox" checked={shuffleWords} onChange={(event) => setShuffleWords(event.target.checked)} /> สลับลำดับคำ</label>
            <label className="learn-toggle"><input type="checkbox" checked={showPronunciation} onChange={(event) => setShowPronunciation(event.target.checked)} /> แสดงคำอ่าน</label>
            <label className="learn-toggle"><input type="checkbox" checked={showSpeaker} onChange={(event) => setShowSpeaker(event.target.checked)} /> แสดงปุ่มลำโพง</label>
          </div>
          <Button disabled={words.isLoading || !sessionSize} onClick={startFromSetup}><Play size={20} /> {sessionSize ? `เริ่มฝึก ${sessionSize} คำ` : 'เลือกคำก่อนเริ่ม'}</Button>
        </div>}
        {!skillId && <p className="learn-hint learn-hint--center">เลือกทักษะด้านบนเพื่อเริ่มตั้งค่า</p>}
      </>}
    </section>
    <footer className="resource-library__footer"><strong>{settings.system_name}</strong><span>{settings.footer_text}</span></footer>
  </main>
}
