/**
 * Bulk question import - JSON and CSV parsers
 * Supports flexible field mapping for AI-assisted and manual imports
 */

export type RawRow = Record<string, unknown>;

export interface ParseResult {
  success: boolean;
  rows: RawRow[];
  headers?: string[];
  error?: string;
}

/** Parse JSON: array of question objects or single object */
export function parseJson(content: string): ParseResult {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      const rows = parsed.filter((r): r is RawRow => r != null && typeof r === "object");
      return { success: true, rows };
    }
    if (parsed != null && typeof parsed === "object") {
      return { success: true, rows: [parsed as RawRow] };
    }
    return { success: false, rows: [], error: "JSON must be an array or object" };
  } catch (e) {
    return { success: false, rows: [], error: String(e) };
  }
}

/** Parse CSV with header row */
export function parseCsv(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { success: false, rows: [], error: "Empty file" };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === "," && !inQuotes) || c === "\t") {
        result.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: RawRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    if (Object.values(row).some((v) => String(v).trim())) {
      rows.push(row);
    }
  }
  return { success: true, rows, headers };
}

/** Detect format and parse */
export function parseImportFile(content: string, fileName: string): ParseResult {
  const trimmed = content.trim();
  if (fileName.endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return parseJson(content);
  }
  if (fileName.endsWith(".csv") || fileName.endsWith(".tsv") || trimmed.includes(",") || trimmed.includes("\t")) {
    return parseCsv(content);
  }
  return parseCsv(content);
}
