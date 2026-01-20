-- Update services table to match CSV structure
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS source_le text NOT NULL DEFAULT 'UK',
ADD COLUMN IF NOT EXISTS franchise text,
ADD COLUMN IF NOT EXISTS recipient_le text,
ADD COLUMN IF NOT EXISTS catalogue text,
ADD COLUMN IF NOT EXISTS active text;

-- Add comment to clarify the structure
COMMENT ON TABLE public.services IS 'Services with Source LE, Franchise, Recipient LE allocations';