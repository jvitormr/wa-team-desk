-- WhatsApp auth storage and status tables
-- 1) Credentials as a JSON blob (Baileys creds + keys), per user
CREATE TABLE IF NOT EXISTS public.whatsapp_auth (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage own whatsapp_auth"
ON public.whatsapp_auth
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER IF NOT EXISTS update_whatsapp_auth_updated_at
BEFORE UPDATE ON public.whatsapp_auth
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Connection status table, per user
CREATE TABLE IF NOT EXISTS public.whatsapp_status (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'disconnected',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own whatsapp_status"
ON public.whatsapp_status
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can upsert own whatsapp_status"
ON public.whatsapp_status
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own whatsapp_status"
ON public.whatsapp_status
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER IF NOT EXISTS update_whatsapp_status_updated_at
BEFORE UPDATE ON public.whatsapp_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();