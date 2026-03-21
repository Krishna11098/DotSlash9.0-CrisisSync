import { offlineDb, type OfflineEvent, type OfflineLead, type SyncStatus } from '@/lib/offline-db'
import { supabase } from '@/lib/supabase'
import { normalizeEmailAddress, normalizePhoneNumber } from '@/lib/validation'
import {
  getAudioBlobByRef,
  isOfflineAudioRef,
  markLocalAudioUploaded,
  uploadAudioBlobToCloudinary,
} from '@/lib/audio-storage'

const nowIso = () => new Date().toISOString()
let activeSync: Promise<void> | null = null

export type SyncStatusSnapshot = {
  isOnline: boolean
  isSyncing: boolean
  pendingLeadCount: number
  errorLeadCount: number
  pendingMutationCount: number
}

export type LeadSaveResult = {
  savedLocally: boolean
  synced: boolean
  message: string
}

export const isBrowserOnline = () => {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

const logSyncWarning = (context: string, error: unknown) => {
  if (typeof console !== 'undefined') {
    console.warn(`[offline-sync] ${context}`, error)
  }
}

const isEmptyValue = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

const getLeadTimestamp = (lead: OfflineLead) =>
  new Date(lead.created_at || lead.local_updated_at).getTime()

const buildMergedAudioText = (leads: OfflineLead[]) => {
  const chunks = leads
    .map((lead) => (typeof lead.audio_file_text === 'string' ? lead.audio_file_text.trim() : ''))
    .filter((chunk) => chunk.length > 0)

  if (!chunks.length) return null
  return `${chunks.join('\n')}\n`
}

const appendAudioFileText = (existingText: string | null | undefined, incomingText: string | null | undefined) => {
  const existing = typeof existingText === 'string' ? existingText.trim() : ''
  const incoming = typeof incomingText === 'string' ? incomingText.trim() : ''

  if (!incoming) {
    return existing ? `${existing}\n` : null
  }

  if (!existing) {
    return `${incoming}\n`
  }

  return `${existing}\n${incoming}\n`
}

const mergeLatestLeadByPhone = (existingLead: OfflineLead, incomingLead: OfflineLead): OfflineLead => {
  const mergedAudioText = appendAudioFileText(existingLead.audio_file_text, incomingLead.audio_file_text)

  return {
    ...existingLead,
    ...incomingLead,
    created_at: existingLead.created_at ?? incomingLead.created_at ?? nowIso(),
    audio_file_text: mergedAudioText,
    sync_status: 'pending',
    local_updated_at: nowIso(),
  }
}

const getPhoneGroupKey = (lead: OfflineLead) => {
  const rawPhone = String(lead.phone ?? '')
  return normalizePhoneNumber(rawPhone) || rawPhone
}

const resolveGroupedSyncStatus = (rows: OfflineLead[]): SyncStatus => {
  if (rows.some((row) => row.sync_status === 'error')) return 'error'
  if (rows.some((row) => row.sync_status === 'pending')) return 'pending'
  return 'synced'
}

const consolidateLocalLeadsByPhone = async () => {
  const allLeads = await offlineDb.leads.toArray()
  if (allLeads.length <= 1) return

  const grouped = new Map<string, OfflineLead[]>()

  for (const lead of allLeads) {
    const key = getPhoneGroupKey(lead)
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(lead)
  }

  await offlineDb.transaction('rw', offlineDb.leads, async () => {
    for (const [phoneKey, rows] of grouped.entries()) {
      if (rows.length <= 1) {
        const onlyRow = rows[0]
        if (onlyRow?.local_id && onlyRow.phone !== phoneKey) {
          await offlineDb.leads.update(onlyRow.local_id, {
            phone: phoneKey,
            local_updated_at: nowIso(),
          })
        }
        continue
      }

      const sortedRows = [...rows].sort((left, right) => getLeadTimestamp(left) - getLeadTimestamp(right))
      const latestRow = sortedRows[sortedRows.length - 1]
      if (!latestRow.local_id) continue

      const mergedAudioText = buildMergedAudioText(sortedRows)
      const groupedSyncStatus = resolveGroupedSyncStatus(sortedRows)

      await offlineDb.leads.update(latestRow.local_id, {
        ...latestRow,
        phone: phoneKey,
        created_at: sortedRows[0]?.created_at ?? latestRow.created_at,
        audio_file_text: mergedAudioText,
        sync_status: groupedSyncStatus,
        local_updated_at: nowIso(),
      })

      const duplicateIds = sortedRows
        .slice(0, -1)
        .map((row) => row.local_id)
        .filter((rowId): rowId is number => typeof rowId === 'number')

      if (duplicateIds.length) {
        await offlineDb.leads.bulkDelete(duplicateIds)
      }
    }
  })
}

const mergeLeadRecords = (
  existingLead: OfflineLead,
  incomingLead: OfflineLead,
  syncStatus: 'pending' | 'synced' | 'error'
): OfflineLead => {
  const mergedLead: OfflineLead = {
    ...existingLead,
    sync_status: syncStatus,
    local_updated_at: nowIso(),
  }

  for (const [key, incomingValue] of Object.entries(incomingLead)) {
    if (key === 'local_id') continue
    if (isEmptyValue((mergedLead as Record<string, unknown>)[key]) && !isEmptyValue(incomingValue)) {
      ;(mergedLead as Record<string, unknown>)[key] = incomingValue
    }
  }

  if (incomingLead.id) {
    mergedLead.id = incomingLead.id
  }

  return mergedLead
}

export const getSyncStatusSnapshot = async (): Promise<SyncStatusSnapshot> => {
  const [pendingLeadCount, errorLeadCount, pendingMutationCount] = await Promise.all([
    offlineDb.leads.where('sync_status').equals('pending').count(),
    offlineDb.leads.where('sync_status').equals('error').count(),
    offlineDb.pending_mutations.count()
  ])

  return {
    isOnline: isBrowserOnline(),
    isSyncing: !!activeSync,
    pendingLeadCount,
    errorLeadCount,
    pendingMutationCount
  }
}

const createLocalEventId = () => {
  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  return `local-event-${generated}`
}

const normalizeEvent = (event: Record<string, any>): OfflineEvent => ({
  id: String(event.id),
  event_code: String(event.event_code ?? ''),
  name: String(event.name ?? ''),
  description: event.description ?? null,
  venue: event.venue ?? null,
  city: event.city ?? null,
  state: event.state ?? null,
  start_date: event.start_date ?? null,
  end_date: event.end_date ?? null,
  status: event.status ?? null,
  target_leads: typeof event.target_leads === 'number' ? event.target_leads : 0,
  actual_leads: typeof event.actual_leads === 'number' ? event.actual_leads : 0,
  created_at: event.created_at ?? nowIso(),
  updated_at: event.updated_at ?? null,
  cached_at: Date.now()
})

const normalizeLeadForLocal = (
  lead: Record<string, any>,
  syncStatus: 'pending' | 'synced' | 'error'
): OfflineLead => ({
  id: lead.id ?? undefined,
  event_id: String(lead.event_id),
  name: lead.name ?? null,
  full_name: lead.full_name ?? null,
  email: normalizeEmailAddress(String(lead.email ?? '')),
  phone: normalizePhoneNumber(String(lead.phone ?? '')) || String(lead.phone ?? ''),
  company: lead.company ?? null,
  remark: lead.remark ?? null,
  designation: lead.designation ?? null,
  query_type: lead.query_type ?? null,
  stage: lead.stage ?? null,
  priority: typeof lead.priority === 'number' ? lead.priority : null,
  entry_type: lead.entry_type ?? null,
  capture_mode: lead.capture_mode ?? null,
  staff_id: lead.staff_id ?? null,
  stall_number: lead.stall_number ?? null,
  audio_file_url: lead.audio_file_url ?? null,
  audio_file_local_id: lead.audio_file_local_id ?? null,
  audio_file_text: lead.audio_file_text ?? null,
  ai_summary: lead.ai_summary ?? null,
  is_duplicate: lead.is_duplicate ?? false,
  duplicate_of: lead.duplicate_of ?? null,
  created_at: lead.created_at ?? nowIso(),
  updated_at: lead.updated_at ?? null,
  sync_status: syncStatus,
  local_updated_at: nowIso()
})

export const getCachedEvents = async () => {
  const events = await offlineDb.events.toArray()
  return events.sort((left, right) => {
    const leftTs = left.start_date ? new Date(left.start_date).getTime() : 0
    const rightTs = right.start_date ? new Date(right.start_date).getTime() : 0
    return rightTs - leftTs
  })
}

export const getCachedLeadsByEvent = async (eventId: string) => {
  await consolidateLocalLeadsByPhone()
  const leads = await offlineDb.leads.where('event_id').equals(eventId).toArray()

  return leads.sort((left, right) => {
    const leftTs = new Date(left.created_at || left.local_updated_at).getTime()
    const rightTs = new Date(right.created_at || right.local_updated_at).getTime()
    return rightTs - leftTs
  })
}

export const getCachedLeads = async () => {
  await consolidateLocalLeadsByPhone()
  const leads = await offlineDb.leads.toArray()

  return leads.sort((left, right) => {
    const leftTs = new Date(left.created_at || left.local_updated_at).getTime()
    const rightTs = new Date(right.created_at || right.local_updated_at).getTime()
    return rightTs - leftTs
  })
}

export const cacheEventsFromRemote = async (events: Record<string, any>[]) => {
  const normalized = events.map(normalizeEvent)
  await offlineDb.transaction('rw', offlineDb.events, async () => {
    await offlineDb.events.clear()
    if (normalized.length) {
      await offlineDb.events.bulkPut(normalized)
    }
  })
}

const cacheAllLeadsFromRemote = async (leads: Record<string, any>[]) => {
  const normalized = leads.map((lead) => normalizeLeadForLocal(lead, 'synced'))
  await offlineDb.transaction('rw', offlineDb.leads, async () => {
    for (const lead of normalized) {
      if (!lead.id) {
        continue
      }

      const existing = await offlineDb.leads.where('id').equals(String(lead.id)).first()
      if (existing?.local_id) {
        await offlineDb.leads.update(existing.local_id, mergeLeadRecords(existing, lead, 'synced'))
        continue
      }

      await offlineDb.leads.add(lead)
    }
  })
}

const upsertSyncedLead = async (lead: Record<string, any>) => {
  const normalized = normalizeLeadForLocal(lead, 'synced')

  if (lead.id) {
    const existing = await offlineDb.leads.where('id').equals(String(lead.id)).first()
    if (existing?.local_id) {
      await offlineDb.leads.update(existing.local_id, mergeLeadRecords(existing, normalized, 'synced'))
      return
    }
  }

  await offlineDb.leads.add(normalized)
}

const setPendingMutation = async (
  operation: 'create' | 'update' | 'delete',
  recordId: string,
  payload?: Record<string, any>
) => {
  await offlineDb.pending_mutations.add({
    entity: 'events',
    operation,
    record_id: recordId,
    payload,
    created_at: nowIso()
  })
}

const processPendingEventMutations = async () => {
  const mutations = await offlineDb.pending_mutations.orderBy('created_at').toArray()

  for (const mutation of mutations) {
    if (mutation.entity !== 'events') continue

    if (mutation.operation === 'create') {
      const createPayload = { ...(mutation.payload || {}) }
      delete createPayload.id

      const { data, error } = await supabase
        .from('events')
        .insert([createPayload])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to sync event create: ${error.message}`)
      }

      const remoteEventId = String(data.id)

      await offlineDb.transaction('rw', offlineDb.events, offlineDb.leads, offlineDb.pending_mutations, async () => {
        await offlineDb.events.delete(mutation.record_id)
        await offlineDb.events.put(normalizeEvent(data))

        await offlineDb.leads.where('event_id').equals(mutation.record_id).modify({
          event_id: remoteEventId,
          local_updated_at: nowIso()
        })

        await offlineDb.pending_mutations.where('record_id').equals(mutation.record_id).modify({
          record_id: remoteEventId
        })

        if (mutation.id) {
          await offlineDb.pending_mutations.delete(mutation.id)
        }
      })

      continue
    }

    if (mutation.operation === 'update') {
      const { error } = await supabase
        .from('events')
        .update(mutation.payload || {})
        .eq('id', mutation.record_id)

      if (error) {
        throw new Error(`Failed to sync event update: ${error.message}`)
      }

      if (mutation.id) {
        await offlineDb.pending_mutations.delete(mutation.id)
      }

      continue
    }

    if (mutation.operation === 'delete') {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', mutation.record_id)

      if (error) {
        throw new Error(`Failed to sync event delete: ${error.message}`)
      }

      if (mutation.id) {
        await offlineDb.pending_mutations.delete(mutation.id)
      }
    }
  }
}

export const addLeadToOfflineQueue = async (leadPayload: Record<string, any>) => {
  const normalized = normalizeLeadForLocal(leadPayload, 'pending')
  const samePhoneRows = await offlineDb.leads.where('phone').equals(normalized.phone).toArray()

  if (!samePhoneRows.length) {
    return offlineDb.leads.add(normalized)
  }

  const sortedRows = [...samePhoneRows].sort((left, right) => getLeadTimestamp(right) - getLeadTimestamp(left))
  const latestRow = sortedRows[0]

  if (!latestRow.local_id) {
    return offlineDb.leads.add(normalized)
  }

  const mergedRow = mergeLatestLeadByPhone(latestRow, normalized)

  await offlineDb.transaction('rw', offlineDb.leads, async () => {
    await offlineDb.leads.update(latestRow.local_id as number, mergedRow)

    if (sortedRows.length > 1) {
      const duplicateLocalIds = sortedRows
        .slice(1)
        .map((row) => row.local_id)
        .filter((rowId): rowId is number => typeof rowId === 'number')

      if (duplicateLocalIds.length) {
        await offlineDb.leads.bulkDelete(duplicateLocalIds)
      }
    }
  })

  await consolidateLocalLeadsByPhone()

  return latestRow.local_id
}

const getLeadApiHeaders = async () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  return headers
}

const pushPendingLeadsToSupabase = async () => {
  await consolidateLocalLeadsByPhone()

  const pendingLeads = await offlineDb.leads
    .where('sync_status')
    .anyOf('pending', 'error')
    .toArray()
  pendingLeads.sort((left, right) => getLeadTimestamp(left) - getLeadTimestamp(right))

  const failedSyncIds: number[] = []
  const groupedByPhone = new Map<string, OfflineLead[]>()

  for (const lead of pendingLeads) {
    const normalizedPhone = normalizePhoneNumber(String(lead.phone ?? ''))

    if (!normalizedPhone) {
      logSyncWarning('pushPendingLeadsToSupabase invalid phone format', lead.phone)
      if (lead.local_id) {
        await offlineDb.leads.update(lead.local_id, {
          sync_status: 'error',
          local_updated_at: nowIso()
        })
        failedSyncIds.push(lead.local_id)
      }
      continue
    }

    if (!groupedByPhone.has(normalizedPhone)) {
      groupedByPhone.set(normalizedPhone, [])
    }

    groupedByPhone.get(normalizedPhone)!.push(lead)
  }

  const groupedLeads = Array.from(groupedByPhone.entries()).map(([normalizedPhone, grouped]) => {
    const sortedGroup = [...grouped].sort((left, right) => getLeadTimestamp(left) - getLeadTimestamp(right))
    const latestLead = sortedGroup[sortedGroup.length - 1]

    return {
      normalizedPhone,
      allLeads: sortedGroup,
      latestLead,
      mergedAudioText: buildMergedAudioText(sortedGroup)
    }
  })

  groupedLeads.sort((left, right) => getLeadTimestamp(left.latestLead) - getLeadTimestamp(right.latestLead))

  for (const groupedLead of groupedLeads) {
    const { latestLead, allLeads, normalizedPhone, mergedAudioText } = groupedLead

    const payload: Record<string, any> = { ...latestLead }
    delete payload.local_id
    delete payload.sync_status
    delete payload.local_updated_at
    delete payload.id
    delete payload.full_name
    delete payload.audio_file_local_id

    payload.phone = normalizedPhone
    payload.audio_file_text = mergedAudioText

    if (typeof payload.email === 'string' && payload.email.trim()) {
      payload.email = normalizeEmailAddress(payload.email)
    }

    if (typeof payload.audio_file_url === 'string' && isOfflineAudioRef(payload.audio_file_url)) {
      try {
        const localAudioBlob = await getAudioBlobByRef(payload.audio_file_url)
        if (!localAudioBlob) {
          logSyncWarning('pushPendingLeadsToSupabase local audio not found; retrying later', {
            local_id: latestLead.local_id,
            audio_file_url: payload.audio_file_url,
          })
          continue
        }

        const cloudinaryUrl = await uploadAudioBlobToCloudinary(
          localAudioBlob,
          `lead-${latestLead.phone || Date.now()}.webm`
        )
        payload.audio_file_url = cloudinaryUrl

        if (latestLead.audio_file_local_id) {
          await markLocalAudioUploaded(latestLead.audio_file_local_id, cloudinaryUrl)
        }
      } catch (audioUploadError) {
        logSyncWarning('pushPendingLeadsToSupabase audio upload failed; retrying later', {
          error: audioUploadError,
          local_id: latestLead.local_id,
        })
        continue
      }
    }

    const headers = await getLeadApiHeaders()

    const response = await fetch('/api/leads', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null)
      logSyncWarning('pushPendingLeadsToSupabase request failed', {
        status: response.status,
        error: errorBody,
        payload,
      })

      for (const groupedRow of allLeads) {
        if (!groupedRow.local_id) continue

        await offlineDb.leads.update(groupedRow.local_id, {
          sync_status: 'error',
          local_updated_at: nowIso()
        })
        failedSyncIds.push(groupedRow.local_id)
      }
      continue
    }

    const responseBody = await response.json()
    const mergedLead = responseBody?.lead ?? responseBody

    for (const groupedRow of allLeads) {
      if (!groupedRow.local_id) continue

      await offlineDb.leads.update(groupedRow.local_id, {
        ...normalizeLeadForLocal(mergedLead, 'synced'),
        id: mergedLead.id,
        audio_file_text:
          mergedLead?.audio_file_text ?? payload.audio_file_text ?? groupedRow.audio_file_text ?? null,
        audio_file_local_id: latestLead.audio_file_local_id ?? null
      })
    }
  }

  if (failedSyncIds.length > 0) {
    throw new Error(`Failed to sync ${failedSyncIds.length} lead(s) to Supabase`)
  }
}

export const pullEventsFromSupabase = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) throw new Error(error.message)

  await cacheEventsFromRemote(data || [])
  return data || []
}

export const pullLeadsForEventFromSupabase = async (eventId: string) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  for (const lead of data || []) {
    await upsertSyncedLead(lead)
  }

  return data || []
}

export const pullAllLeadsFromSupabase = async () => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  await cacheAllLeadsFromRemote(data || [])
  return data || []
}

const runWithSyncLock = async (work: () => Promise<void>) => {
  if (!activeSync) {
    activeSync = work()
  }

  try {
    await activeSync
  } finally {
    activeSync = null
  }
}

export const syncEverything = async () => {
  if (!isBrowserOnline()) return

  await runWithSyncLock(async () => {
    await processPendingEventMutations()
    await pushPendingLeadsToSupabase()

    const [events, leads] = await Promise.all([
      pullEventsFromSupabase(),
      pullAllLeadsFromSupabase()
    ])

    await cacheEventsFromRemote(events)
    await cacheAllLeadsFromRemote(leads)
  })
}

export const syncEventsCache = async () => {
  if (isBrowserOnline()) {
    try {
      await runWithSyncLock(async () => {
        await processPendingEventMutations()
        await pushPendingLeadsToSupabase()
        await pullEventsFromSupabase()
      })
    } catch (error) {
      logSyncWarning('syncEventsCache remote sync failed; using cached events', error)
      // Fall back to cached events when sync steps fail.
    }
  }

  return getCachedEvents()
}

export const syncLeadsForEvent = async (eventId: string) => {
  if (isBrowserOnline()) {
    try {
      await runWithSyncLock(async () => {
        try {
          await processPendingEventMutations()
          await pushPendingLeadsToSupabase()
        } catch (error) {
          logSyncWarning('syncLeadsForEvent write sync failed; continuing with event lead pull', error)
          // Keep going: read path should still work even if pending writes fail.
        }

        await pullLeadsForEventFromSupabase(eventId)
      })
    } catch (error) {
      logSyncWarning('syncLeadsForEvent remote pull failed; using cached event leads', error)
      // Fall back to cached event leads when remote pull fails.
    }
  }

  return getCachedLeadsByEvent(eventId)
}

export const syncAllLeadsCache = async () => {
  if (isBrowserOnline()) {
    try {
      await runWithSyncLock(async () => {
        await processPendingEventMutations()
        await pushPendingLeadsToSupabase()
        await pullAllLeadsFromSupabase()
      })
    } catch (error) {
      logSyncWarning('syncAllLeadsCache remote sync failed; using cached leads', error)
      // Fall back to cached leads when sync steps fail.
    }
  }

  return getCachedLeads()
}

export const createLeadWithOfflineSync = async (
  leadPayload: Record<string, any>
): Promise<LeadSaveResult> => {
  const normalizedPhone = normalizePhoneNumber(String(leadPayload.phone ?? ''))
  if (!normalizedPhone) {
    throw new Error('Invalid phone number format')
  }

  const normalizedLeadPayload: Record<string, any> = {
    ...leadPayload,
    phone: normalizedPhone,
    email:
      typeof leadPayload.email === 'string' && leadPayload.email.trim()
        ? normalizeEmailAddress(leadPayload.email)
        : leadPayload.email
  }

  await addLeadToOfflineQueue(normalizedLeadPayload)

  if (!isBrowserOnline()) {
    return {
      savedLocally: true,
      synced: false,
      message: 'Saved locally. Not synced with global DB yet; it will auto-sync when internet returns.'
    }
  }

  try {
    await runWithSyncLock(async () => {
      await processPendingEventMutations()
      await pushPendingLeadsToSupabase()
      await pullLeadsForEventFromSupabase(String(normalizedLeadPayload.event_id))
    })

    return {
      savedLocally: true,
      synced: true,
      message: 'Saved and synced successfully.'
    }
  } catch (error) {
    logSyncWarning('createLeadWithOfflineSync immediate sync failed; lead kept in local queue', error)
    return {
      savedLocally: true,
      synced: false,
      message: 'Saved locally. Sync is pending and will run automatically when internet is stable.'
    }
  }
}

export const createEventWithOfflineSync = async (eventPayload: Record<string, any>) => {
  if (isBrowserOnline()) {
    const { data, error } = await supabase
      .from('events')
      .insert([eventPayload])
      .select()
      .single()

    if (error) throw new Error(error.message)

    await pullEventsFromSupabase()
    return data
  }

  const localId = createLocalEventId()
  const localEvent = normalizeEvent({ ...eventPayload, id: localId })

  await offlineDb.transaction('rw', offlineDb.events, offlineDb.pending_mutations, async () => {
    await offlineDb.events.put(localEvent)
    await setPendingMutation('create', localId, eventPayload)
  })

  return localEvent
}

export const updateEventWithOfflineSync = async (
  eventId: string,
  eventPayload: Record<string, any>
) => {
  if (isBrowserOnline()) {
    const { error } = await supabase
      .from('events')
      .update(eventPayload)
      .eq('id', eventId)

    if (error) throw new Error(error.message)

    await pullEventsFromSupabase()
    return
  }

  const existingCreateMutation = await offlineDb.pending_mutations
    .where('record_id')
    .equals(eventId)
    .and((mutation) => mutation.operation === 'create')
    .first()

  await offlineDb.events.update(eventId, {
    ...eventPayload,
    cached_at: Date.now()
  })

  if (existingCreateMutation?.id) {
    await offlineDb.pending_mutations.update(existingCreateMutation.id, {
      payload: {
        ...(existingCreateMutation.payload || {}),
        ...eventPayload
      }
    })
    return
  }

  await setPendingMutation('update', eventId, eventPayload)
}

export const deleteEventWithOfflineSync = async (eventId: string) => {
  if (isBrowserOnline()) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) throw new Error(error.message)

    await pullEventsFromSupabase()
    return
  }

  await offlineDb.transaction('rw', offlineDb.events, offlineDb.leads, offlineDb.pending_mutations, async () => {
    await offlineDb.events.delete(eventId)
    await offlineDb.leads.where('event_id').equals(eventId).delete()

    if (eventId.startsWith('local-event-')) {
      await offlineDb.pending_mutations.where('record_id').equals(eventId).delete()
      return
    }

    await setPendingMutation('delete', eventId)
  })
}
