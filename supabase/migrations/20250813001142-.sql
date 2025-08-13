-- Enable RLS and allow authenticated users to read whatsapp_sessions
-- Also ensure table is in the realtime publication so live updates arrive

-- Enable RLS (safe even if already enabled)
ALTER TABLE IF EXISTS public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy for authenticated users if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'whatsapp_sessions' 
      AND policyname = 'Allow authenticated read whatsapp sessions'
  ) THEN
    CREATE POLICY "Allow authenticated read whatsapp sessions"
    ON public.whatsapp_sessions
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END
$$;

-- Add table to realtime publication if not already present
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- already in publication
  END;
END
$$;