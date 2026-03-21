-- Migration: create users2 and requests tables for new signup flow
-- Users2 stores both citizen and government employee profiles
CREATE TABLE IF NOT EXISTS public.users2 (
        id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL CHECK (role IN ('citizen', 'gov_employee')),
        gov_sub_role text,
    latitude double precision,
    longitude double precision,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT users2_gov_location_required CHECK (
            role <> 'gov_employee' OR (latitude IS NOT NULL AND longitude IS NOT NULL)
        ),
        CONSTRAINT users2_gov_sub_role_required CHECK (
            role <> 'gov_employee' OR (gov_sub_role IS NOT NULL AND length(trim(gov_sub_role)) > 0)
        )
);

-- Requests table for dashboard submissions
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.users2(id) ON DELETE CASCADE,
    topic text NOT NULL,
    image_url text,
    audio_url text,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    departments text[] NOT NULL DEFAULT '{}',
        urgency text NOT NULL CHECK (urgency IN ('emergency', 'urgent', 'moderate')),
        time_limit_minutes integer,
    status text NOT NULL DEFAULT 'pending',
        client_created_at timestamp with time zone NOT NULL DEFAULT now(),
        server_created_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT requests_time_limit_required_for_high_priority CHECK (
            (urgency IN ('urgent', 'emergency') AND time_limit_minutes IS NOT NULL AND time_limit_minutes > 0)
            OR urgency = 'moderate'
        ),
        CONSTRAINT requests_valid_departments CHECK (
            cardinality(departments) > 0
            and departments <@ array['hospital', 'fire', 'police', 'municipal corporation']
        )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_urgency ON public.requests(urgency);
CREATE INDEX IF NOT EXISTS idx_requests_departments ON public.requests USING gin(departments);
