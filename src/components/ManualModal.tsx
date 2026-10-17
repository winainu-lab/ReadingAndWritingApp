import { BookOpenText, Download, ExternalLink, LoaderCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppSettings } from '../hooks/useAppSettings'
import { extractGoogleDriveFileId } from '../lib/googleDrive'

function getManualLinks(url: string) {
  const fileId = extractGoogleDriveFileId(url)
  if (!fileId) return { embed: null, open: url, download: null }
  return {
    embed: `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`,
    open: `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`,
    download: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
  }
}

export function ManualButton({ className = '' }: { className?: string }) {
  const { settings } = useAppSettings()
  const [open, setOpen] = useState(false)
  if (!settings.manual_url) return null
  return <>
    <button type="button" className={`manual-button ${className}`} onClick={() => setOpen(true)}><BookOpenText size={16} /> คู่มือการใช้งาน</button>
    {open && <ManualModal url={settings.manual_url} title={settings.system_name} onClose={() => setOpen(false)} />}
  </>
}

function ManualModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const links = getManualLinks(url)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow }
  }, [onClose])

  return <div className="manual-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="manual-dialog" role="dialog" aria-modal="true" aria-labelledby="manual-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="manual-dialog__header">
        <span className="manual-dialog__icon"><BookOpenText /></span>
        <div><h2 id="manual-title">คู่มือการใช้งาน</h2><p>{title}</p></div>
        <div className="manual-dialog__actions">
          <a href={links.open} target="_blank" rel="noreferrer"><ExternalLink size={16} /> <span>เปิดในแท็บใหม่</span></a>
          {links.download && <a href={links.download} target="_blank" rel="noreferrer"><Download size={16} /> <span>ดาวน์โหลด</span></a>}
          <button type="button" onClick={onClose} aria-label="ปิดคู่มือ"><X size={20} /></button>
        </div>
      </header>
      <div className="manual-dialog__body">
        <div className="manual-page">
          {links.embed ? <>
            {!loaded && <div className="manual-page__loading"><LoaderCircle className="spin" /> กำลังเปิดคู่มือ</div>}
            <iframe src={links.embed} title="คู่มือการใช้งาน" loading="lazy" onLoad={() => setLoaded(true)} allow="autoplay" />
          </> : <div className="manual-page__loading">ไม่สามารถแสดงตัวอย่างลิงก์นี้ได้ กรุณากด "เปิดในแท็บใหม่"</div>}
        </div>
      </div>
      <footer className="manual-dialog__footer">หากเอกสารไม่แสดง ให้ตรวจว่าไฟล์ตั้งเป็น "ทุกคนที่มีลิงก์ดูได้" หรือกด "เปิดในแท็บใหม่"</footer>
    </section>
  </div>
}
