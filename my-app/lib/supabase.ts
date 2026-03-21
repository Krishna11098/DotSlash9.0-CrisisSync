import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type Event = {
  id: string
  event_code: string
  name: string
  description: string | null
  venue: string
  city: string
  state: string
  start_date: string
  end_date: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  budget: number | null
  expected_leads: number | null
  created_at: string
  updated_at: string
}

export type Lead = {
  id: string
  event_id: string
  full_name: string
  email: string
  phone: string
  company: string | null
  designation: string | null
  city: string | null
  state: string | null
  query_type: string | null
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  priority: number
  notes: string | null
  assigned_to: string | null
  source: string | null
  created_at: string
  updated_at: string
}
