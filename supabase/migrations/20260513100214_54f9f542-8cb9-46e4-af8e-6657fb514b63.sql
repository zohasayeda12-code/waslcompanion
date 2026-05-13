CREATE OR REPLACE FUNCTION public.wasl_ensure_reminder_schedule(
  target_url text,
  api_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  job_name constant text := 'wasl-reminders-every-minute';
  new_jobid bigint;
  cmd text;
BEGIN
  IF target_url IS NULL OR length(target_url) = 0 THEN
    RAISE EXCEPTION 'target_url required';
  END IF;
  IF api_key IS NULL OR length(api_key) = 0 THEN
    RAISE EXCEPTION 'api_key required';
  END IF;

  -- Remove any existing schedule with this name (safe if it doesn't exist)
  BEGIN
    PERFORM cron.unschedule(job_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  cmd := format(
    $c$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','apikey',%L),
        body := '{}'::jsonb
      ) AS request_id;$c$,
    target_url,
    api_key
  );

  SELECT cron.schedule(job_name, '* * * * *', cmd) INTO new_jobid;

  RETURN jsonb_build_object('jobid', new_jobid, 'jobname', job_name, 'url', target_url);
END;
$fn$;

REVOKE ALL ON FUNCTION public.wasl_ensure_reminder_schedule(text, text) FROM public, anon, authenticated;
