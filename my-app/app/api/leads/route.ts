import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { normalizeEmailAddress, normalizePhoneNumber } from '@/lib/validation'

const isEmptyValue = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

const normalizeTranscriptionText = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const mergeTranscriptionText = (existingValue: unknown, incomingValue: unknown) => {
  const existingText = normalizeTranscriptionText(existingValue)
  const incomingText = normalizeTranscriptionText(incomingValue)

  if (!incomingText) return existingText || null
  if (!existingText) return incomingText
  if (existingText === incomingText) return existingText

  const existingChunks = existingText
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (existingChunks.includes(incomingText)) {
    return existingText
  }

  return `${existingText}\n\n${incomingText}`
}

const normalizeLeadPayload = (payload: Record<string, any>) => {
  const normalizedPhone = normalizePhoneNumber(String(payload.phone ?? ''))
  if (!normalizedPhone) {
    throw new Error('Invalid phone number')
  }

  const resolvedName =
    typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : typeof payload.full_name === 'string' && payload.full_name.trim()
        ? payload.full_name.trim()
        : ''

  if (!resolvedName) {
    throw new Error('Name is required')
  }

  const normalizedPayload: Record<string, any> = {
    ...payload,
    name: resolvedName,
    phone: normalizedPhone,
    created_at: payload.created_at ?? new Date().toISOString()
  }

  delete normalizedPayload.full_name
  delete normalizedPayload.id

  if (typeof payload.email === 'string' && payload.email.trim()) {
    normalizedPayload.email = normalizeEmailAddress(payload.email)
  }

  if (isEmptyValue(normalizedPayload.audio_file_text) && typeof payload.transcribed_text === 'string') {
    normalizedPayload.audio_file_text = payload.transcribed_text.trim() || null
  }

  return normalizedPayload
}

const buildMergeUpdate = (existingLead: Record<string, any>, incomingLead: Record<string, any>) => {
  const mergedUpdate: Record<string, any> = {}

  const mergedTranscription = mergeTranscriptionText(
    existingLead.audio_file_text ?? existingLead.transcribed_text,
    incomingLead.audio_file_text ?? incomingLead.transcribed_text
  )

  if (mergedTranscription !== (existingLead.audio_file_text ?? null)) {
    mergedUpdate.audio_file_text = mergedTranscription
  }

  for (const [key, existingValue] of Object.entries(existingLead)) {
    if (key === 'id' || key === 'created_at') continue
    if (key === 'audio_file_text' || key === 'transcribed_text') continue
    if (!(key in incomingLead)) continue

    const incomingValue = incomingLead[key]
    if (isEmptyValue(existingValue) && !isEmptyValue(incomingValue)) {
      mergedUpdate[key] = incomingValue
    }
  }

  mergedUpdate.updated_at = new Date().toISOString()
  return mergedUpdate
}

const isDuplicateKeyError = (error: { code?: string; message?: string } | null) => {
  if (!error) return false
  if (error.code === '23505') return true
  return typeof error.message === 'string' && error.message.toLowerCase().includes('duplicate key')
}

const resolveDuplicateByPhone = async (
  supabaseClient: ReturnType<typeof createServerSupabaseClient>,
  normalizedBody: Record<string, any>
) => {
  const { data: existingRows, error: fetchError } = await supabaseClient
    .from('leads')
    .select('*')
    .eq('phone', normalizedBody.phone)
    .order('created_at', { ascending: false })
    .limit(1)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 })
  }

  const existingLead = existingRows?.[0]
  if (!existingLead) {
    return NextResponse.json({ error: 'Duplicate phone detected but existing lead was not found' }, { status: 409 })
  }

  const mergeUpdate = buildMergeUpdate(existingLead, normalizedBody)
  const hasMeaningfulUpdate = Object.keys(mergeUpdate).some((key) => key !== 'updated_at')

  if (!hasMeaningfulUpdate) {
    return NextResponse.json({ action: 'duplicate', lead: existingLead }, { status: 200 })
  }

  const { data: updatedLead, error: updateError } = await supabaseClient
    .from('leads')
    .update(mergeUpdate)
    .eq('id', existingLead.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ action: 'merged', lead: updatedLead }, { status: 200 })
}

// GET /api/leads - List all leads
export async function GET(request: NextRequest) {
  try {
    const supabaseClient = createServerSupabaseClient(request.headers.get('authorization') ?? undefined)
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const stage = searchParams.get('stage')

    let query = supabaseClient
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    if (stage) {
      query = query.eq('stage', stage)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/leads - Create new lead
export async function POST(request: NextRequest) {
  try {
    const supabaseClient = createServerSupabaseClient(request.headers.get('authorization') ?? undefined)
    const body = await request.json()
    const normalizedBody = normalizeLeadPayload(body)

    const { data: existingRows, error: findError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('phone', normalizedBody.phone)
      .order('created_at', { ascending: true })
      .limit(1)

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 400 })
    }

    const existingLead = existingRows?.[0]

    if (existingLead) {
      const mergeUpdate = buildMergeUpdate(existingLead, normalizedBody)

      const hasMeaningfulUpdate = Object.keys(mergeUpdate).some((key) => key !== 'updated_at')
      if (hasMeaningfulUpdate) {
        const { data, error } = await supabaseClient
          .from('leads')
          .update(mergeUpdate)
          .eq('id', existingLead.id)
          .select()
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ action: 'merged', lead: data }, { status: 200 })
      }

      return NextResponse.json({ action: 'duplicate', lead: existingLead }, { status: 200 })
    }

    const { data, error } = await supabaseClient
      .from('leads')
      .insert([normalizedBody])
      .select()
      .single()

    if (error) {
      if (isDuplicateKeyError(error)) {
        return resolveDuplicateByPhone(supabaseClient, normalizedBody)
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ action: 'created', lead: data }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
