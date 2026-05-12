ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qf_initial_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS qf_initial_sync_started_at timestamptz;

CREATE TABLE IF NOT EXISTS public.sync_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource text NOT NULL,
  operation text NOT NULL,
  payload jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sync_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_select ON public.sync_failures FOR SELECT USING (false);
CREATE POLICY deny_all_insert ON public.sync_failures FOR INSERT WITH CHECK (false);
CREATE POLICY deny_all_update ON public.sync_failures FOR UPDATE USING (false);
CREATE POLICY deny_all_delete ON public.sync_failures FOR DELETE USING (false);
CREATE INDEX IF NOT EXISTS sync_failures_user_idx ON public.sync_failures(user_id, created_at DESC);