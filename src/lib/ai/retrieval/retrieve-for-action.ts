/**
 * Retrieve context for specific AI actions - shared helper for API routes.
 */

import { retrieveAndPackageContext } from "./index";
import type { RetrievalOptions } from "./types";

export interface RetrieveForExplainHighlightParams {
  query: string;
  examTrack: string;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
}

export interface RetrieveForMnemonicParams {
  query: string;
  examTrack: string;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
}

export interface RetrieveForNotebookSummaryParams {
  query: string;
  examTrack: string;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
}

export interface RetrieveForFlashcardsParams {
  query: string;
  examTrack: string;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
}

export interface RetrieveForWeakAreaCoachParams {
  query: string;
  examTrack: string;
  weakSystemIds?: string[];
  weakDomainIds?: string[];
}

function buildOptions(params: {
  examTrack: string;
  topicId?: string;
  systemId?: string;
  sourceId?: string;
  sourceType?: string;
}): RetrievalOptions {
  return {
    limit: 8,
    maxContextChars: 4000,
    filter: {
      examTrack: params.examTrack,
      topicId: params.topicId,
      systemId: params.systemId,
    },
    priority: {
      examTrack: params.examTrack,
      topicId: params.topicId,
      systemId: params.systemId,
      sourceContentId: params.sourceId,
      sourceContentType: params.sourceType,
    },
  };
}

export async function retrieveForExplainHighlight(
  params: RetrieveForExplainHighlightParams
): Promise<{ context: string; chunks: { contentId: string }[] }> {
  const { context, chunks } = await retrieveAndPackageContext(params.query, buildOptions(params));
  return { context, chunks: chunks.map((c) => ({ contentId: c.contentId })) };
}

export async function retrieveForMnemonic(
  params: RetrieveForMnemonicParams
): Promise<{ context: string; chunks: { contentId: string }[] }> {
  const { context, chunks } = await retrieveAndPackageContext(params.query, buildOptions(params));
  return { context, chunks: chunks.map((c) => ({ contentId: c.contentId })) };
}

export async function retrieveForNotebookSummary(
  params: RetrieveForNotebookSummaryParams
): Promise<{ context: string; chunks: { contentId: string }[] }> {
  const { context, chunks } = await retrieveAndPackageContext(params.query, buildOptions(params));
  return { context, chunks: chunks.map((c) => ({ contentId: c.contentId })) };
}

export async function retrieveForFlashcards(
  params: RetrieveForFlashcardsParams
): Promise<{ context: string; chunks: { contentId: string }[] }> {
  const { context, chunks } = await retrieveAndPackageContext(params.query, buildOptions(params));
  return { context, chunks: chunks.map((c) => ({ contentId: c.contentId })) };
}

export async function retrieveForWeakAreaCoach(
  params: RetrieveForWeakAreaCoachParams
): Promise<{ context: string; chunks: { contentId: string }[] }> {
  const query = params.query || "weak areas nursing exam";
  const { context, chunks } = await retrieveAndPackageContext(query, {
    limit: 8,
    filter: { examTrack: params.examTrack },
  });
  return { context, chunks: chunks.map((c) => ({ contentId: c.contentId })) };
}
