/**
 * Track-scoping helpers - enforce strict track-scoped content visibility.
 * Use in learner pages and loaders. Admin views bypass these (see /admin).
 *
 * Usage:
 * - getPrimaryTrack(userId) - returns { trackId, trackSlug } or null
 * - getLearnerTrackContext(userId) - alias for getPrimaryTrack
 * - getTrackDisplayName(slug) - "LVN/LPN", "RN", etc.
 * - guardTrackParam(userId, paramTrack, basePath) - redirect if mismatch
 * - filterByTrack(items, track, getTrack) - filter array by track
 */

export {
  getPrimaryTrack,
  getLearnerTrackContext,
  getTrackDisplayName,
  guardTrackParam,
  filterByTrack,
  requirePrimaryTrack,
  TRACK_DISPLAY_NAMES,
  type PrimaryTrack,
} from "@/lib/auth/track";
