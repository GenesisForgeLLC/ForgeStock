/**
 * Minimal, safe CSV generation.
 * - Fields are quoted and internal quotes doubled.
 * - Formula-injection guard: values beginning with = + - @ (or tab/CR) are
 *   prefixed with a single quote so spreadsheets don't execute them.
 */
export type CsvRow = (string | number | null | undefined)[];

function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/["\n,\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: CsvRow[]): string {
  const lines = [headers.map(escapeField).join(",")];
  for (const row of rows) lines.push(row.map(escapeField).join(","));
  // Prepend BOM for Excel UTF-8 compatibility.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Convert integer cents to a plain dollar string for CSV cells. */
export function centsToCsv(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const neg = cents < 0;
  const abs = Math.abs(cents);
  return `${neg ? "-" : ""}${Math.floor(abs / 100)}.${(abs % 100).toString().padStart(2, "0")}`;
}

/** Parse CSV text into an array of string arrays (RFC-4180-ish, handles quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  // Strip a UTF-8 BOM if present.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
