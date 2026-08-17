CREATE TABLE IF NOT EXISTS public.vald_token_cache (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.vald_token_cache TO service_role;

ALTER TABLE public.vald_token_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vald_token_cache_service_only"
  ON public.vald_token_cache FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);