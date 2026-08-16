import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Supabase client — only initialised when env vars are present (demo mode works without them)
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export type SupabaseAgent = {
  id: string
  name: string
  category: string
  status: 'queued' | 'active' | 'completed'
  current_task: string | null
  started_at: string | null
  completed_at: string | null
}
