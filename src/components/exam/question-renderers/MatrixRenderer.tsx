"use client";

import type { QuestionRendererProps } from "./index";

export function MatrixRenderer({ question, response, onChange, disabled }: QuestionRendererProps) {
  const value = response?.type === "matrix" ? response.value : {};
  const rows = question.matrixRows ?? ["Row 1", "Row 2"];
  const cols = question.matrixCols ?? ["A", "B", "C"];

  const toggle = (row: string, col: string) => {
    if (disabled) return;
    const key = `${row}:${col}`;
    const next = { ...value };
    if (next[key]) delete next[key];
    else next[key] = col;
    onChange({ type: "matrix", value: next });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-slate-200 dark:border-slate-700 p-2 text-left" />
              {cols.map((c) => (
                <th key={c} className="border border-slate-200 dark:border-slate-700 p-2 text-center">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <td className="border border-slate-200 dark:border-slate-700 p-2 font-medium">{r}</td>
                {cols.map((c) => (
                  <td key={c} className="border border-slate-200 dark:border-slate-700 p-2 text-center">
                    <input
                      type="radio"
                      name={`m-${question.id}-${r}`}
                      checked={value[`${r}:${c}`] === c}
                      onChange={() => toggle(r, c)}
                      disabled={disabled}
                      className="w-4 h-4"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
