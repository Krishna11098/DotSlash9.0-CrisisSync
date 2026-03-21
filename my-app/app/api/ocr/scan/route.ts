import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      )
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      )
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }
    const ocrServiceUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8001'
    const ocrFormData = new FormData()
    ocrFormData.append('file', file)
    console.log(`📤 Forwarding to OCR service: ${ocrServiceUrl}/api/ocr/scan`)
    const ocrResponse = await fetch(`${ocrServiceUrl}/api/ocr/scan`, {
      method: 'POST',
      body: ocrFormData,
    })
    if (!ocrResponse.ok) {
      const errorData = await ocrResponse.json()
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.detail || 'OCR processing failed' 
        },
        { status: ocrResponse.status }
      )
    }
    const result = await ocrResponse.json()
    console.log('✅ OCR processing successful')
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ OCR API Error:', error)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OCR service unavailable. Please ensure the OCR service is running on port 8001.' 
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during OCR processing' 
      },
      { status: 500 }
    )
  }
}
export async function GET(request: NextRequest) {
  try {
    const ocrServiceUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8001'
    const response = await fetch(`${ocrServiceUrl}/health`)
    const data = await response.json()
    
    return NextResponse.json({
      status: 'ok',
      ocrService: data,
      message: 'OCR service is connected and healthy'
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'OCR service is not reachable. Make sure it is running on port 8001.'
      },
      { status: 503 }
    )
  }
}
