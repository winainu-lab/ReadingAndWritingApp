import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookType, Pencil, Plus, Search, Volume2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Button, EmptyState, LoadingState, Modal, Notice, PageHeader } from '../components/ui'
import { supabase } from '../lib/supabase'
import type { Skill, VocabularyWord } from '../types/app'

interface WordSkillLink {
  skill_id: string
  word_id: string
  word: VocabularyWord | null
}

const VOCABULARY_PAGE_SIZE = 1000

async function loadAllWordLinks() {
  const rows: WordSkillLink[] = []
  for (let from = 0; ; from += VOCABULARY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('word_skills')
      .select('skill_id,word_id,word:words(id,display_text,normalized_text,pronunciation,syllable_count,difficulty,source_note,is_active)')
      .order('skill_id')
      .order('word_id')
      .range(from, from + VOCABULARY_PAGE_SIZE - 1)
    if (error) throw error
    const page = data as unknown as WordSkillLink[]
    rows.push(...page)
    if (page.length < VOCABULARY_PAGE_SIZE) return rows
  }
}

export function VocabularyPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState('all')
  const [syllableFilter, setSyllableFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [createSkillId, setCreateSkillId] = useState('')
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const canManage = profile?.role === 'admin' || profile?.role === 'supervisor'
  const openCreate = (skillId?: string) => {
    setCreateSkillId(skillId ?? (skillFilter === 'all' ? '' : skillFilter))
    setShowCreate(true)
  }
  const closeCreate = () => { setShowCreate(false); setCreateSkillId('') }

  const skills = useQuery({ queryKey: ['skills'], queryFn: async () => { const { data, error } = await supabase.from('skills').select('*').order('sort_order'); if (error) throw error; return data as Skill[] } })
  const wordLinks = useQuery({ queryKey: ['vocabulary-by-skill'], queryFn: loadAllWordLinks })

  const sections = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th')
    return (skills.data ?? []).filter((skill) => skillFilter === 'all' || skill.id === skillFilter).map((skill) => ({
      skill,
      words: (wordLinks.data ?? []).filter((link) => link.skill_id === skill.id && link.word?.is_active).map((link) => link.word!).filter((word) => (syllableFilter === 'all' || word.syllable_count === Number(syllableFilter)) && (!keyword || word.display_text.toLocaleLowerCase('th').includes(keyword) || word.pronunciation?.toLocaleLowerCase('th').includes(keyword))),
    })).filter((section) => !keyword || section.words.length)
  }, [skills.data, wordLinks.data, search, skillFilter, syllableFilter])

  const allWords = [...new Map((wordLinks.data ?? []).map((entry) => entry.word).filter((word): word is VocabularyWord => Boolean(word?.is_active)).map((word) => [word.id, word])).values()]
  const missingPronunciation = allWords.filter((word) => !word.pronunciation).length

  const createWord = useMutation({
    mutationFn: async ({ skillId, display, pronunciation, syllableCount, difficulty }: { skillId: string; display: string; pronunciation: string; syllableCount: number; difficulty: number }) => {
      const normalized = display.trim()
      const spoken = pronunciation.trim() || null
      const { data: existing, error: lookupError } = await supabase.from('words').select('id').eq('normalized_text', normalized).maybeSingle()
      if (lookupError) throw lookupError
      let wordId = existing?.id
      if (wordId) {
        const { error: updateError } = await supabase.from('words').update({ pronunciation: spoken, syllable_count: syllableCount, difficulty }).eq('id', wordId)
        if (updateError) throw updateError
      } else {
        const { data, error } = await supabase.from('words').insert({ display_text: normalized, normalized_text: normalized, pronunciation: spoken, syllable_count: syllableCount, difficulty, source_note: 'เพิ่มผ่านระบบคลังคำ' }).select('id').single()
        if (error) throw error
        wordId = data.id
      }
      const { error: linkError } = await supabase.from('word_skills').upsert({ skill_id: skillId, word_id: wordId }, { onConflict: 'word_id,skill_id' })
      if (linkError) throw linkError
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['vocabulary-by-skill'] }); closeCreate(); setMessage('เพิ่มคำและผูกกับทักษะเรียบร้อย') },
  })
  const updateWord = useMutation({
    mutationFn: async ({ id, display, pronunciation }: { id: string; display: string; pronunciation: string }) => { const normalized = display.trim(); const { error } = await supabase.from('words').update({ display_text: normalized, normalized_text: normalized, pronunciation: pronunciation.trim() || null }).eq('id', id); if (error) throw error },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['vocabulary-by-skill'] }); setEditingWord(null); setMessage('บันทึกคำและคำอ่านแล้ว') },
  })

  const handleCreate = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); createWord.mutate({ skillId: String(form.get('skill')), display: String(form.get('display')), pronunciation: String(form.get('pronunciation')), syllableCount: Number(form.get('syllableCount')), difficulty: Number(form.get('difficulty')) }) }
  const handleUpdate = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!editingWord) return; const form = new FormData(event.currentTarget); updateWord.mutate({ id: editingWord.id, display: String(form.get('display')), pronunciation: String(form.get('pronunciation')) }) }

  return <>
    <PageHeader eyebrow="เนื้อหาการประเมิน" title="คลังคำและคำอ่าน" description="ตรวจคำที่ผูกกับทั้ง 24 ทักษะตามแบบเรียนเร็วใหม่ และเติมคำอ่านสำหรับผู้ทดสอบ" action={canManage ? <Button onClick={() => openCreate()}><Plus size={18} /> เพิ่มคำใหม่</Button> : undefined} />
    {message && <Notice tone="success">{message}</Notice>}
    <section className="vocabulary-summary"><div><BookType /><span><strong>{allWords.length.toLocaleString('th-TH')}</strong> รายการคำในทักษะ</span></div><div className={missingPronunciation ? 'vocabulary-summary__warning' : ''}><Volume2 /><span><strong>{missingPronunciation.toLocaleString('th-TH')}</strong> รายการยังไม่มีคำอ่าน</span></div></section>
    <section className="toolbar"><label className="search-box"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาคำหรือคำอ่าน" /></label><select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}><option value="all">ทุกทักษะ (24 บท)</option>{skills.data?.map((skill) => <option key={skill.id} value={skill.id}>{skill.code} · {skill.name}</option>)}</select><select className="syllable-filter" aria-label="กรองจำนวนพยางค์" value={syllableFilter} onChange={(event) => setSyllableFilter(event.target.value)}><option value="all">ทุกจำนวนพยางค์</option><option value="1">คำ 1 พยางค์</option><option value="2">คำ 2 พยางค์</option></select></section>
    {skills.isLoading || wordLinks.isLoading ? <LoadingState /> : sections.length ? <section className="vocabulary-sections">{sections.map(({ skill, words }) => <article className="vocabulary-section" key={skill.id}>
      <header><div><span>{skill.code}</span><div><small>{skill.level_code} · {skill.description}</small><h2>{skill.name}</h2></div></div><div className="vocabulary-section__actions"><strong>{words.length} คำ</strong>{canManage && <button onClick={() => openCreate(skill.id)}><Plus size={15} /> เพิ่มคำในบทนี้</button>}</div></header>
      {words.length ? <div className="word-grid">{words.map((word) => <div className="word-card" key={`${skill.id}-${word.id}`}><div><strong>{word.display_text}</strong><small>{word.syllable_count} พยางค์</small><span><Volume2 size={15} /> {word.pronunciation || 'ยังไม่ได้ระบุคำอ่าน'}</span></div>{canManage && <button aria-label={`แก้ไข ${word.display_text}`} onClick={() => setEditingWord(word)}><Pencil size={16} /></button>}</div>)}</div> : <p className="vocabulary-empty">ยังไม่มีคำในทักษะนี้</p>}
    </article>)}</section> : <EmptyState icon={<BookType />} title="ไม่พบคำ" description="ลองเปลี่ยนคำค้นหาหรือเลือกทักษะอื่น" />}

    {showCreate && <Modal title="เพิ่มคำในทักษะ" onClose={() => { if (!createWord.isPending) closeCreate() }}><form className="form-grid" onSubmit={handleCreate}>
      {createWord.error && <div className="form-grid__full"><Notice tone="error">{createWord.error.message}</Notice></div>}
      <div className="form-grid__full info-callout"><BookType size={20} /><span><strong>ขั้นที่ 1 เลือกบทหรือทักษะ</strong><br />จากนั้นกรอกคำ คำอ่าน และระดับความยาก ระบบจะนำคำไปแสดงในบทที่เลือกทันที</span></div>
      <label className="form-grid__full">บท / ทักษะ <span className="required-hint">(จำเป็น)</span><select name="skill" required value={createSkillId} onChange={(event) => setCreateSkillId(event.target.value)}><option value="" disabled>— เลือกบทหรือทักษะก่อน —</option>{skills.data?.map((skill) => <option key={skill.id} value={skill.id}>{skill.code} · {skill.name}</option>)}</select></label>
      <label>คำ<input name="display" required placeholder="เช่น โรงเรียน" /></label><label>คำอ่าน<input name="pronunciation" placeholder="เช่น โรง-เรียน" /></label>
      <label>จำนวนพยางค์<select name="syllableCount" defaultValue="1"><option value="1">1 พยางค์</option><option value="2">2 พยางค์</option></select></label><label>ระดับความยาก<select name="difficulty" defaultValue="1">{[1,2,3,4,5].map((value) => <option key={value} value={value}>ระดับ {value}</option>)}</select></label>
      <div className="form-actions form-grid__full"><Button type="button" variant="ghost" disabled={createWord.isPending} onClick={closeCreate}>ยกเลิก</Button><Button type="submit" disabled={createWord.isPending || !createSkillId}>{createWord.isPending ? 'กำลังบันทึก…' : 'บันทึกคำในทักษะนี้'}</Button></div>
    </form></Modal>}
    {editingWord && <Modal title="แก้ไขคำและคำอ่าน" onClose={() => setEditingWord(null)}><form className="form-grid" onSubmit={handleUpdate}>
      {updateWord.error && <div className="form-grid__full"><Notice tone="error">{updateWord.error.message}</Notice></div>}
      <label>คำ<input name="display" required defaultValue={editingWord.display_text} /></label><label>คำอ่าน<input name="pronunciation" defaultValue={editingWord.pronunciation ?? ''} placeholder="เช่น โรง-เรียน" /></label>
      <div className="form-grid__full info-callout"><Volume2 size={20} /><span>หากคำเดียวกันถูกผูกกับหลายทักษะ การแก้ไขนี้จะแสดงผลในทุกทักษะนั้น</span></div>
      <div className="form-actions form-grid__full"><Button type="button" variant="ghost" onClick={() => setEditingWord(null)}>ยกเลิก</Button><Button type="submit" disabled={updateWord.isPending}>บันทึก</Button></div>
    </form></Modal>}
  </>
}
