-- =============================================================================
-- Migration 026: Exam Assembly Studio
-- =============================================================================
-- Adds assembly_rules and assembly_mode for rule-based exam composition.
-- Supports blueprint/domain/system/topic/item_type/difficulty targeting.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- exam_templates: assembly rules
-- -----------------------------------------------------------------------------
ALTER TABLE exam_templates
  ADD COLUMN IF NOT EXISTS assembly_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (assembly_mode IN ('manual', 'rule_based', 'hybrid')),
  ADD COLUMN IF NOT EXISTS assembly_rules JSONB DEFAULT '{}';

COMMENT ON COLUMN exam_templates.assembly_mode IS 'manual=pool only, rule_based=generate from rules, hybrid=rule fill + manual pool';
COMMENT ON COLUMN exam_templates.assembly_rules IS '{
  "totalCount": 150,
  "bySystem": [{ "systemId": "uuid", "min": 10, "max": 25 }],
  "byDomain": [{ "domainId": "uuid", "min": 5, "max": 25 }],
  "byTopic": [{ "topicId": "uuid", "min": 2, "max": 10 }],
  "byItemType": [{ "itemTypeSlug": "single_best_answer", "min": 100 }],
  "byDifficulty": [{ "tier": 1, "min": 20 }, { "tier": 2, "min": 50 }]
}';

-- -----------------------------------------------------------------------------
-- system_exams: assembly rules
-- -----------------------------------------------------------------------------
ALTER TABLE system_exams
  ADD COLUMN IF NOT EXISTS assembly_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (assembly_mode IN ('manual', 'rule_based', 'hybrid')),
  ADD COLUMN IF NOT EXISTS assembly_rules JSONB DEFAULT '{}';
