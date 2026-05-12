ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS attempted_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS delivery_details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.notification_log
  ALTER COLUMN sent_at DROP NOT NULL;

CREATE INDEX IF NOT EXISTS notification_log_intention_attempted_idx
  ON public.notification_log(intention_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS notification_log_status_attempted_idx
  ON public.notification_log(status, attempted_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wasl-reminders-dispatch') THEN
    PERFORM cron.unschedule('wasl-reminders-dispatch');
  END IF;
END $$;

SELECT cron.schedule(
  'wasl-reminders-dispatch',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--489d23d6-a897-4113-a87b-e777fde7468e.lovable.app/api/public/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', current_setting('app.settings.supabase_anon_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);