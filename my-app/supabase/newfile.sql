-- ============================================================================
-- MIGRATION: Add Priority System & Gov Employee Routing
-- Date: March 21, 2026
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add priority_number field to requests table
-- ============================================================================
ALTER TABLE public.requests
ADD COLUMN priority_number INTEGER DEFAULT 0;

-- Constraint: priority_number must be 0-100
ALTER TABLE public.requests
ADD CONSTRAINT priority_number_check CHECK (priority_number >= 0 AND priority_number <= 100);

-- Index for filtering and sorting by priority
CREATE INDEX requests_priority_number_idx ON public.requests(priority_number);
CREATE INDEX requests_priority_status_idx ON public.requests(priority_number, status);

-- ============================================================================
-- 2. Create request_assignments table (NEW)
-- Links requests to gov employees who need to handle them
-- ============================================================================
CREATE TABLE public.request_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES public.users2(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure no duplicate assignments
  UNIQUE(request_id, assigned_to_user_id, department)
);

-- Indexes for efficient querying
CREATE INDEX request_assignments_request_id_idx ON public.request_assignments(request_id);
CREATE INDEX request_assignments_user_id_idx ON public.request_assignments(assigned_to_user_id);
CREATE INDEX request_assignments_status_idx ON public.request_assignments(status);
CREATE INDEX request_assignments_department_idx ON public.request_assignments(department);
CREATE INDEX request_assignments_user_status_idx ON public.request_assignments(assigned_to_user_id, status);

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS request_assignments_set_updated_at ON public.request_assignments;
CREATE TRIGGER request_assignments_set_updated_at
BEFORE UPDATE ON public.request_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row-level security
ALTER TABLE public.request_assignments ENABLE ROW LEVEL SECURITY;

-- Allow gov employees to see assignments for themselves
CREATE POLICY "request_assignments_select_own"
ON public.request_assignments
FOR SELECT
USING (
  assigned_to_user_id = auth.uid()
);

-- Allow citizens to see who their request was assigned to
CREATE POLICY "request_assignments_select_own_request"
ON public.request_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_id AND r.user_id = auth.uid()
  )
);

-- Gov employees can update their assignments (acknowledge, in_progress, resolved)
CREATE POLICY "request_assignments_update_own"
ON public.request_assignments
FOR UPDATE
USING (assigned_to_user_id = auth.uid())
WITH CHECK (assigned_to_user_id = auth.uid());

-- System (backend) can insert assignments
CREATE POLICY "request_assignments_insert_system"
ON public.request_assignments
FOR INSERT
WITH CHECK (true); -- Backend service will handle authorization

-- ============================================================================
-- 3. Create notifications table (for alert system)
-- ============================================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users2(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'new_assignment', 'priority_update', 'status_change', 'manual_alert'
  title TEXT NOT NULL,
  message TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT notification_type_valid CHECK (type IN ('new_assignment', 'priority_update', 'status_change', 'manual_alert'))
);

-- Indexes for efficient queries
CREATE INDEX notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX notifications_read_at_idx ON public.notifications(read_at);
CREATE INDEX notifications_user_unread_idx ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX notifications_created_at_idx ON public.notifications(created_at);

-- Row-level security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Backend service can insert notifications
CREATE POLICY "notifications_insert_system"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- 4. Update requests RLS to support new workflow
-- ============================================================================

-- Allow gov employees to see all requests or those assigned to them
DROP POLICY IF EXISTS "requests_select_own_or_gov" ON public.requests;

CREATE POLICY "requests_select_own_or_gov_updated"
ON public.requests
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM public.users2 u2
      WHERE u2.id = auth.uid() AND u2.role = 'gov_employee'
    )
    AND (
      -- Gov employees can see requests assigned to them
      EXISTS (
        SELECT 1 FROM public.request_assignments ra
        WHERE ra.request_id = id AND ra.assigned_to_user_id = auth.uid()
      )
      -- OR see all requests in their department(s) - optional, adjust as needed
      -- OR (
      --   EXISTS (
      --     SELECT 1 FROM public.users2 u2
      --     WHERE u2.id = auth.uid()
      --     AND departments @> ARRAY[u2.gov_sub_role]
      --   )
      -- )
    )
  )
);

-- ============================================================================
-- 5. Add comments for clarity
-- ============================================================================
COMMENT ON COLUMN public.requests.priority_number IS 'Priority score 0-100. <20 = discard. Used for sorting and filtering requests.';
COMMENT ON TABLE public.request_assignments IS 'Tracks which gov employees are assigned to handle specific requests.';
COMMENT ON COLUMN public.request_assignments.status IS 'pending=not seen yet, acknowledged=employee confirmed, in_progress=being worked on, resolved=completed, closed=archived';
COMMENT ON TABLE public.notifications IS 'Real-time alerts to notify employees of new assignments and status changes.';

COMMIT;
