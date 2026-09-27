-- Migration 008: OBE Outcome Mapping Tables & Policies

-- 1. GRADUATE ATTRIBUTES (GA)
CREATE TABLE IF NOT EXISTS public.graduate_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROGRAMME OUTCOMES (PO)
CREATE TABLE IF NOT EXISTS public.programme_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    po_code TEXT NOT NULL,
    title TEXT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_po_code_per_programme UNIQUE (programme_id, po_code)
);

-- 3. Ensure PSOS table has necessary structure (if missing columns)
ALTER TABLE public.psos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE public.psos ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1;

-- 4. GA TO PO MAPPING (Programme-level)
CREATE TABLE IF NOT EXISTS public.ga_po_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    ga_id UUID NOT NULL REFERENCES public.graduate_attributes(id) ON DELETE CASCADE,
    po_id UUID NOT NULL REFERENCES public.programme_outcomes(id) ON DELETE CASCADE,
    mapping_level INTEGER NOT NULL CHECK (mapping_level BETWEEN 0 AND 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_ga_po_mapping UNIQUE (programme_id, ga_id, po_id)
);

-- 5. CO TO PO MAPPING (Subject-wise)
CREATE TABLE IF NOT EXISTS public.co_po_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    co_id UUID NOT NULL REFERENCES public.course_outcomes(id) ON DELETE CASCADE,
    po_id UUID NOT NULL REFERENCES public.programme_outcomes(id) ON DELETE CASCADE,
    mapping_level INTEGER NOT NULL CHECK (mapping_level BETWEEN 0 AND 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_co_po_mapping UNIQUE (co_id, po_id)
);

-- 6. CO TO PSO MAPPING (Subject-wise)
CREATE TABLE IF NOT EXISTS public.co_pso_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    co_id UUID NOT NULL REFERENCES public.course_outcomes(id) ON DELETE CASCADE,
    pso_id UUID NOT NULL REFERENCES public.psos(id) ON DELETE CASCADE,
    mapping_level INTEGER NOT NULL CHECK (mapping_level BETWEEN 0 AND 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_co_pso_mapping UNIQUE (co_id, pso_id)
);

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_po_programme ON public.programme_outcomes(programme_id);
CREATE INDEX IF NOT EXISTS idx_ga_po_prog ON public.ga_po_mappings(programme_id);
CREATE INDEX IF NOT EXISTS idx_co_po_sub ON public.co_po_mappings(subject_id);
CREATE INDEX IF NOT EXISTS idx_co_pso_sub ON public.co_pso_mappings(subject_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.graduate_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga_po_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_po_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_pso_mappings ENABLE ROW LEVEL SECURITY;

-- Ensure helper functions exist (idempotent — safe even if already created by migration 002)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLICIES (Read for active users, full access for super admin)
CREATE POLICY "Active users read graduate attributes" ON public.graduate_attributes FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin manage graduate attributes" ON public.graduate_attributes FOR ALL USING (is_super_admin());

CREATE POLICY "Active users read programme outcomes" ON public.programme_outcomes FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin manage programme outcomes" ON public.programme_outcomes FOR ALL USING (is_super_admin());

CREATE POLICY "Active users read ga_po_mappings" ON public.ga_po_mappings FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin manage ga_po_mappings" ON public.ga_po_mappings FOR ALL USING (is_super_admin());

CREATE POLICY "Active users read co_po_mappings" ON public.co_po_mappings FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin manage co_po_mappings" ON public.co_po_mappings FOR ALL USING (is_super_admin());

CREATE POLICY "Active users read co_pso_mappings" ON public.co_pso_mappings FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin manage co_pso_mappings" ON public.co_pso_mappings FOR ALL USING (is_super_admin());
