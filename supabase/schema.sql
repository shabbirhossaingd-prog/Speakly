-- Speakly production schema. Run in a Supabase project before enabling durable backend mode.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  learning_profile jsonb not null default '{}'::jsonb,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null,
  track text not null, level text not null, published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(), course_id uuid references public.courses(id) on delete cascade,
  title text not null, position int not null default 0, content jsonb not null default '{}'::jsonb,
  published boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade, status text not null default 'started',
  score numeric, xp int not null default 0, skill_delta jsonb not null default '{}'::jsonb,
  completed_at timestamptz, unique(user_id, lesson_id)
);

create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(), word text not null, meaning text not null,
  example text, pronunciation text, metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.user_vocabulary (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid references public.vocabulary(id) on delete cascade, custom_word text, custom_meaning text,
  mastery int not null default 0, next_review timestamptz not null default now(), unique(user_id, vocabulary_id)
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(), title text not null, type text not null,
  content jsonb not null default '{}'::jsonb, published boolean not null default false
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid references public.tests(id) on delete cascade, answers jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb, started_at timestamptz not null default now(), completed_at timestamptz
);

create table if not exists public.speaking_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  scenario text not null, transcript text, feedback jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, storage_path text not null, status text not null default 'uploaded',
  derived_files jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null, provider text, provider_subscription_id text, status text not null default 'inactive',
  current_period_end timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  provider text not null, provider_payment_id text, amount numeric, currency text, status text not null,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_vocabulary enable row level security;
alter table public.test_attempts enable row level security;
alter table public.speaking_sessions enable row level security;
alter table public.books enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

create policy "profiles own row" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "progress own rows" on public.user_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vocabulary own rows" on public.user_vocabulary for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attempts own rows" on public.test_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "speaking own rows" on public.speaking_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "books own rows" on public.books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions own rows" on public.subscriptions for select using (auth.uid() = user_id);
create policy "payments own rows" on public.payments for select using (auth.uid() = user_id);

-- Create a private Storage bucket named 'speakly-books' in Supabase Storage.
-- Object keys are namespaced as <user-id>/<uuid>-<filename>. Server routes enforce ownership.
