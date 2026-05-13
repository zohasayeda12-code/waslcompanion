-- Clear stale push subscriptions created with old VAPID key
DELETE FROM public.push_subscriptions;

-- Enable extensions for scheduled HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with the same name (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('wasl-reminders-every-minute');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule reminder dispatch every minute
SELECT cron.schedule(
  'wasl-reminders-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--fb659ec6-d1ab-45ac-ad4a-a4135668da85.lovable.app/api/public/cron/reminders',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZXpiYXJuaXR2dW1ra2Jzd2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTg2NDcsImV4cCI6MjA5NDE5NDY0N30.Slq7nJrDOzCtH6wPdXVxmAyW3UswufrrW2eVITu6nP4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);