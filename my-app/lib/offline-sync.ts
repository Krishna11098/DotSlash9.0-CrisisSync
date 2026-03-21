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
      sync_status: 'pending',
      client_created_at: nowIso(),
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
    console.log("[offline-sync] Not online, skipping sync");
    return;
  }
  if (activeSync) {
    console.log("[offline-sync] Already syncing, skipping");
    return activeSync;
  }

  console.log("[offline-sync] Starting sync...");
  activeSync = (async () => {
    try {
      const pendingRequests = await offlineDb.requests.where('sync_status').equals('pending').toArray()
      console.log(`[offline-sync] Found ${pendingRequests.length} pending requests to sync`);
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log("[offline-sync] No user, cannot sync");
        return;
      }

      for (const request of pendingRequests) {
        // Discard logic for urgent/emergency
        if ((request.urgency === 'emergency' || request.urgency === 'urgent') && request.time_limit_minutes) {
          const clientTime = new Date(request.client_created_at).getTime()
          const currentTime = new Date().getTime()
          const diffMinutes = (currentTime - clientTime) / (1000 * 60)

          if (diffMinutes > request.time_limit_minutes) {
            // Discard request
            console.log(`Discarding request ${request.topic} because it exceeded ${request.time_limit_minutes} minutes`)
            if (request.local_id) {
              await offlineDb.requests.delete(request.local_id)
            }
            continue
          }
        }

        let resolvedAudioUrl = request.audio_url

        if (isOfflineAudioRef(resolvedAudioUrl)) {
          const audioBlob = await getAudioBlobByRef(resolvedAudioUrl)
          if (audioBlob) {
            try {
              const uploadedUrl = await uploadAudioBlobToCloudinary(audioBlob, 'auth-req-audio.webm')
              resolvedAudioUrl = uploadedUrl

              const parsedAudioId = parseOfflineAudioId(request.audio_url)
              if (parsedAudioId) {
                await markLocalAudioUploaded(parsedAudioId, uploadedUrl)
              }
            } catch (uploadError) {
              console.error('Error uploading offline audio:', uploadError)
              continue
            }
          }
        }

        // Prepare for supabase
        const payload = {
          user_id: user.id,
          topic: request.topic,
          image_url: request.image_url,
          audio_url: resolvedAudioUrl,
          latitude: request.latitude,
          longitude: request.longitude,
          departments: request.departments,
          urgency: request.urgency,
          time_limit_minutes: request.time_limit_minutes,
          status: 'pending',
          client_created_at: request.client_created_at,
          // IMPORTANT: Include priority_number if available, default to 0 only as fallback
          priority_number: (request as any).priority_number || 0,
        }

        const { error } = await supabase.from('requests').insert(payload)

        if (error) {
          console.error('Error syncing request:', error)
          if (request.local_id) {
             await offlineDb.requests.update(request.local_id, {
               sync_status: 'error'
             })
          }
        } else {
          if (request.local_id) {
             await offlineDb.requests.delete(request.local_id)
          }
        }
      }
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      activeSync = null
    }
  })()

  return activeSync
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log("[offline-sync] Browser came online, syncing pending requests...");
    syncRequests()
  })

  // Poll every minute to check if pending data has expired 
  // or needs to be synced
  setInterval(() => {
    syncRequests()
  }, 60000)
}
