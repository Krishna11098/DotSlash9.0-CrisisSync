import { NextRequest, NextResponse } from 'next/server';

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    // Validation
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum 5 images allowed' },
        { status: 400 }
      );
    }

    // Validate each file
    for (const file of files) {
      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: 'Invalid file format' },
          { status: 400 }
        );
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, error: 'All files must be images' },
          { status: 400 }
        );
      }

      // Check file size (max 10MB per file)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'Each image must be less than 10MB' },
          { status: 400 }
        );
      }
    }

    // Forward to Python OCR service
    const ocrFormData = new FormData();
    files.forEach(file => {
      ocrFormData.append('files', file as Blob);
    });

    console.log(`📤 Forwarding ${files.length} images to OCR service...`);

    const response = await fetch(`${OCR_SERVICE_URL}/api/ocr/scan-multiple`, {
      method: 'POST',
      body: ocrFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.detail || 'OCR service failed',
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ OCR service responded:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
