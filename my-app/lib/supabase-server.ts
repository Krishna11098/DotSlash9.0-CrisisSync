import 'server-only'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseServiceRoleKey && typeof console !== 'undefined') {
  console.warn('[supabase-server] SUPABASE_SERVICE_ROLE_KEY is not set; falling back to anon key for API routes')
}

const baseKey = supabaseServiceRoleKey || supabaseAnonKey

export const createServerSupabaseClient = (authorizationHeader?: string) =>
  createClient(supabaseUrl, baseKey, {
    global: {
      headers: authorizationHeader
        ? {
            Authorization: authorizationHeader,
          }
        : undefined,
    },
  })

export const supabaseAdmin = createServerSupabaseClient()
