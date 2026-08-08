create extension if not exists pgcrypto;

create table if not exists public.research_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.research_responses (
  id uuid primary key default gen_random_uuid(),
  participant_uuid uuid not null unique,
  survey_version text not null,
  consent_version text not null,
  consented_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  language text not null check (language in ('zh', 'en')),
  recruitment_source text,
  age_group text not null,
  gender text not null,
  country_code text not null check (char_length(country_code) = 3),
  residence_type text not null,
  education text not null,
  employment text not null,
  household_size smallint not null check (household_size between 1 and 20),
  income_ladder smallint not null check (income_ladder between 1 and 10),
  financial_strain smallint not null check (financial_strain between 1 and 5),
  housing_status text not null,
  housing_insecurity smallint not null check (housing_insecurity between 1 and 5),
  job_insecurity smallint check (job_insecurity between 1 and 5),
  healthcare_barrier smallint not null check (healthcare_barrier between 1 and 5),
  chronic_condition text not null,
  disability text not null,
  caregiving_hours text not null,
  social_support smallint not null check (social_support between 1 and 5),
  loneliness smallint not null check (loneliness between 1 and 5),
  discrimination smallint not null check (discrimination between 1 and 5),
  major_life_events text not null,
  sleep_hours numeric(3,1) check (sleep_hours between 0 and 16),
  gad7_answers smallint[] not null check (cardinality(gad7_answers) = 7),
  gad7_score smallint not null check (gad7_score between 0 and 21),
  who5_answers smallint[] not null check (cardinality(who5_answers) = 5),
  who5_score smallint not null check (who5_score between 0 and 100),
  functional_difficulty smallint not null check (functional_difficulty between 0 and 3),
  completion_seconds integer not null check (completion_seconds between 0 and 86400)
);

create index if not exists research_responses_submitted_at_idx on public.research_responses (submitted_at desc);
create index if not exists research_responses_country_idx on public.research_responses (country_code);
create index if not exists research_responses_age_group_idx on public.research_responses (age_group);

alter table public.research_admins enable row level security;
alter table public.research_responses enable row level security;

create or replace function public.is_research_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.research_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_research_admin() from public;
grant execute on function public.is_research_admin() to authenticated;

drop policy if exists "participants can submit once" on public.research_responses;
create policy "participants can submit once"
on public.research_responses
for insert
to anon
with check (
  consent_version <> ''
  and consented_at <= now()
  and survey_version <> ''
);

drop policy if exists "research admins can read responses" on public.research_responses;
create policy "research admins can read responses"
on public.research_responses
for select
to authenticated
using (public.is_research_admin());

drop policy if exists "research admins can view own role" on public.research_admins;
create policy "research admins can view own role"
on public.research_admins
for select
to authenticated
using (user_id = auth.uid());

revoke all on public.research_responses from anon, authenticated;
grant insert on public.research_responses to anon;
grant select on public.research_responses to authenticated;
revoke all on public.research_admins from anon, authenticated;
grant select on public.research_admins to authenticated;
