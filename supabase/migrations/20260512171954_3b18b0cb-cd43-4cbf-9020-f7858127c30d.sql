
ALTER TABLE public.intentions ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_intentions_reminder_due
  ON public.intentions(reminder_at)
  WHERE reminder_sent_at IS NULL AND status IN ('pending','carried','awaiting_response');
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
