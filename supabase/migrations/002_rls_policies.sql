-- Row Level Security (RLS) Policies Migration

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_co_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check super admin status
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check faculty/authenticated user
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Public profiles reading for active users" ON public.profiles FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin full profile management" ON public.profiles FOR ALL USING (is_super_admin());

-- ACADEMIC STRUCTURES POLICIES
CREATE POLICY "Active users read academic structures" ON public.academic_years FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin manage academic years" ON public.academic_years FOR ALL USING (is_super_admin());

CREATE POLICY "Active users read programmes" ON public.programmes FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin manage programmes" ON public.programmes FOR ALL USING (is_super_admin());

CREATE POLICY "Active users read semesters" ON public.semesters FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin manage semesters" ON public.semesters FOR ALL USING (is_super_admin());

CREATE POLICY "Active users read subjects" ON public.subjects FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin manage subjects" ON public.subjects FOR ALL USING (is_super_admin());

CREATE POLICY "Active users read course outcomes" ON public.course_outcomes FOR SELECT USING (is_active_user());
CREATE POLICY "Super admin manage course outcomes" ON public.course_outcomes FOR ALL USING (is_super_admin());

-- ASSESSMENT & STUDENT POLICIES (Faculty & Admin read/write)
CREATE POLICY "Active users manage students" ON public.students FOR ALL USING (is_active_user());
CREATE POLICY "Active users manage assessments" ON public.assessments FOR ALL USING (is_active_user());
CREATE POLICY "Active users manage co results" ON public.student_co_results FOR ALL USING (is_active_user());
CREATE POLICY "Active users manage survey responses" ON public.survey_responses FOR ALL USING (is_active_user());
CREATE POLICY "Active users manage calculation configs" ON public.calculation_configs FOR ALL USING (is_active_user());
CREATE POLICY "Active users read/manage PSOs" ON public.psos FOR ALL USING (is_active_user());
CREATE POLICY "Active users log audit events" ON public.audit_logs FOR INSERT WITH CHECK (is_active_user());
CREATE POLICY "Super admin view audit logs" ON public.audit_logs FOR SELECT USING (is_super_admin());
