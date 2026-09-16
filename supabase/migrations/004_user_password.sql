-- Add password_hash column to profiles table for internal login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
