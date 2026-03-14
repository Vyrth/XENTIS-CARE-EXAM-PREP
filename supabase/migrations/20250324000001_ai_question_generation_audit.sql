-- =============================================================================
-- Migration: ai_question_generation_audit
-- =============================================================================
-- Per-question audit trail for batch AI generation: job, campaign, profile,
-- archetype, confidence, validation and legal status, auto-publish outcome.
-- Safe version: create columns first, then add FK constraints only if parent
-- tables exist.
-- =============================================================================

create table if not exists ai_question_generation_audit (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  batch_job_id uuid,
  campaign_id uuid,
  generation_profile text,
  scenario_archetype jsonb,
  confidence_score numeric(5,4),
  similarity_score numeric(5,4),
  medical_validation_status text,
  evidence_mapping_status text,
  legal_status text,
  auto_published boolean not null default false,
  routed_lane text,
  routing_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_qgen_audit_question_id
  on ai_question_generation_audit(question_id);

create index if not exists idx_ai_qgen_audit_batch_job_id
  on ai_question_generation_audit(batch_job_id);

create index if not exists idx_ai_qgen_audit_campaign_id
  on ai_question_generation_audit(campaign_id);

create index if not exists idx_ai_qgen_audit_created_at
  on ai_question_generation_audit(created_at desc);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ai_batch_jobs'
  ) then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'fk_ai_qgen_audit_batch_job'
    ) then
      alter table ai_question_generation_audit
        add constraint fk_ai_qgen_audit_batch_job
        foreign key (batch_job_id)
        references public.ai_batch_jobs(id)
        on delete set null;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ai_campaigns'
  ) then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'fk_ai_qgen_audit_campaign'
    ) then
      alter table ai_question_generation_audit
        add constraint fk_ai_qgen_audit_campaign
        foreign key (campaign_id)
        references public.ai_campaigns(id)
        on delete set null;
    end if;
  end if;
end $$;

comment on table ai_question_generation_audit is
  'Per-question AI generation audit trail including validation, similarity, routing, and auto-publish outcome';