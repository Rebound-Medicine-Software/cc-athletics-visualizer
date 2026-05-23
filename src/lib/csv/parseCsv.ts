import Papa from 'papaparse';
import type { TestType } from './testTypeConfig';
import { mapRowToMetrics } from './mapMetrics';

export interface ParsedCsvRow {
  testDate: string | null;
  repetitionNumber: number;
  metrics: Record<string, any>;
}

export interface ParsedCsv {
  fileName: string;
  headers: string[];
  rowCount: number;
  rows: ParsedCsvRow[];
  warnings: string[];
}

export async function parseCsvFile(file: File, testType: TestType): Promise<ParsedCsv> {
  const text = await file.text();
  const warnings: string[] = [];

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    for (const e of result.errors.slice(0, 3)) warnings.push(e.message);
  }

  const headers = result.meta.fields ?? [];
  const rows: ParsedCsvRow[] = [];
  let autoRep = 0;
  for (const r of result.data) {
    if (!r || Object.values(r).every((v) => v == null || String(v).trim() === '')) continue;
    autoRep += 1;
    const mapped = mapRowToMetrics(r as any, testType);
    rows.push({
      testDate: mapped.testDate ?? null,
      repetitionNumber: mapped.repetition ?? autoRep,
      metrics: mapped.metrics,
    });
  }

  if (rows.length === 0) warnings.push('No data rows detected.');

  return {
    fileName: file.name,
    headers,
    rowCount: rows.length,
    rows,
    warnings,
  };
}
