-- Enable realtime for activity_allocations updates
ALTER TABLE public.activity_allocations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_allocations;