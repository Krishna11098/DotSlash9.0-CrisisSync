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

export type OfflineRequest = {
  local_id?: number;
  id?: string;
  topic: string;
  image_url?: string | null;
  audio_url?: string | null;
  audio_file_local_id?: string | null;
  latitude: number;
  longitude: number;
  departments: Array<'hospital' | 'fire' | 'police' | 'municipal corporation'>;
  urgency: 'emergency' | 'urgent' | 'moderate';
  time_limit_minutes?: number | null;
  status: string;
  client_created_at: string;
  sync_status: SyncStatus;
  // NEW: Priority Engine Fields
  priority_score?: number; // 0-100 calculated score
  priority_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; // Calculated priority level
  detected_category?: 'Hospital' | 'Fire' | 'Municipal' | 'Police'; // Auto-detected category
  category_confidence?: number; // 0-1 confidence
};

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
  requests!: Table<OfflineRequest, number>
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

    this.version(4).stores({
      events: 'id, event_code, name, cached_at',
      requests: '++local_id, id, sync_status, client_created_at, urgency',
      pending_mutations: '++id, entity, operation, record_id, created_at',
      audio_files: 'id, created_at, uploaded_at'
    })

    this.version(5).stores({
      events: 'id, event_code, name, cached_at',
      requests: '++local_id, id, sync_status, client_created_at, urgency, *departments',
      pending_mutations: '++id, entity, operation, record_id, created_at',
      audio_files: 'id, created_at, uploaded_at'
    })
  }
}

export const offlineDb = new XSparkOfflineDB()
