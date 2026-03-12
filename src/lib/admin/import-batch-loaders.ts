/**
 * Load question import batches for admin
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface ImportBatchRow {
  id: string;
  sourceName: string | null;
  sourceType: string;
  fileName: string | null;
  totalRows: number;
  importedCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

export async function loadImportBatches(limit = 20): Promise<ImportBatchRow[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("question_import_batches")
      .select("id, source_name, source_type, file_name, total_rows, imported_count, failed_count, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((b) => ({
      id: b.id,
      sourceName: b.source_name,
      sourceType: b.source_type ?? "manual",
      fileName: b.file_name,
      totalRows: b.total_rows ?? 0,
      importedCount: b.imported_count ?? 0,
      failedCount: b.failed_count ?? 0,
      status: b.status ?? "pending",
      createdAt: b.created_at ?? "",
    }));
  });
}
