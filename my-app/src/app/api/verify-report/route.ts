import { NextRequest, NextResponse } from "next/server";
import { processSubmission } from "@/lib/pipeline";

/**
 * 🚀 API Route: /api/verify-report
 * 
 * POST endpoint for submitting a report (image + description)
 * Returns: Full verification + priority assessment
 * 
 * Request body:
 * {
 *   image: "base64_string_or_url",
 *   text_description: "Description of the issue",
 *   location: "Location name (optional)",
 *   report_count: 1,
 *   coordinates: { lat: 0, lng: 0 } (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.image || !body.text_description) {
      return NextResponse.json(
        { error: "Missing required fields: image and text_description" },
        { status: 400 }
      );
    }

    // Log submission
    console.log("📨 New report submission received");
    console.log(`   Description: ${body.text_description.substring(0, 50)}...`);
    console.log(`   Location: ${body.location || "Not specified"}`);

    // Process through pipeline
    const result = await processSubmission({
      image: body.image,
      text_description: body.text_description,
      location: body.location,
      report_count: body.report_count || 1,
      coordinates: body.coordinates,
    });

    // Log results
    console.log(`✅ Processing complete`);
    console.log(`   Priority: ${result.priority.priority_level}`);
    console.log(`   Score: ${result.priority.priority_score}/100`);
    console.log(`   Approved: ${result.approved}`);

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
    console.error("❌ Error processing report:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    status: "🟢 Multimodal Truth + Priority Engine is running",
    version: "1.0.0",
    capabilities: [
      "✅ Image Content Moderation (Sightengine)",
      "✅ Spam Detection (Heuristic)",
      "✅ Image Description (Google Gemini)",
      "✅ Keyword Matching (Gemini + User Text)",
      "✅ Scene Analysis (Sightengine)",
      "✅ Intelligent Priority Ranking",
    ],
    endpoints: {
      submit_report: "POST /api/verify-report",
      get_status: "GET /api/verify-report",
    },
  });
}
