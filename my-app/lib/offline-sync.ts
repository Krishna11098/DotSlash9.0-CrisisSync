import { getAudioBlobByRef, isOfflineAudioRef, markLocalAudioUploaded, parseOfflineAudioId, uploadAudioBlobToCloudinary } from '@/lib/audio-storage'
import { offlineDb, type OfflineRequest } from '@/lib/offline-db'
import { supabase } from '@/lib/supabase'

export type SyncStatusSnapshot = {
  isOnline: boolean
  isSyncing: boolean
  pendingRequestCount: number
  errorRequestCount: number
}

const nowIso = () => new Date().toISOString()
let activeSync: Promise<void> | null = null

export const isBrowserOnline = () => {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

export const getSyncStatusSnapshot = async (): Promise<SyncStatusSnapshot> => {
  const [pendingRequestCount, errorRequestCount] = await Promise.all([
    offlineDb.requests.where('sync_status').equals('pending').count(),
    offlineDb.requests.where('sync_status').equals('error').count()
  ])

  return {
    isOnline: isBrowserOnline(),
    isSyncing: !!activeSync,
    pendingRequestCount,
    errorRequestCount
  }
}

export const saveRequestOffline = async (request: Partial<OfflineRequest>): Promise<{ savedLocally: boolean, message: string }> => {
  try {
    const newRequest: OfflineRequest = {
      ...request,
      id: request.id || crypto.randomUUID(), // Enforce UUID client-side
      sync_status: 'pending',
      client_created_at: request.client_created_at || nowIso(),
    } as OfflineRequest

    await offlineDb.requests.add(newRequest)
    // Try syncing immediately
    syncRequests()
    return { savedLocally: true, message: 'Request saved offline. Will sync when online.' }
  } catch (err) {
    console.error('Failed to save offline:', err)
    return { savedLocally: false, message: 'Failed to save offline.' }
  }
}

export const syncRequests = async (): Promise<void> => {
  if (!isBrowserOnline()) {
    console.log('[Sync] 📡 Offline - skipping sync')
    return
  }
  if (activeSync) {
    console.log('[Sync] ⏳ Sync already in progress')
    return activeSync
  }

  console.log('[Sync] 🔄 Starting sync of offline requests...')

  activeSync = (async () => {
    try {
      const pendingRequests = await offlineDb.requests.where('sync_status').equals('pending').toArray()
      
      // Explicit queue sort logic: manually marked urgent first, then by timestamp (FIFO)
      pendingRequests.sort((a, b) => {
        const getPriorityWeight = (urgency: string) => {
          if (urgency === 'emergency') return 3
          if (urgency === 'urgent') return 2
          return 1
        }
        const weightA = getPriorityWeight(a.urgency)
        const weightB = getPriorityWeight(b.urgency)
        if (weightA !== weightB) {
          return weightB - weightA // Higher urgency weight first
        }
        // FIFO otherwise
        return new Date(a.client_created_at).getTime() - new Date(b.client_created_at).getTime()
      })

      console.log(`[Sync] 📦 Found and prioritized ${pendingRequests.length} pending requests`)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('[Sync] ❌ Not logged in, cannot sync')
        return
      }

      for (const request of pendingRequests) {
        console.log(`[Sync] 📤 Syncing request: "${request.topic?.substring(0, 30)}..."`)

        // Discard logic for urgent/emergency with time limit
        if ((request.urgency === 'emergency' || request.urgency === 'urgent') && request.time_limit_minutes) {
          const clientTime = new Date(request.client_created_at).getTime()
          const currentTime = new Date().getTime()
          const diffMinutes = (currentTime - clientTime) / (1000 * 60)

          if (diffMinutes > request.time_limit_minutes) {
            console.log(`[Sync] ⏰ REQUEST EXPIRED: "${request.topic}" (${Math.round(diffMinutes)}m > ${request.time_limit_minutes}m)`)
            if (request.local_id) {
              await offlineDb.requests.delete(request.local_id)
            }
            continue
          }
          console.log(`[Sync] ✅ Time check passed: ${Math.round(diffMinutes)}m / ${request.time_limit_minutes}m`)
        }

        // Upload audio if stored locally
        let resolvedAudioUrl = request.audio_url

        if (isOfflineAudioRef(resolvedAudioUrl)) {
          console.log('[Sync] 🎙️  Uploading offline audio to Cloudinary...')
          const audioBlob = await getAudioBlobByRef(resolvedAudioUrl)
          if (audioBlob) {
            try {
              const uploadedUrl = await uploadAudioBlobToCloudinary(audioBlob, 'auth-req-audio.webm')
              resolvedAudioUrl = uploadedUrl
              console.log('[Sync] ✅ Audio uploaded:', uploadedUrl)

              const parsedAudioId = parseOfflineAudioId(request.audio_url)
              if (parsedAudioId) {
                await markLocalAudioUploaded(parsedAudioId, uploadedUrl)
              }
            } catch (uploadError) {
              console.error('[Sync] ❌ Error uploading offline audio:', uploadError)
              continue
            }
          }
        }

        // Call verification + routing API (same as online submission)
        console.log('[Sync] 🔐 Calling verification & routing API...')
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const authToken = session?.access_token

          if (!authToken) {
            throw new Error('Session expired - cannot sync')
          }

          const apiResponse = await fetch('/api/submit-request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              image: request.image_url || '',
              text_description: request.topic,
              audio: resolvedAudioUrl || null,
              location: `${request.latitude}, ${request.longitude}`,
              departments: request.departments,
              coordinates: { lat: request.latitude, lng: request.longitude },
              report_count: 1,
              client_report_id: request.id,
              client_created_at: request.client_created_at,
            }),
          })

          if (!apiResponse.ok) {
            const errorData = await apiResponse.json()
            console.error('[Sync] ❌ API error:', errorData)
            throw new Error(errorData.error || 'Verification failed')
          }

          const apiData = await apiResponse.json()
          console.log('[Sync] ✅ Verification & routing successful!')
          console.log('[Sync] 📊 Priority:', apiData.data?.priority)
          console.log('[Sync] 📊 Response:', apiData.data)

          // Delete from local storage after successful sync
          if (request.local_id) {
            await offlineDb.requests.delete(request.local_id)
            console.log(`[Sync] 🗑️  Deleted local copy (ID: ${request.local_id})`)
          }

          // Dispatch event to notify UI of sync completion
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-sync-complete', {
              detail: {
                success: true,
                data: apiData.data,
                requestId: request.topic
              }
            }))
            console.log('[Sync] 📢 Dispatched sync-complete event')
          }
        } catch (apiError) {
          console.error('[Sync] ❌ Failed to call verification API:', apiError)
          if (request.local_id) {
            await offlineDb.requests.update(request.local_id, {
              sync_status: 'error'
            })
            console.log(`[Sync] ⚠️  Marked request as error, will retry`)
          }
        }
      }

      console.log('[Sync] ✅ Sync cycle complete!')
    } catch (err) {
      console.error('[Sync] ❌ Sync failed:', err)
    } finally {
      activeSync = null
    }
  })()

  return activeSync
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Sync] 🌐 Online event detected - starting sync immediately')
    syncRequests()
  })

  // Poll every 5 seconds for pending data that needs syncing
  setInterval(() => {
    syncRequests()
  }, 5000)
}
