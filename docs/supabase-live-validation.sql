CREATE TABLE IF NOT EXISTS public.live_users (
  id text PRIMARY KEY,
  email text NOT NULL,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.live_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "easyjs live validation service role access"
  ON public.live_users
  FOR ALL
  USING (true)
  WITH CHECK (true);
