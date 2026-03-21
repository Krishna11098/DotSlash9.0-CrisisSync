import { NextRequest, NextResponse } from "next/server";
import { processSubmission } from "@/lib/report-pipeline";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.image || !body.text_description) {
      return NextResponse.json(
        { error: "Missing required fields: image and text_description" },
        { status: 400 }
      );
    }

    const result = await processSubmission({
      image: body.image,
      text_description: body.text_description,
      audio: body.audio,
      location: body.location,
      report_count: body.report_count || 1,
      coordinates: body.coordinates,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        metadata: {
          processed_at: new Date().toISOString(),
          processing_version: "1.0.0-multimodal",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Multimodal Truth + Priority Engine is running",
    version: "1.0.0",
    endpoints: {
      submit_report: "POST /api/verify-report",
      get_status: "GET /api/verify-report",
    },
  });
}
