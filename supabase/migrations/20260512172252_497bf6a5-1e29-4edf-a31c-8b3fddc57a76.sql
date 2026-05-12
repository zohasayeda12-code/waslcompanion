
SELECT cron.schedule(
  'wasl-reminders-dispatch',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--489d23d6-a897-4113-a87b-e777fde7468e.lovable.app/api/public/cron/reminders',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
