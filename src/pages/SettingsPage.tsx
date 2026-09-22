import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ImageUp, Palette, Save } from 'lucide-react'
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
      values: { system_name: string; affiliation: string; footer_text: string; landing_kicker: string; welcome_headline: string; welcome_description: string }
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
      welcome_description: String(form.get('welcome_description')).trim(),
    }, file: logoFile })
  }

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
