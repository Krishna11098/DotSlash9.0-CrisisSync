"use server";

/**
 * Server Action: Complete submission workflow
 * - Handles priority calculation via AI pipeline
 * - Saves request to database
 * - Routes to gov employees
 * - Creates notifications
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { processSubmission } from "@/lib/report-pipeline";

export async function submitRequestWithPriority(
  formData: {
    image: string; // base64 or URL
    text_description: string;
    audio: string; // base64 or URL
    location: string;
    departments: string[];
    report_count?: number;
    coordinates?: { lat: number; lng: number };
  },
  sessionToken: string // Auth token passed from client
) {
  try {
    console.log("\n\n" + "=".repeat(80));
    console.log("🚀 [submitRequestWithPriority] SERVER ACTION CALLED");
    console.log("=".repeat(80));

    // ====================================================================
    // STEP 1: Authenticate user with provided session token
    // ====================================================================
    if (!sessionToken) {
      console.error("❌ No session token provided");
      return {
        success: false,
        error: "Unauthorized - please log in",
        status: 401,
      };
    }

    console.log("🔐 Creating Supabase client with session token...");
    const supabase = createServerSupabaseClient(`Bearer ${sessionToken}`);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      return {
        success: false,
        error: "Failed to authenticate user",
        status: 401,
      };
    }

    console.log(`👤 Authenticated user: ${user.id}`);

    // ====================================================================
    // STEP 2: Validate input
    // ====================================================================
    if (!formData.image) {
      return {
        success: false,
        error: "Image is required",
        status: 400,
      };
    }

    if (!formData.departments || formData.departments.length === 0) {
      return {
        success: false,
        error: "At least one department must be selected",
        status: 400,
      };
    }

    const validDepartments = [
      "hospital",
      "fire",
      "police",
      "municipal corporation",
    ];
    const invalidDepts = formData.departments.filter(
      (d) => !validDepartments.includes(d)
    );
    if (invalidDepts.length > 0) {
      return {
        success: false,
        error: `Invalid departments: ${invalidDepts.join(", ")}`,
        status: 400,
      };
    }

    console.log("✅ Input validation passed");
    console.log(`📋 Input Data:`);
    console.log(`   - Image: ${formData.image.substring(0, 50)}...`);
    console.log(`   - Text: "${(formData.text_description || "").substring(0, 80)}..."`);
    console.log(`   - Audio: ${formData.audio ? "present" : "none"}`);
    console.log(`   - Location: "${formData.location}"`);
    console.log(`   - Departments: [${formData.departments.join(", ")}]`);

    // ====================================================================
    // STEP 3: Run verification pipeline (priority calculation)
    // ====================================================================
    console.log("\n📍 STEP 3: Running verification pipeline...");
    let verificationResult;

    try {
      verificationResult = await processSubmission({
        image: formData.image,
        text_description: formData.text_description || "",
        audio: formData.audio || "",
        location: formData.location || "",
        report_count: formData.report_count || 1,
        coordinates: formData.coordinates,
      });

      console.log("✅ Verification pipeline complete");
      console.log(`📊 Priority score: ${verificationResult.priority.priority_score}`);
      console.log(`📊 Priority level: ${verificationResult.priority.priority_level}`);
      console.log(`📊 Department: ${verificationResult.priority.department}`);
    } catch (pipelineError) {
      console.error("❌ Pipeline error:", pipelineError);
      return {
        success: false,
        error: "Failed to process submission",
        status: 500,
        details: pipelineError instanceof Error ? pipelineError.message : "Unknown error",
      };
    }

    const priorityScore = verificationResult.priority.priority_score;

    // ====================================================================
    // STEP 4: Check priority threshold
    // ====================================================================
    if (priorityScore < 20) {
      console.log(`🚫 Priority score ${priorityScore} < 20, discarding request`);
      return {
        success: false,
        status: 200,
        data: verificationResult,
        reason: "Priority too low",
        message: "This report does not meet the priority threshold for action.",
      };
    }

    console.log(`✅ Priority score ${priorityScore} >= 20, proceeding with save`);

    // ====================================================================
    // STEP 5: Map priority to urgency
    // ====================================================================
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

    console.log(`⏱️ Mapped to urgency: ${urgency}, time limit: ${timeLimitMinutes}m`);

    // ====================================================================
    // STEP 6: Save request to database
    // ====================================================================
    console.log("\n💾 STEP 6: Saving request to database...");
    const now = new Date().toISOString();

    const { data: createdRequest, error: insertError } = await supabase
      .from("requests")
      .insert([
        {
          user_id: user.id,
          topic: formData.text_description || "",
          image_url: formData.image.substring(0, 500),
          audio_url: formData.audio ? formData.audio.substring(0, 500) : null,
          latitude: formData.coordinates?.lat || 0,
          longitude: formData.coordinates?.lng || 0,
          departments: formData.departments,
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
      console.error("❌ Database insert error:", insertError);
      return {
        success: false,
        error: "Failed to save request to database",
        status: 500,
      };
    }

    console.log(`✅ Request saved: ${createdRequest.id}`);
    console.log(`   Priority: ${createdRequest.priority_number}`);
    const requestId = createdRequest.id;

    // ====================================================================
    // STEP 7: Route to gov employees
    // ====================================================================
    console.log("\n🔍 STEP 7: Routing to gov employees...");
    const assignments = [];

    for (const department of formData.departments) {
      console.log(`  Finding employees for: ${department}`);

      const { data: employees, error: queryError } = await supabase
        .from("users2")
        .select("id, name, email")
        .eq("role", "gov_employee")
        .eq("gov_sub_role", department);

      if (queryError) {
        console.error(`  ❌ Query error for ${department}:`, queryError);
        continue;
      }

      console.log(`  📍 Found ${employees?.length || 0} employees`);

      if (employees && employees.length > 0) {
        // Create assignments
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
          console.error(`  ❌ Assignment error:`, assignmentError);
          continue;
        }

        console.log(`  ✅ Created ${createdAssignments?.length || 0} assignments`);
        assignments.push(...(createdAssignments || []));

        // ================================================================
        // STEP 8: Create notifications
        // ================================================================
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
          console.error(`  ⚠️ Notification error:`, notifError);
          // Don't fail the whole request
        } else {
          console.log(`  📬 Notifications sent to ${employees.length} employees`);
        }
      }
    }

    console.log(`✅ Routed to ${assignments.length} employee assignments`);

    // ====================================================================
    // STEP 9: Return success
    // ====================================================================
    console.log("\n✅ SUCCESS: Request submitted with priority calculation\n");
    return {
      success: true,
      status: 200,
      data: {
        request_id: requestId,
        priority_score: priorityScore,
        urgency,
        assignments_created: assignments.length,
        verification: verificationResult,
      },
      message: `Request submitted successfully! Priority: ${priorityScore}/100, Urgency: ${urgency}`,
    };
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
