-- Migration 005: Add CIA and ESE Max Marks ("Out of") columns to calculation_configs table
ALTER TABLE public.calculation_configs ADD COLUMN IF NOT EXISTS cia_max_marks NUMERIC DEFAULT 50;
ALTER TABLE public.calculation_configs ADD COLUMN IF NOT EXISTS ese_max_marks NUMERIC DEFAULT 50;
