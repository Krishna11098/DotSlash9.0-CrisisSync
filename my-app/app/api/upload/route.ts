import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary not configured on server' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'xorcists/uploads'
    const resourceType = (formData.get('resource_type') as string) || 'auto'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Create signed upload params
    const timestamp = Math.floor(Date.now() / 1000)
    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`

    // Generate SHA-1 signature
    const encoder = new TextEncoder()
    const data = encoder.encode(signaturePayload)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Build upload form
    const uploadForm = new FormData()
    uploadForm.append('file', file)
    uploadForm.append('folder', folder)
    uploadForm.append('timestamp', String(timestamp))
    uploadForm.append('api_key', apiKey)
    uploadForm.append('signature', signature)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      { method: 'POST', body: uploadForm }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[cloudinary-upload] Error:', errorText)
      return NextResponse.json(
        { error: 'Upload failed', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json({
      secure_url: result.secure_url,
      url: result.url,
      public_id: result.public_id,
    })
  } catch (error) {
    console.error('[cloudinary-upload] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
