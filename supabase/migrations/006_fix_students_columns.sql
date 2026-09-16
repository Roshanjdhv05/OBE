-- Migration 006: Ensure students table has both student_id and student_id_code columns for compatibility
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_id_code TEXT;
UPDATE public.students SET student_id_code = student_id WHERE student_id_code IS NULL;
UPDATE public.students SET student_id = student_id_code WHERE student_id IS NULL;
