import { offlineDb } from '@/lib/offline-db'

const OFFLINE_AUDIO_PREFIX = 'offline-audio://'
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''
const CLOUDINARY_API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || ''
const CLOUDINARY_API_SECRET = process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET || ''

const nowIso = () => new Date().toISOString()

const toSha1Hex = async (input: string) => {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-1', bytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

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

export const uploadAudioBlobToCloudinary = async (blob: Blob, fileName?: string): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary cloud name not configured')
  }

  const folder = 'htt_xspark/lead-audio'
  const uploadData = new FormData()
  uploadData.append('file', blob, fileName || 'recording.webm')

  if (CLOUDINARY_UPLOAD_PRESET) {
    uploadData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    uploadData.append('folder', folder)
  } else if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    const timestamp = Math.floor(Date.now() / 1000)
    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`
    const signature = await toSha1Hex(signaturePayload)

    uploadData.append('folder', folder)
    uploadData.append('timestamp', String(timestamp))
    uploadData.append('api_key', CLOUDINARY_API_KEY)
    uploadData.append('signature', signature)
  } else {
    throw new Error('Cloudinary upload preset not set, and signed upload credentials are incomplete')
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: uploadData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown Cloudinary error')
    throw new Error(errorText)
  }

  const data = await response.json()
  if (!data?.secure_url && !data?.url) {
    throw new Error('Cloudinary response did not include a URL')
  }

  return data.secure_url || data.url
}

export const markLocalAudioUploaded = async (audioId: string, uploadedUrl: string) => {
  await offlineDb.audio_files.update(audioId, {
    uploaded_url: uploadedUrl,
    uploaded_at: nowIso(),
  })
}
