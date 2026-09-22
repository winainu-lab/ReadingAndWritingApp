import {
  BarChart3,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  BookMarked,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useWebMcpTools } from '../hooks/useWebMcpTools'
import { getBrandLogoUrl, useAppSettings } from '../hooks/useAppSettings'

const navItems: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'ภาพรวม', icon: LayoutDashboard, end: true },
  { to: '/assessment', label: 'เริ่มทดสอบ', icon: ClipboardCheck },
  { to: '/rosters', label: 'ห้องและนักเรียน', icon: GraduationCap },
  { to: '/tests', label: 'แบบทดสอบ', icon: BookOpenCheck },
  { to: '/vocabulary', label: 'คลังคำและคำอ่าน', icon: LibraryBig },
  { to: '/reports', label: 'รายงาน', icon: BarChart3 },
  { to: '/schools', label: 'โรงเรียน', icon: Building2 },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const { settings } = useAppSettings()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  useWebMcpTools(profile)
  const roleLabel = profile?.role === 'admin' ? 'ผู้ดูแลระบบ' : profile?.role === 'supervisor' ? 'ศึกษานิเทศก์' : 'ครูผู้ทดสอบ'
  const logoUrl = getBrandLogoUrl(settings.logo_path)

  useEffect(() => { document.title = settings.system_name }, [settings.system_name])

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="brand">
          <div className={`brand__mark ${logoUrl ? 'brand__mark--uploaded' : ''}`}>{logoUrl ? <img src={logoUrl} alt={`โลโก้ ${settings.affiliation}`} /> : <BookOpenCheck size={24} />}</div>
          <div><strong>{settings.system_name}</strong><span>{settings.affiliation}</span></div>
          <button className="sidebar__close" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)}><X /></button>
        </div>
        <nav className="sidebar__nav" aria-label="เมนูหลัก">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
              <Icon size={20} /><span>{label}</span>
            </NavLink>
          ))}
          {profile?.role === 'admin' && (
            <>
              <NavLink to="/users" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
                <Users size={20} /><span>ผู้ใช้งาน</span>
              </NavLink>
              <NavLink to="/resources-admin" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
                <BookMarked size={20} /><span>จัดการเอกสาร</span>
              </NavLink>
              <NavLink to="/settings" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
                <Settings size={20} /><span>ตั้งค่าหน่วยงาน</span>
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar__profile">
          <div className="avatar">{profile?.full_name?.slice(0, 1) || 'ค'}</div>
          <div><strong>{profile?.full_name}</strong><span><ShieldCheck size={14} /> {roleLabel}</span></div>
          <button className="icon-button icon-button--dark" onClick={() => void signOut()} aria-label="ออกจากระบบ"><LogOut size={19} /></button>
        </div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} />}
      <div className="workspace">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="เปิดเมนู"><Menu /></button>
          <div className={`mobile-header__brand ${logoUrl ? 'mobile-header__brand--uploaded' : ''}`}>{logoUrl ? <img src={logoUrl} alt={`โลโก้ ${settings.affiliation}`} /> : <BookOpenCheck size={20} />}<span>{settings.system_name}</span></div>
          <div className="avatar avatar--small">{profile?.full_name?.slice(0, 1) || 'ค'}</div>
        </header>
        <main className="main-content"><div className="route-transition" key={location.pathname}>{children}</div></main>
        <footer className="app-footer thai-pattern"><strong>{settings.system_name}</strong><span>{settings.affiliation}</span><small>{settings.footer_text}</small></footer>
      </div>
    </div>
  )
}
