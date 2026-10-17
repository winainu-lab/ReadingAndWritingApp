import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type VisitPage = 'landing' | 'learn' | 'resources' | 'app'

function safeStorage(kind: 'session' | 'local') {
  try { return kind === 'session' ? window.sessionStorage : window.localStorage } catch { return null }
}

/**
 * Counts one visit per browser session and page group. The server keeps a single counter row
 * per day and page, so traffic never grows the database; nothing identifies the visitor.
 * "New visitor" is true at most once per browser per day, tracked only in localStorage.
 */
export function useVisitTracking(page: VisitPage | null) {
  useEffect(() => {
    if (!page) return
    const session = safeStorage('session')
    const local = safeStorage('local')
    const sessionKey = `visit:${page}`
    if (session?.getItem(sessionKey)) return
    session?.setItem(sessionKey, '1')

    const today = new Date().toISOString().slice(0, 10)
    const isNewVisitor = local?.getItem('visitor-day') !== today
    if (isNewVisitor) local?.setItem('visitor-day', today)

    void supabase.rpc('record_visit', { p_page: page, p_new_visitor: isNewVisitor }).then(() => undefined, () => undefined)
  }, [page])
}
