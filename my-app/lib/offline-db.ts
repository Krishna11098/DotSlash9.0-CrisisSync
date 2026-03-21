import Dexie, { type Table } from 'dexie'

export type SyncStatus = 'pending' | 'synced' | 'error'

export type PendingMutation = {
  id?: number
  entity: 'events'
  operation: 'create' | 'update' | 'delete'
  record_id: string
  payload?: Record<string, any>
  created_at: string
}

export type OfflineEvent = {
  id: string
  event_code: string
  name: string
  description?: string | null
  venue?: string | null
  city?: string | null
  state?: string | null
  start_date?: string | null
  end_date?: string | null
  status?: string | null
  target_leads?: number | null
  actual_leads?: number | null
  created_at?: string | null
  updated_at?: string | null
  cached_at: number
}

export type OfflineLead = {
  local_id?: number
  id?: string
  event_id: string
  name?: string | null
  email: string
  phone: string
  company?: string | null
  remark?: string | null
  designation?: string | null
  query_type?: string | null
  stage?: string | null
  priority?: number | null
  entry_type?: string | null
  capture_mode?: string | null
  staff_id?: string | null
  stall_number?: string | null
  audio_file_url?: string | null
  audio_file_local_id?: string | null
  audio_file_text?: string | null
  ai_summary?: string | null
  is_duplicate?: boolean | null
  duplicate_of?: string | null
  follow_up_date?: string | null
  follow_up_notes?: string | null
  meeting_date?: string | null
  meeting_link?: string | null
  meeting_type?: string | null
  meeting_notes?: string | null
  created_at?: string | null
  updated_at?: string | null
  sync_status: SyncStatus
  local_updated_at: string
}

export type OfflineAudioFile = {
  id: string
  file_name?: string | null
  mime_type?: string | null
  blob: Blob
  created_at: string
  uploaded_url?: string | null
  uploaded_at?: string | null
}

class XSparkOfflineDB extends Dexie {
  events!: Table<OfflineEvent, string>
  leads!: Table<OfflineLead, number>
  pending_mutations!: Table<PendingMutation, number>
  audio_files!: Table<OfflineAudioFile, string>

  constructor() {
    super('xSparkOfflineDB')

    this.version(1).stores({
      events: 'id, event_code, name, cached_at',
      leads: '++local_id, id, event_id, sync_status, local_updated_at, created_at, email, phone'
    })

    this.version(2).stores({
      events: 'id, event_code, name, cached_at',
      leads: '++local_id, id, event_id, sync_status, local_updated_at, created_at, email, phone',
      pending_mutations: '++id, entity, operation, record_id, created_at'
    })

    this.version(3).stores({
      events: 'id, event_code, name, cached_at',
      leads: '++local_id, id, event_id, sync_status, local_updated_at, created_at, email, phone',
      pending_mutations: '++id, entity, operation, record_id, created_at',
      audio_files: 'id, created_at, uploaded_at'
    })
  }
}

export const offlineDb = new XSparkOfflineDB()
