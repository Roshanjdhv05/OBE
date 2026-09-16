-- Add missing allocations column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allocations JSONB DEFAULT '[]'::jsonb;

-- Add missing weight columns to calculation_configs table
ALTER TABLE public.calculation_configs ADD COLUMN IF NOT EXISTS cia_weight NUMERIC DEFAULT 0.5;
ALTER TABLE public.calculation_configs ADD COLUMN IF NOT EXISTS ese_weight NUMERIC DEFAULT 0.5;
