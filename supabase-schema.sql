-- =========================================================
-- CS Test Platform — Supabase Schema
-- Jalankan di Supabase SQL Editor sebelum deploy.
-- =========================================================

create extension if not exists "pgcrypto";

-- Kandidat / peserta test
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  applied_position text,
  platform_focus text check (platform_focus in ('shopee', 'tiktok', 'both')) default 'both',

  status text not null default 'in_progress'
    check (status in ('in_progress', 'knowledge_done', 'completed', 'expired')),

  knowledge_time_limit_minutes int not null default 20,
  complaint_time_limit_minutes int not null default 10,

  started_at timestamptz not null default now(),
  knowledge_submitted_at timestamptz,
  completed_at timestamptz,

  knowledge_score int,
  knowledge_total int,
  auto_submitted_knowledge boolean default false,
  auto_submitted_complaint boolean default false,

  created_at timestamptz not null default now()
);

-- Jawaban test pengetahuan (multiple choice + essay)
create table if not exists test_answers (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  question_id text not null,
  question_type text not null check (question_type in ('multiple_choice', 'focus_match', 'essay')),
  question_text text,
  answer text,
  correct_answer text,
  is_correct boolean,
  created_at timestamptz not null default now()
);

-- Sesi simulasi komplain AI (satu kandidat = satu sesi)
create table if not exists complaint_simulations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  platform text check (platform in ('shopee', 'tiktok')),
  scenario_topic text,
  persona text,
  created_at timestamptz not null default now()
);

-- Transkrip percakapan simulasi (AI customer <-> kandidat sebagai CS)
create table if not exists complaint_messages (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references complaint_simulations(id) on delete cascade,
  role text not null check (role in ('ai_customer', 'agent')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_test_answers_candidate on test_answers(candidate_id);
create index if not exists idx_complaint_sim_candidate on complaint_simulations(candidate_id);
create index if not exists idx_complaint_msg_sim on complaint_messages(simulation_id);
create index if not exists idx_candidates_status on candidates(status);
create index if not exists idx_candidates_created on candidates(created_at desc);

-- Catatan:
-- Semua akses ke tabel-tabel ini dilakukan lewat Service Role Key di serverless
-- functions (api/*.js), jadi RLS boleh dibiarkan default (aktifkan + tanpa policy
-- publik) supaya tidak ada akses langsung dari browser/anon key.
alter table candidates enable row level security;
alter table test_answers enable row level security;
alter table complaint_simulations enable row level security;
alter table complaint_messages enable row level security;
-- Tidak ada policy dibuat -> otomatis semua akses via anon key ditolak,
-- hanya Service Role Key (dipakai di server) yang bisa baca/tulis.
