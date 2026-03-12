/**
 * Publish validation - ensure content has valid track before publishing
 * Topic summaries can be shared (exam_track_id null); all other content must have a track.
 */

export type PublishableContentType = "question" | "study_guide" | "video" | "flashcard_deck" | "topic_summary";

export interface PublishValidationResult {
  canPublish: boolean;
  reason?: string;
}

/**
 * Check if content can be published (has valid track or is explicitly shared).
 * - questions, study_guides, video_lessons, flashcard_decks: require exam_track_id (NOT NULL in schema)
 * - topic_summaries: exam_track_id can be null = "shared" across tracks
 */
export function canPublishContent(
  contentType: PublishableContentType,
  examTrackId: string | null
): PublishValidationResult {
  if (contentType === "topic_summary") {
    // Topic summaries can be shared (null) or track-specific
    return { canPublish: true };
  }

  if (!examTrackId || examTrackId.trim() === "") {
    return {
      canPublish: false,
      reason: "Content must be assigned to a track before publishing. Select a track in the editor.",
    };
  }

  return { canPublish: true };
}
