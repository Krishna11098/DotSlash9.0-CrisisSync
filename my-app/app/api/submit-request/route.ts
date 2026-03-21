import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { processSubmission } from "@/lib/report-pipeline";
import { FinalResponse } from "@/lib/report-types";

/**
 * POST /api/submit-request
 * 
 * Complete workflow:
 * 1. Verify image + at least one of (audio/text)
 * 2. Run through verification pipeline (deepfake, spam, etc.)
 * 3. Calculate priority_score (0-100)
 * 4. If priority < 20: Discard request
 * 5. If priority >= 20: Save to DB + route to gov employees
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Validate at least 1 and at most 3 of: image, audio, text_description
    const filledFields = [
      !!body.image,
      !!body.audio,
      !!body.text_description,
    ].filter(Boolean).length;

    if (filledFields < 1 || filledFields > 3) {
      return NextResponse.json(
        { error: "Please provide between 1 and 3 of: image, audio, or text description" },
        { status: 400 }
      );
    }

    // Validate at least one department is selected
    if (!body.departments || body.departments.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one department for routing" },
        { status: 400 }
      );
    }

    // Validate department values
    const validDepartments = ["hospital", "fire", "police", "municipal corporation"];
    const invalidDepts = body.departments.filter((d: string) => !validDepartments.includes(d));
    if (invalidDepts.length > 0) {
      return NextResponse.json(
        { error: `Invalid departments: ${invalidDepts.join(", ")}` },
        { status: 400 }
      );
    }

    console.log("🚀 [submit-request] Starting submission processing...");
    console.log(`📋 [submit-request] Input Data:`);
    console.log(`   - image: ${body.image.substring(0, 50)}...`);
    console.log(`   - text_description: "${body.text_description.substring(0, 80)}..."`);
    console.log(`   - audio: ${body.audio ? "present" : "none"}`);
    console.log(`   - location: "${body.location}"`);
    console.log(`   - departments: [${body.departments.join(", ")}]`);

    // ========================================================================
    // STEP 1: Run verification pipeline
    // ========================================================================
    const verificationResult = await processSubmission({
      image: body.image,
      text_description: body.text_description || "",
      audio: body.audio,
      location: body.location || "",
      report_count: body.report_count || 1,
      coordinates: body.coordinates,
    });

    const priorityScore = verificationResult.priority.priority_score;
    console.log(`\n✅ [submit-request] Verification Complete:`);
    console.log(`📊 Priority score: ${priorityScore}`);
    console.log(`📊 Priority level: ${verificationResult.priority.priority_level}`);
    console.log(`📊 Department: ${verificationResult.priority.department}`);
    console.log(`📊 Is fake: ${verificationResult.is_fake}`);
    console.log(`📊 Confidence: ${(verificationResult.confidence * 100).toFixed(1)}%`);

    // ========================================================================
    // STEP 2: Check if priority < 20 → DISCARD
    // ========================================================================
    if (priorityScore < 20) {
      console.log("🚫 [submit-request] Priority < 20, discarding request");
      return NextResponse.json(
        {
          success: false,
          data: verificationResult,
          status: "discarded",
          reason: "Request priority too low (< 20). Report has been archived.",
          message: "Thank you for the report, but this issue does not meet the priority threshold for immediate action.",
        },
        { status: 200 }
      );
    }

    // ========================================================================
    // STEP 3: Get authenticated user
    // ========================================================================
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized - no auth header" },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ [submit-request] Auth error:", authError);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`👤 [submit-request] User: ${user.id}`);

    // ========================================================================
    // STEP 4: Map priority_score to urgency level
    // ========================================================================
    let urgency: "emergency" | "urgent" | "moderate";
    let timeLimitMinutes: number;

    if (priorityScore >= 80) {
      urgency = "emergency";
      timeLimitMinutes = 5;
    } else if (priorityScore >= 40) {
      urgency = "urgent";
      timeLimitMinutes = 15;
    } else {
      urgency = "moderate";
      timeLimitMinutes = 30;
    }

    console.log(`⏱️ [submit-request] Urgency: ${urgency}, Time limit: ${timeLimitMinutes}m`);

    // ========================================================================
    // STEP 5: Save request to database
    // ========================================================================
    const now = new Date().toISOString();

    console.log(`\n💾 [submit-request] Saving to database...`);
    console.log(`   user_id: ${user.id}`);
    console.log(`   priority_number: ${priorityScore}`);
    console.log(`   urgency: ${urgency}`);
    console.log(`   time_limit_minutes: ${timeLimitMinutes}`);
    console.log(`   departments: [${body.departments.join(", ")}]`);

    const { data: createdRequest, error: insertError } = await supabase
      .from("requests")
      .insert([
        {
          user_id: user.id,
          topic: body.text_description || "",
          image_url: body.image.substring(0, 500), // Store first 500 chars or URL
          audio_url: body.audio ? body.audio.substring(0, 500) : null,
          latitude: body.coordinates?.lat || 0,
          longitude: body.coordinates?.lng || 0,
          departments: body.departments,
          urgency,
          time_limit_minutes: timeLimitMinutes,
          status: "pending",
          priority_number: priorityScore,
          client_created_at: now,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("❌ [submit-request] DB insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save request to database" },
        { status: 500 }
      );
    }

    console.log(`✅ [submit-request] Request saved to DB:`);
    console.log(`   request_id: ${createdRequest.id}`);
    console.log(`   priority_number (from DB): ${createdRequest.priority_number}`);

    const requestId = createdRequest.id;
    console.log(`✅ [submit-request] Request created: ${requestId}`);

    // ========================================================================
    // STEP 6: Route to gov employees for each department
    // ========================================================================
    const assignments = [];

    for (const department of body.departments) {
      console.log(`🔍 [submit-request] Finding employees for department: ${department}`);

      // Query gov_employees with matching gov_sub_role
      const { data: employees, error: queryError } = await supabase
        .from("users2")
        .select("id, name, email")
        .eq("role", "gov_employee")
        .eq("gov_sub_role", department);

      if (queryError) {
        console.error(`❌ [submit-request] Error querying employees for ${department}:`, queryError);
        continue;
      }

      console.log(`📍 [submit-request] Found ${employees?.length || 0} employees for ${department}`);

      // Create assignments for each employee
      if (employees && employees.length > 0) {
        const assignmentsToCreate = employees.map((emp: any) => ({
          request_id: requestId,
          assigned_to_user_id: emp.id,
          department,
        }));

        const { data: createdAssignments, error: assignmentError } = await supabase
          .from("request_assignments")
          .insert(assignmentsToCreate)
          .select();

        if (assignmentError) {
          console.error(`❌ [submit-request] Assignment error for ${department}:`, assignmentError);
          continue;
        }

        console.log(`✅ [submit-request] Created ${createdAssignments?.length || 0} assignments for ${department}`);
        assignments.push(...(createdAssignments || []));

        // =====================================================================
        // STEP 7: Create notifications for assigned employees (Optional)
        // =====================================================================
        const notificationsToCreate = employees.map((emp: any) => ({
          user_id: emp.id,
          request_id: requestId,
          type: "new_assignment",
          title: `🚨 New ${urgency.toUpperCase()} Request (Priority: ${priorityScore}/100)`,
          message: `New incident report assigned to ${department} department. Time limit: ${timeLimitMinutes} minutes.`,
        }));

        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notificationsToCreate);

        if (notifError) {
          console.error(`⚠️ [submit-request] Notification creation failed for ${department}:`, notifError);
          // Don't fail the whole request if notifications fail
        } else {
          console.log(`📬 [submit-request] Notification sent to ${employees.length} employees`);
        }
      }
    }

    console.log(`✅ [submit-request] Successfully routed to ${assignments.length} employee assignments`);

    // ========================================================================
    // STEP 8: Return success response
    // ========================================================================
    return NextResponse.json(
      {
        success: true,
        data: {
          ...verificationResult,
          request_id: requestId,
          priority_number: priorityScore,
          urgency,
          time_limit_minutes: timeLimitMinutes,
          departments_routed: body.departments,
          employees_notified: assignments.length,
        },
        status: "accepted",
        message: `✅ Report submitted successfully and routed to ${body.departments.length} department(s) with ${assignments.length} employee assignment(s).`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ [submit-request] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Submit Request API is running",
    version: "1.0.0",
    endpoint: "POST /api/submit-request",
    workflow: [
      "1. Verify image + 1-3 of (audio/text)",
      "2. Run verification pipeline (deepfake, spam, CLIP)",
      "3. Calculate priority_score (0-100)",
      "4. If priority < 20: Discard",
      "5. If priority >= 20: Save + Route to gov employees",
      "6. Create notifications",
    ],
  });
}
