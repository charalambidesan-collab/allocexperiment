-- Add Area and Scenario columns to services table
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS scenario text;