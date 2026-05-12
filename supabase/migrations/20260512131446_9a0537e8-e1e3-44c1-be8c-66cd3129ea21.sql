
-- Enums
create type public.intention_status as enum ('pending','awaiting_response','lived','carried','paused','removed');
create type public.intention_kind as enum ('ai','custom');
create type public.highlight_color as enum ('gold','blue','green','purple');

-- Profiles (one per QF user; id is our internal stable user_id stored in session)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  qf_user_id text unique,
  onboarded_at timestamptz,
  notification_pref text default 'maybe_later',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Journey state
create table public.journey_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_surah int not null default 1,
  current_ayah int not null default 1,
  paused_journey jsonb,
  updated_at timestamptz not null default now()
);

-- Intentions
create table public.intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  surah int not null,
  ayah int not null,
  kind public.intention_kind not null,
  text text not null,
  reminder_at timestamptz,
  status public.intention_status not null default 'pending',
  carry_forward_count int not null default 0,
  parent_id uuid references public.intentions(id) on delete set null,
  lived_at timestamptz,
  reflection_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index intentions_user_status_idx on public.intentions(user_id, status);
create index intentions_user_surah_ayah_idx on public.intentions(user_id, surah, ayah);
create index intentions_reminder_idx on public.intentions(reminder_at) where status in ('pending','carried');

-- Reflections (local mirror of QF posts)
create table public.reflections_local (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  surah int not null,
  ayah int not null,
  qf_post_id text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reflections_user_surah_ayah_idx on public.reflections_local(user_id, surah, ayah);

-- Bookmarks (local mirror)
create table public.bookmarks_local (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  surah int not null,
  ayah int not null,
  qf_bookmark_id text,
  created_at timestamptz not null default now(),
  unique (user_id, surah, ayah)
);

-- Collections + items (local mirror)
create table public.collections_local (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  qf_collection_id text,
  name text not null,
  created_at timestamptz not null default now()
);
create table public.collection_items_local (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections_local(id) on delete cascade,
  surah int not null,
  ayah int not null,
  created_at timestamptz not null default now(),
  unique (collection_id, surah, ayah)
);

-- Highlights (local-only)
create table public.highlights (
  user_id uuid not null references public.profiles(id) on delete cascade,
  surah int not null,
  ayah int not null,
  color public.highlight_color not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, surah, ayah)
);
create index highlights_user_color_idx on public.highlights(user_id, color);

-- Recently revisited (capped to ~50 client-side; we keep all and trim periodically)
create table public.recently_revisited (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  surah int not null,
  ayah int not null,
  visited_at timestamptz not null default now()
);
create index revisited_user_visited_idx on public.recently_revisited(user_id, visited_at desc);

-- Push subscriptions
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_user_idx on public.push_subscriptions(user_id);

-- Notification log
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  intention_id uuid references public.intentions(id) on delete cascade,
  sent_at timestamptz not null default now(),
  opened_at timestamptz
);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger journey_state_updated before update on public.journey_state
  for each row execute function public.set_updated_at();
create trigger intentions_updated before update on public.intentions
  for each row execute function public.set_updated_at();
create trigger reflections_local_updated before update on public.reflections_local
  for each row execute function public.set_updated_at();

-- RLS: enable on all tables. Auth is via QF session (server-only); all client
-- access goes through createServerFn handlers that use the service-role key
-- and explicitly scope queries by user_id. RLS denies all anon/authenticated
-- access by default (no policies = deny).
alter table public.profiles enable row level security;
alter table public.journey_state enable row level security;
alter table public.intentions enable row level security;
alter table public.reflections_local enable row level security;
alter table public.bookmarks_local enable row level security;
alter table public.collections_local enable row level security;
alter table public.collection_items_local enable row level security;
alter table public.highlights enable row level security;
alter table public.recently_revisited enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_log enable row level security;
