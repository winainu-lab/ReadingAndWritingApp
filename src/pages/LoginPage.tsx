import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpenCheck, BookOpenText, Eye, EyeOff, LogIn, MapPinned, School, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { SchoolOptions } from '../components/SchoolOptions'
import { Button, Notice } from '../components/ui'
import { getBrandLogoUrl, useAppSettings } from '../hooks/useAppSettings'
import type { SchoolChoice } from '../lib/schoolSorting'
import { supabase } from '../lib/supabase'

type AuthMode = 'login' | 'register' | null

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const { settings } = useAppSettings()
  const [mode, setMode] = useState<AuthMode>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const logoUrl = getBrandLogoUrl(settings.logo_path)

  const schools = useQuery({
    queryKey: ['public-schools'],
    queryFn: async () => {
      const { data, error } = await supabase.from('schools').select('id,name,district,network_center_id,network_center:network_centers(name,sort_order)').eq('is_active', true)
      if (error) throw error
      return data as unknown as SchoolChoice[]
    },
  })
  const networkCount = useMemo(() => new Set(schools.data?.map((school) => school.network_center_id)).size, [schools.data])

  useEffect(() => { document.title = settings.system_name }, [settings.system_name])
  useEffect(() => {
    if (!mode) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMode(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mode])

  const openModal = (nextMode: Exclude<AuthMode, null>) => {
    setMode(nextMode)
    setMessage(null)
    setShowPassword(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!mode) return
    setBusy(true)
    setMessage(null)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    const error = mode === 'login'
      ? await signIn(email, password)
      : await signUp({ email, password, fullName: String(form.get('fullName') ?? ''), schoolId: String(form.get('schoolId') ?? '') })
    setBusy(false)
    setMessage(error ? { tone: 'error', text: error } : mode === 'register' ? { tone: 'success', text: 'สมัครเรียบร้อย กรุณารอผู้ดูแลระบบอนุมัติบัญชี' } : null)
  }

  return (
    <main className="landing-page">
      <section className="landing-stage" aria-label={`${settings.system_name} ${settings.affiliation}`}>
        <img className="landing-characters" src="/thai-literature-characters-v3.png" alt="" aria-hidden="true" />
        <header className="landing-brand">
          <div className={logoUrl ? 'landing-logo landing-logo--uploaded' : 'landing-logo'}>{logoUrl ? <img src={logoUrl} alt={`โลโก้ ${settings.affiliation}`} /> : <BookOpenCheck />}</div>
          <div><strong>{settings.system_name}</strong><span>{settings.affiliation}</span><small className="landing-brand__office">{settings.footer_text}</small></div>
        </header>

        <div className="landing-center">
          <p className="landing-kicker"><MapPinned size={18} /> {settings.landing_kicker}</p>
          <h1>{settings.welcome_headline}</h1>
          <p>{settings.welcome_description}</p>
          <div className="landing-facts" aria-label="ข้อมูลระบบ">
            <div><School /><strong>{schools.data?.length.toLocaleString('th-TH') ?? '–'}</strong><span>โรงเรียน</span></div>
            <div><MapPinned /><strong>{networkCount || '–'}</strong><span>ศูนย์เครือข่าย</span></div>
            <div><ShieldCheck /><strong>ไม่ระบุตัวตน</strong><span>ไม่เก็บชื่อเด็ก</span></div>
          </div>
          <Link className="landing-resources-button" to="/learning-resources"><BookOpenText size={20} /><span>ศึกษาเอกสารและใบความรู้</span><ArrowRight size={18} /></Link>
        </div>

        <footer className="landing-footer">
          <div><strong>{settings.system_name}</strong><span>{settings.footer_text}</span></div>
          <div className="landing-action-stack">
            <div className="landing-actions">
              <button className="landing-register" onClick={() => openModal('register')}><UserPlus size={19} /> สมัครครูผู้ทดสอบ</button>
              <button className="landing-login" onClick={() => openModal('login')}><LogIn size={19} /> เข้าสู่ระบบ <ArrowRight size={18} /></button>
            </div>
          </div>
        </footer>
      </section>

      {mode && (
        <div className="auth-modal-backdrop" role="presentation" onMouseDown={() => setMode(null)}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="auth-modal__close" onClick={() => setMode(null)} aria-label="ปิด"><X /></button>
            <div className="auth-modal__brand">
              <div className={logoUrl ? 'auth-modal__logo auth-modal__logo--uploaded' : 'auth-modal__logo'}>{logoUrl ? <img src={logoUrl} alt="" /> : <BookOpenCheck />}</div>
              <p>{settings.system_name}</p>
            </div>
            <div className="auth-tabs" role="tablist">
              <button className={mode === 'login' ? 'active' : ''} onClick={() => openModal('login')}>เข้าสู่ระบบ</button>
              <button className={mode === 'register' ? 'active' : ''} onClick={() => openModal('register')}>สมัครครูผู้ทดสอบ</button>
            </div>
            <div className="auth-card__heading">
              <h2 id="auth-modal-title">{mode === 'login' ? 'ยินดีต้อนรับกลับ' : 'สร้างบัญชีผู้ทดสอบ'}</h2>
              <p>{mode === 'login' ? 'เข้าสู่ระบบเพื่อดำเนินการประเมินต่อ' : 'เลือกโรงเรียนที่สังกัด ผู้ดูแลจะตรวจสอบก่อนเปิดใช้งาน'}</p>
            </div>
            {message && <Notice tone={message.tone}>{message.text}</Notice>}
            <form onSubmit={(event) => void handleSubmit(event)} className="form-stack">
              {mode === 'register' && (
                <>
                  <label>ชื่อ–นามสกุล<input name="fullName" required placeholder="ชื่อผู้สมัคร" /></label>
                  <label>โรงเรียน
                    <select name="schoolId" required defaultValue="">
                      <option value="" disabled>เลือกโรงเรียนตามศูนย์เครือข่าย</option>
                      <SchoolOptions schools={schools.data ?? []} />
                    </select>
                  </label>
                </>
              )}
              <label>อีเมล<input type="email" name="email" required placeholder="name@school.ac.th" autoComplete="email" /></label>
              <label>รหัสผ่าน
                <span className="password-field">
                  <input type={showPassword ? 'text' : 'password'} name="password" required minLength={8} placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                  <button type="button" aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button>
                </span>
              </label>
              <Button type="submit" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : mode === 'login' ? 'เข้าสู่ระบบ' : 'ส่งคำขอสมัคร'}</Button>
            </form>
            <p className="auth-note">ข้อมูลผู้เรียนเป็นหมายเลขสมมติ ไม่ใช่ประวัตินักเรียนรายบุคคล</p>
          </section>
        </div>
      )}
    </main>
  )
}
