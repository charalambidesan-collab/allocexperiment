-- Add source_le column to cost_pools table to track legal entity
ALTER TABLE public.cost_pools 
ADD COLUMN source_le TEXT NOT NULL DEFAULT 'UK';