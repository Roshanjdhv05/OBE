-- Migration 007: Add subject_ids to user_allocations for subject-level access control
-- This adds a subject_ids JSONB column to store which specific subjects within a semester
-- a faculty member has access to. NULL means access to all subjects in that semester.

-- First, create the user_allocations table if it doesn't exist (in case it was created dynamically)
CREATE TABLE IF NOT EXISTS public.user_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    subject_ids JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_prog_sem UNIQUE (user_id, programme_id, semester_id)
);

-- Add subject_ids column if table already exists without it
ALTER TABLE public.user_allocations ADD COLUMN IF NOT EXISTS subject_ids JSONB DEFAULT NULL;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_allocations_user ON public.user_allocations(user_id);
