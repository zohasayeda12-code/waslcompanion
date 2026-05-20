ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qf_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_qf_user_id_key ON public.profiles(qf_user_id) WHERE qf_user_id IS NOT NULL;