-- ══════════════════════════════════════════════════════════
--  AutoFlow v2 — Supabase Schema
--  Paste into: Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════

-- Drop old tables if restarting fresh
-- drop table if exists followups;
-- drop table if exists leads;

-- LEADS TABLE
create table if not exists leads (
  id               uuid        primary key default gen_random_uuid(),
  keyword          text,
  name             text,
  email            text        unique,
  phone            text,
  phone_normalized text,
  website          text,
  source           text        default 'google'
                   check (source in ('facebook','instagram','justdial','indiamart','google')),
  score            int         default 0,
  category         text        default 'cold'
                   check (category in ('hot','cold')),
  score_reasons    text[],
  snippet          text,
  status           text        default 'new'
                   check (status in ('new','contacted','replied','closed')),
  created_at       timestamptz default now()
);

-- Phone dedupe when email is null (run once on existing projects)
alter table leads add column if not exists phone_normalized text;

-- IMPORTANT:
-- The app uses `upsert(..., { onConflict: 'phone_normalized' })`.
-- That requires a NON-partial UNIQUE constraint/index on (phone_normalized),
-- otherwise Postgres returns:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- This unique constraint still allows multiple NULLs (Postgres behavior),
-- and the app only sets phone_normalized for 10+ digit phones.
alter table leads
  add constraint leads_phone_normalized_unique unique (phone_normalized);

-- FOLLOWUPS TABLE
create table if not exists followups (
  id          uuid        primary key default gen_random_uuid(),
  lead_id     uuid        references leads(id) on delete cascade,
  step        int         default 1,
  sent_at     timestamptz,
  opened_at   timestamptz,
  replied_at  timestamptz,
  created_at  timestamptz default now()
);

-- INDEXES
create index if not exists idx_leads_source   on leads (source);
create index if not exists idx_leads_category on leads (category);
create index if not exists idx_leads_keyword  on leads (keyword);
create index if not exists idx_leads_score    on leads (score desc);
create index if not exists idx_leads_status   on leads (status);

-- ROW LEVEL SECURITY
alter table leads     enable row level security;
alter table followups enable row level security;

drop policy if exists "service role full access on leads" on leads;
create policy "service role full access on leads"
  on leads for all using (auth.role() = 'service_role');

drop policy if exists "service role full access on followups" on followups;
create policy "service role full access on followups"
  on followups for all using (auth.role() = 'service_role');
