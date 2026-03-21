/**
 * Request Routing & Assignment Helper
 * 
 * Utilities for routing incoming requests to appropriate gov employees
 * based on department selection and gov_sub_role matching.
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface RoutingResult {
  department: string;
  employees_count: number;
  assignments_created: number;
  notifications_sent: number;
  error?: string;
}

/**
 * Find all gov employees for a given department (gov_sub_role)
 */
export async function findEmployeesByDepartment(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  department: string
): Promise<Array<{ id: string; name: string; email: string }>> {
  const { data, error } = await supabase
    .from("users2")
    .select("id, name, email")
    .eq("role", "gov_employee")
    .eq("gov_sub_role", department);

  if (error) {
    console.error(`Error querying employees for ${department}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Create request assignments for multiple employees
 */
export async function createAssignmentsForEmployees(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  requestId: string,
  employeeIds: string[],
  department: string
): Promise<number> {
  if (employeeIds.length === 0) return 0;

  const assignments = employeeIds.map((empId) => ({
    request_id: requestId,
    assigned_to_user_id: empId,
    department,
  }));

  const { data, error } = await supabase
    .from("request_assignments")
    .insert(assignments)
    .select();

  if (error) {
    console.error(`Error creating assignments for ${department}:`, error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Send notifications to employees about new assignment
 */
export async function notifyEmployeesOfAssignment(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  requestId: string,
  employeeIds: string[],
  department: string,
  priorityScore: number,
  urgency: string
): Promise<number> {
  if (employeeIds.length === 0) return 0;

  const notifications = employeeIds.map((empId) => ({
    user_id: empId,
    request_id: requestId,
    type: "new_assignment",
    title: `🚨 New ${urgency.toUpperCase()} Request - Priority ${priorityScore}/100`,
    message: `New incident assigned to ${department} department. Review and acknowledge immediately.`,
  }));

  const { data, error } = await supabase
    .from("notifications")
    .insert(notifications)
    .select();

  if (error) {
    console.warn(`Warning: Notifications not sent (non-critical):`, error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Complete routing workflow for a single department
 */
export async function routeRequestToDepartment(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  requestId: string,
  department: string,
  priorityScore: number,
  urgency: string
): Promise<RoutingResult> {
  console.log(`📍 Routing request ${requestId} to ${department}...`);

  // 1. Find employees
  const employees = await findEmployeesByDepartment(supabase, department);

  if (employees.length === 0) {
    console.warn(`⚠️ No employees found for department: ${department}`);
    return {
      department,
      employees_count: 0,
      assignments_created: 0,
      notifications_sent: 0,
      error: "No employees found for this department",
    };
  }

  // 2. Create assignments
  const employeeIds = employees.map((e) => e.id);
  const assignmentsCreated = await createAssignmentsForEmployees(
    supabase,
    requestId,
    employeeIds,
    department
  );

  if (assignmentsCreated === 0) {
    return {
      department,
      employees_count: employees.length,
      assignments_created: 0,
      notifications_sent: 0,
      error: "Failed to create assignments",
    };
  }

  // 3. Send notifications
  const notificationsSent = await notifyEmployeesOfAssignment(
    supabase,
    requestId,
    employeeIds,
    department,
    priorityScore,
    urgency
  );

  console.log(
    `✅ Routed to ${department}: ${employees.length} employees, ${assignmentsCreated} assignments, ${notificationsSent} notifications`
  );

  return {
    department,
    employees_count: employees.length,
    assignments_created: assignmentsCreated,
    notifications_sent: notificationsSent,
  };
}

/**
 * Route a request to multiple departments
 */
export async function routeRequestToMultipleDepartments(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  requestId: string,
  departments: string[],
  priorityScore: number,
  urgency: string
): Promise<RoutingResult[]> {
  const results: RoutingResult[] = [];

  for (const department of departments) {
    const result = await routeRequestToDepartment(
      supabase,
      requestId,
      department,
      priorityScore,
      urgency
    );
    results.push(result);
  }

  return results;
}

/**
 * Calculate urgency level from priority score
 */
export function calculateUrgencyFromPriority(
  priorityScore: number
): "emergency" | "urgent" | "moderate" {
  if (priorityScore >= 80) return "emergency";
  if (priorityScore >= 40) return "urgent";
  return "moderate";
}

/**
 * Calculate time limit in minutes from priority score
 */
export function calculateTimeLimitFromPriority(priorityScore: number): number {
  if (priorityScore >= 80) return 5;
  if (priorityScore >= 40) return 15;
  return 30;
}

/**
 * Get emergency level emoji and description
 */
export function getUrgencyDisplay(urgency: string): {
  emoji: string;
  label: string;
  description: string;
} {
  const displays: Record<string, any> = {
    emergency: {
      emoji: "🚨",
      label: "EMERGENCY",
      description: "Immediate response required",
    },
    urgent: {
      emoji: "⚠️",
      label: "URGENT",
      description: "Quick response needed",
    },
    moderate: {
      emoji: "📌",
      label: "ROUTINE",
      description: "Standard processing",
    },
  };

  return displays[urgency] || displays.moderate;
}
