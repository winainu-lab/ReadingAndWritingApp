import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.generated'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = createClient<Database>(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseKey ?? 'local-preview-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
