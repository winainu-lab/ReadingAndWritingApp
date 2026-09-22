import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, ExternalLink, FileSearch, LockKeyhole, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { EmptyState, LoadingState } from '../components/ui'
import { getBrandLogoUrl, useAppSettings } from '../hooks/useAppSettings'
import { applyResourceThumbnailFallback, resolveResourceThumbnail } from '../lib/googleDrive'
import { supabase } from '../lib/supabase'
import type { LearningResource } from '../types/app'

export function LearningResourcesPage() {
  const { session } = useAuth()
  const { settings } = useAppSettings()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ทั้งหมด')
  const logoUrl = getBrandLogoUrl(settings.logo_path)
  const resources = useQuery({
    queryKey: ['public-learning-resources'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_learning_resources')
      if (error) throw error
      return data as LearningResource[]
    },
  })

  const categories = useMemo(() => ['ทั้งหมด', ...Array.from(new Set((resources.data ?? []).map((item) => item.category)))], [resources.data])
  const visibleResources = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th')
    return (resources.data ?? []).filter((item) => (category === 'ทั้งหมด' || item.category === category) && (!keyword || item.title.toLocaleLowerCase('th').includes(keyword) || item.description?.toLocaleLowerCase('th').includes(keyword)))
  }, [resources.data, search, category])

  return <main className="resource-library">
    <header className="resource-library__header thai-pattern">
      <Link to="/" className="resource-back"><ArrowLeft size={18} /> {session ? 'กลับแดชบอร์ด' : 'กลับหน้าแรก'}</Link>
      <div className="resource-library__brand">{logoUrl ? <img src={logoUrl} alt={`โลโก้ ${settings.affiliation}`} /> : <BookOpen />}<div><strong>{settings.system_name}</strong><span>{settings.affiliation}</span></div></div>
    </header>

    <section className="resource-library__hero">
      <p className="eyebrow">พื้นที่เรียนรู้สำหรับครูและผู้สนใจ</p>
      <h1>ศึกษาเอกสารและใบความรู้</h1>
      <p>รวมเอกสารประกอบ บทเรียน และสื่อความรู้ที่ผู้ดูแลระบบคัดสรรไว้</p>
      <div className="resource-search"><Search size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อเอกสารหรือเนื้อหา" /></div>
      <div className="resource-filters" aria-label="กรองประเภทเอกสาร">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </section>

    <section className="resource-library__content">
      {resources.isLoading ? <LoadingState label="กำลังเตรียมเอกสาร" /> : visibleResources.length ? <div className="resource-card-grid">{visibleResources.map((resource) => <article className={`resource-card ${resource.is_locked ? 'resource-card--locked' : ''}`} key={resource.id}>
        <img src={resolveResourceThumbnail(resource.public_url ?? '', resource.thumbnail_url)} alt={`ภาพตัวอย่าง ${resource.title}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(event) => applyResourceThumbnailFallback(event.currentTarget, resource.public_url ?? '')} />
        <div className="resource-card__shade" />
        <span className="resource-card__category">{resource.category}</span>
        {resource.is_locked && <div className="resource-card__lock"><LockKeyhole /><strong>เอกสารล็อกอยู่</strong><span>ผู้ดูแลยังไม่เปิดให้เข้าชม</span></div>}
        <div className="resource-card__content"><h2>{resource.title}</h2>{resource.description && <p>{resource.description}</p>}{resource.public_url && !resource.is_locked ? <a href={resource.public_url} target="_blank" rel="noreferrer">เปิดดูเอกสาร <ExternalLink size={17} /></a> : <span className="resource-card__disabled"><LockKeyhole size={16} /> ยังไม่เปิดให้ดู</span>}</div>
      </article>)}</div> : <EmptyState icon={<FileSearch />} title="ยังไม่มีเอกสารในหมวดนี้" description={search ? 'ลองเปลี่ยนคำค้นหาหรือเลือกประเภททั้งหมด' : 'ผู้ดูแลระบบสามารถเพิ่มเอกสารจาก Google Drive ได้จากหน้าจัดการเอกสาร'} />}
    </section>

    <footer className="resource-library__footer"><strong>{settings.system_name}</strong><span>{settings.footer_text}</span></footer>
  </main>
}
