-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarded_at timestamptz,
  notification_pref text,
  qf_initial_synced_at timestamptz,
  qf_initial_sync_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.journey_state (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_surah integer NOT NULL DEFAULT 1,
  current_ayah integer NOT NULL DEFAULT 1,
  paused_journey jsonb,
  last_mushaf_page integer NOT NULL DEFAULT 1,
  reading_marker jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.highlights (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  surah integer NOT NULL,
  ayah integer NOT NULL,
  color text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, surah, ayah)
);

CREATE TABLE public.reflections_local (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  surah integer NOT NULL,
  ayah integer NOT NULL,
  body text NOT NULL,
  qf_post_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reflections_local_user_ayah_idx ON public.reflections_local (user_id, surah, ayah);

CREATE TABLE public.intentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  surah integer NOT NULL,
  ayah integer NOT NULL,
  kind text NOT NULL,
  text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reminder_at timestamptz,
  reminder_sent_at timestamptz,
  lived_at timestamptz,
  reflection_id uuid REFERENCES public.reflections_local(id) ON DELETE SET NULL,
  carry_forward_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX intentions_user_status_idx ON public.intentions (user_id, status);
CREATE INDEX intentions_reminder_idx ON public.intentions (reminder_at) WHERE reminder_sent_at IS NULL;

CREATE TABLE public.bookmarks_local (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  surah integer NOT NULL,
  ayah integer NOT NULL,
  qf_bookmark_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, surah, ayah)
);

CREATE TABLE public.collections_local (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  qf_collection_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.collection_items_local (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections_local(id) ON DELETE CASCADE,
  surah integer NOT NULL,
  ayah integer NOT NULL,
  qf_item_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, surah, ayah)
);

CREATE TABLE public.recently_revisited (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  surah integer NOT NULL,
  ayah integer NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recently_revisited_user_time_idx ON public.recently_revisited (user_id, visited_at DESC);

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intention_id uuid REFERENCES public.intentions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL,
  failure_reason text,
  sent_at timestamptz,
  delivery_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sync_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource text NOT NULL,
  operation text NOT NULL,
  payload jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS. All app access is server-side via service-role client scoped by user_id.
-- No policies = deny-all for anon/authenticated.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_revisited ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_failures ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER journey_state_set_updated_at BEFORE UPDATE ON public.journey_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER reflections_local_set_updated_at BEFORE UPDATE ON public.reflections_local
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER intentions_set_updated_at BEFORE UPDATE ON public.intentions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER highlights_set_updated_at BEFORE UPDATE ON public.highlights
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reminder cron scheduling helper used by /api/public/cron/ensure-schedule
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

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