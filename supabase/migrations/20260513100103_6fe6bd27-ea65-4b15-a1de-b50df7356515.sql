-- Required extensions for scheduled jobs and outbound HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Notification log retention: delete rows older than 30 days, daily at 03:15 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('wasl-notification-log-cleanup');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'wasl-notification-log-cleanup',
  '15 3 * * *',
  $$DELETE FROM public.notification_log WHERE attempted_at < now() - interval '30 days'$$
);
