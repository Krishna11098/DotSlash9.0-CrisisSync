-- Migration: Add flagged_for_review and flagged_reason to public.requests
-- Date: 2026-06-06
-- Adds columns to track timestamp inconsistencies/clock skew for manual dispatch review.

BEGIN;

ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flagged_reason TEXT;

COMMENT ON COLUMN public.requests.flagged_for_review IS 'True if report should be reviewed manually (e.g. clock skew, unexpected sync delay).';
COMMENT ON COLUMN public.requests.flagged_reason IS 'Reason explaining why the report was flagged for manual review.';

COMMIT;
