-- ============================================================================
-- MIGRATION: Add distance_km column to request_assignments
-- Date: March 21, 2026
-- ============================================================================

BEGIN;

-- Add distance_km column to track the distance from request location to employee
ALTER TABLE public.request_assignments
ADD COLUMN distance_km DECIMAL(10, 2);

-- Create index for sorting by distance
CREATE INDEX request_assignments_distance_idx ON public.request_assignments(distance_km);

COMMIT;
