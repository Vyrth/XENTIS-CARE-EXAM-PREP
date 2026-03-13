-- Enable auto-publish for questions when quality gate passes.
-- Other content types (study_guide, flashcard_deck, high_yield_content) remain disabled
-- until source metadata and quality scoring are fully wired for each.
UPDATE auto_publish_config
SET enabled = true, updated_at = now()
WHERE content_type = 'question';
