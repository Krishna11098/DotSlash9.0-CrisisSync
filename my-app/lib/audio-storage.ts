import { offlineDb } from '@/lib/offline-db'

const OFFLINE_AUDIO_PREFIX = 'offline-audio://'

const nowIso = () => new Date().toISOString()

const createOfflineAudioId = () => {
  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  return `audio-${generated}`
}

export const buildOfflineAudioRef = (audioId: string, fileName?: string) => {
  const encodedName = encodeURIComponent(fileName || 'recording.webm')
  return `${OFFLINE_AUDIO_PREFIX}${audioId}/${encodedName}`
}

export const isOfflineAudioRef = (url: string | null | undefined) => {
  return typeof url === 'string' && url.startsWith(OFFLINE_AUDIO_PREFIX)
}

export const parseOfflineAudioId = (url: string | null | undefined) => {
  if (!isOfflineAudioRef(url)) return null
  const withoutPrefix = String(url).slice(OFFLINE_AUDIO_PREFIX.length)
  const slashIndex = withoutPrefix.indexOf('/')
  if (slashIndex <= 0) return null
  return withoutPrefix.slice(0, slashIndex)
}

export const saveAudioBlobLocally = async (blob: Blob, fileName?: string) => {
  const audioId = createOfflineAudioId()

  await offlineDb.audio_files.put({
    id: audioId,
    file_name: fileName || null,
    mime_type: blob.type || null,
    blob,
    created_at: nowIso(),
    uploaded_url: null,
    uploaded_at: null,
  })

  return {
    audioId,
    offlineAudioRef: buildOfflineAudioRef(audioId, fileName),
  }
}

export const getAudioBlobByRef = async (audioRefOrId: string | null | undefined) => {
  if (!audioRefOrId) return null

  const audioId = isOfflineAudioRef(audioRefOrId)
    ? parseOfflineAudioId(audioRefOrId)
    : audioRefOrId

  if (!audioId) return null

  const record = await offlineDb.audio_files.get(audioId)
  return record?.blob || null
}

/**
 * Upload an audio blob to Cloudinary via the server-side API route.
 * This keeps API keys secure on the server.
 */
export const uploadAudioBlobToCloudinary = async (blob: Blob, fileName?: string): Promise<string> => {
  const formData = new FormData()
  formData.append('file', blob, fileName || 'recording.webm')
  formData.append('folder', 'xorcists/audio')
  formData.append('resource_type', 'auto')

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(errorData.error || 'Audio upload failed')
  }

  const data = await response.json()
  if (!data?.secure_url && !data?.url) {
    throw new Error('Upload response did not include a URL')
  }

  return data.secure_url || data.url
}

export const markLocalAudioUploaded = async (audioId: string, uploadedUrl: string) => {
  await offlineDb.audio_files.update(audioId, {
    uploaded_url: uploadedUrl,
    uploaded_at: nowIso(),
  })
}
