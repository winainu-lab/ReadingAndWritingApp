import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ImageUp, KeyRound, Palette, RefreshCw, Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Button, Notice, PageHeader } from '../components/ui'
import { getBrandLogoUrl, useAppSettings } from '../hooks/useAppSettings'
import { supabase } from '../lib/supabase'

export function SettingsPage() {
  const { user } = useAuth()
  const { settings } = useAppSettings()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const currentLogoUrl = getBrandLogoUrl(settings.logo_path)
  const saveSettings = useMutation({
    mutationFn: async ({ values, file }: {
      values: { system_name: string; affiliation: string; footer_text: string; landing_kicker: string; welcome_headline: string; welcome_description: string; manual_url: string | null; show_visit_counter: boolean }
      file: File | null
    }) => {
      let logoPath = settings.logo_path
      if (file) {
        if (file.size > 2 * 1024 * 1024) throw new Error('ไฟล์โลโก้ต้องมีขนาดไม่เกิน 2 MB')
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
        if (!allowedTypes.includes(file.type)) throw new Error('รองรับโลโก้ PNG, JPG, WEBP หรือ SVG เท่านั้น')
        const extension = file.type === 'image/svg+xml' ? 'svg' : file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
        logoPath = `logos/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage.from('branding').upload(logoPath, file, { cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError
      }
      const { error } = await supabase.from('app_settings').update({ ...values, logo_path: logoPath, updated_by: user?.id ?? null }).eq('id', 'default')
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['app-settings'] })
      setLogoFile(null)
      setLogoPreview(null)
      setSaved(true)
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaved(false)
    const form = new FormData(event.currentTarget)
    saveSettings.mutate({ values: {
      system_name: String(form.get('system_name')).trim(), affiliation: String(form.get('affiliation')).trim(),
      footer_text: String(form.get('footer_text')).trim(), landing_kicker: String(form.get('landing_kicker')).trim(), welcome_headline: String(form.get('welcome_headline')).trim(),
      welcome_description: String(form.get('welcome_description')).trim(), manual_url: String(form.get('manual_url') ?? '').trim() || null, show_visit_counter: form.get('show_visit_counter') === 'on',
    }, file: logoFile })
  }

  const registration = useQuery({
    queryKey: ['registration-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('registration_settings').select('teacher_code,is_enabled').eq('id', 'default').single()
      if (error) throw error
      return data
    },
  })
  const [codeDraft, setCodeDraft] = useState<string | null>(null)
  const [codeEnabled, setCodeEnabled] = useState<boolean | null>(null)
  const [codeSaved, setCodeSaved] = useState(false)
  const shownCode = codeDraft ?? registration.data?.teacher_code ?? ''
  const shownEnabled = codeEnabled ?? registration.data?.is_enabled ?? false
  const saveCode = useMutation({
    mutationFn: async () => {
      const code = shownCode.trim()
      if (code.length < 4) throw new Error('รหัสสมัครต้องมีอย่างน้อย 4 ตัวอักษร')
      const { error } = await supabase.from('registration_settings').update({ teacher_code: code, is_enabled: shownEnabled, updated_by: user?.id ?? null }).eq('id', 'default')
      if (error) throw error
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['registration-settings'] }); setCodeDraft(null); setCodeEnabled(null); setCodeSaved(true) },
  })
  const generateCode = () => { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; setCodeDraft(Array.from(crypto.getRandomValues(new Uint8Array(8)), (value) => alphabet[value % alphabet.length]).join('')); setCodeSaved(false) }

  const handleLogo = (file: File | null) => {
    setLogoFile(file)
    if (!file) return setLogoPreview(null)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(String(reader.result))
    reader.readAsDataURL(file)
  }

  return <>
    <PageHeader
      eyebrow="สำหรับผู้ดูแลระบบ"
      title="ชื่อระบบและหน่วยงาน"
      description="ปรับข้อความส่วนกลางเพื่อเผยแพร่ระบบให้เขตพื้นที่หรือหน่วยงานอื่น โดยไม่ต้องแก้โค้ด"
    />
    {saved && <Notice tone="success">บันทึกการตั้งค่าแล้ว ทุกหน้าจะใช้ชื่อใหม่ทันที</Notice>}
    {saveSettings.error && <Notice tone="error">{saveSettings.error.message}</Notice>}
    <section className="settings-card registration-code-card">
      <div className="settings-card__intro"><KeyRound /><div><h2>รหัสสมัครสำหรับครู</h2><p>ครูที่กรอกรหัสนี้ตอนสมัครจะใช้งานได้ทันที ไม่ต้องรอแอดมินอนุมัติ ส่วนศึกษานิเทศก์ยังต้องให้แอดมินอนุมัติทุกครั้ง แจกรหัสเฉพาะบุคลากรในเขตเท่านั้น และเปลี่ยนรหัสได้ทุกเมื่อ</p></div></div>
      {codeSaved && <Notice tone="success">บันทึกรหัสสมัครแล้ว</Notice>}
      {saveCode.error && <Notice tone="error">{saveCode.error.message}</Notice>}
      <div className="registration-code-card__row">
        <label>รหัสสมัคร<input value={shownCode} onChange={(event) => { setCodeDraft(event.target.value); setCodeSaved(false) }} maxLength={32} autoComplete="off" spellCheck={false} /></label>
        <Button type="button" variant="ghost" onClick={generateCode}><RefreshCw size={17} /> สุ่มรหัสใหม่</Button>
        <label className="learn-toggle"><input type="checkbox" checked={shownEnabled} onChange={(event) => { setCodeEnabled(event.target.checked); setCodeSaved(false) }} /> เปิดใช้รหัสสมัคร</label>
        <Button type="button" disabled={saveCode.isPending || registration.isLoading} onClick={() => saveCode.mutate()}><Save size={18} /> บันทึกรหัส</Button>
      </div>
    </section>
    <section className="settings-layout">
      <form className="settings-card" onSubmit={handleSubmit} key={settings.updated_at || 'default'}>
        <div className="settings-card__intro"><Palette /><div><h2>อัตลักษณ์ระบบ</h2><p>ข้อความเหล่านี้จะแสดงในหน้าเข้าสู่ระบบ เมนูหลัก หน้าแรก และท้ายเว็บไซต์</p></div></div>
        <div className="form-stack">
          <label className="logo-upload">โลโก้หน่วยงาน
            <span className="logo-upload__box"><ImageUp /><span><strong>{logoFile?.name ?? (settings.logo_path ? 'มีโลโก้อยู่แล้ว — เลือกไฟล์เพื่อเปลี่ยน' : 'เลือกไฟล์โลโก้')}</strong><small>PNG, JPG, WEBP หรือ SVG ไม่เกิน 2 MB</small></span></span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => handleLogo(event.target.files?.[0] ?? null)} />
          </label>
          <label>ชื่อระบบ<input name="system_name" required maxLength={80} defaultValue={settings.system_name} placeholder="เช่น อ่านคล่อง" /></label>
          <label>ชื่อสังกัด<input name="affiliation" required maxLength={180} defaultValue={settings.affiliation} placeholder="ชื่อสำนักงานเขตพื้นที่หรือหน่วยงาน" /></label>
          <label>ข้อความเหนือหัวเรื่อง<input name="landing_kicker" required maxLength={100} defaultValue={settings.landing_kicker} placeholder="เช่น เครื่องมือนิเทศและประเมินการอ่าน" /></label>
          <label>ข้อความต้อนรับ<input name="welcome_headline" required maxLength={150} defaultValue={settings.welcome_headline} /></label>
          <label>คำอธิบายหน้าเข้าสู่ระบบ<textarea name="welcome_description" required maxLength={300} rows={3} defaultValue={settings.welcome_description} /></label>
          <label>ลิงก์คู่มือการใช้งาน (PDF บน Google Drive)<input name="manual_url" type="url" maxLength={500} defaultValue={settings.manual_url ?? ''} placeholder="https://drive.google.com/file/d/…/view" /><small className="field-hint">ตั้งไฟล์เป็น "ทุกคนที่มีลิงก์ดูได้" ปุ่มคู่มือที่หน้าแรกและในเมนูจะเปิดไฟล์นี้ เว้นว่างเพื่อซ่อนปุ่ม</small></label>
          <label className="checkbox-field"><input name="show_visit_counter" type="checkbox" defaultChecked={settings.show_visit_counter} /><span><strong>แสดงยอดเข้าชมที่หน้าแรก</strong><small>ตัวเลขเล็ก ๆ ใต้ปุ่มคู่มือ นับเฉพาะการเข้าชมเว็บ ไม่รวมการใช้งานทดสอบ</small></span></label>
          <label>ข้อความท้ายเว็บไซต์<input name="footer_text" required maxLength={180} defaultValue={settings.footer_text} /></label>
          <div className="settings-preview"><CheckCircle2 /><div><strong>พร้อมใช้กับหลายเขตพื้นที่</strong><span>ข้อมูลโรงเรียนและศูนย์เครือข่ายยังจัดการแยกต่างหากในเมนูโรงเรียน</span></div></div>
          <Button type="submit" disabled={saveSettings.isPending}><Save size={18} /> {saveSettings.isPending ? 'กำลังบันทึก…' : 'บันทึกชื่อและข้อความ'}</Button>
        </div>
      </form>
      <aside className="brand-preview thai-pattern" aria-label="ตัวอย่างการแสดงผล">
        <span>ตัวอย่าง</span>
        <div className="brand-preview__seal">{logoPreview || currentLogoUrl ? <img src={logoPreview ?? currentLogoUrl ?? ''} alt="ตัวอย่างโลโก้" /> : 'อ'}</div>
        <p className="brand-preview__kicker">{settings.landing_kicker}</p>
        <h2>{settings.system_name}</h2>
        <p>{settings.affiliation}</p>
        <small>{settings.footer_text}</small>
      </aside>
    </section>
  </>
}
