import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { AppShell } from './components/AppShell'
import { LoadingState } from './components/ui'
import { LoginPage } from './pages/LoginPage'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const AssessmentPage = lazy(() => import('./pages/AssessmentPage').then((module) => ({ default: module.AssessmentPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const RosterPage = lazy(() => import('./pages/RosterPage').then((module) => ({ default: module.RosterPage })))
const SchoolsPage = lazy(() => import('./pages/SchoolsPage').then((module) => ({ default: module.SchoolsPage })))
const TestsPage = lazy(() => import('./pages/TestsPage').then((module) => ({ default: module.TestsPage })))
const VocabularyPage = lazy(() => import('./pages/VocabularyPage').then((module) => ({ default: module.VocabularyPage })))
const UsersPage = lazy(() => import('./pages/UsersPage').then((module) => ({ default: module.UsersPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const LearningResourcesPage = lazy(() => import('./pages/LearningResourcesPage').then((module) => ({ default: module.LearningResourcesPage })))
const ResourcesAdminPage = lazy(() => import('./pages/ResourcesAdminPage').then((module) => ({ default: module.ResourcesAdminPage })))

function ProtectedApp() {
  const { profile } = useAuth()

  if (!profile) return <LoadingState label="กำลังเตรียมบัญชีผู้ใช้" />
  if (profile.status !== 'approved') {
    return (
      <main className="status-page">
        <div className="status-mark">รอ</div>
        <p className="eyebrow">สถานะบัญชี</p>
        <h1>รอผู้ดูแลระบบอนุมัติ</h1>
        <p>ระบบได้รับคำขอสมัครแล้ว เมื่ออนุมัติคุณจะสามารถสร้างห้องและเริ่มประเมินได้</p>
      </main>
    )
  }

  return (
    <AppShell>
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="schools" element={<SchoolsPage />} />
          <Route path="rosters" element={<RosterPage />} />
          <Route path="tests" element={<TestsPage />} />
          <Route path="vocabulary" element={<VocabularyPage />} />
          <Route path="assessment" element={<AssessmentPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={profile.role === 'admin' ? <UsersPage /> : <Navigate to="/" replace />} />
          <Route path="settings" element={profile.role === 'admin' ? <SettingsPage /> : <Navigate to="/" replace />} />
          <Route path="resources-admin" element={profile.role === 'admin' ? <ResourcesAdminPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

export function App() {
  const location = useLocation()
  const { session, loading } = useAuth()
  if (location.pathname === '/learning-resources') {
    return <Suspense fallback={<LoadingState label="กำลังเปิดคลังเอกสาร" />}><LearningResourcesPage /></Suspense>
  }
  if (loading) return <LoadingState label="กำลังเปิดระบบอ่านคล่อง" />
  if (!session) return <LoginPage />
  return <ProtectedApp />
}
