// Shared test-type/subtype matching used by Analytics and Performance Data.
// Source of truth for mapping a UI (testType, subtype) selection to the
// concrete `test_name` strings that exist in CC Athletics API rows AND in
// manual CSV imports. Avoids duplicating brittle filter logic.

import type { TestType } from '@/lib/csv/testTypeConfig';

export interface TestRowLike {
  test_type?: string | null;
  test_subtype?: string | null;
  test_name?: string | null;
}

/** Canonical DB test_type values. */
export const DB_TEST_TYPE: Record<TestType, string> = {
  Jumps: 'jump',
  Isometrics: 'isometric',
  Movement: 'movement',
  Balance: 'balance',
};

/**
 * Substrings to match against test_name (case-insensitive) for each UI subtype.
 * Returning null = no name restriction (only test_type matters).
 */
export function namePatternsFor(
  testType: TestType,
  subtypeId: string | null,
): string[] | null {
  if (!subtypeId) return null;
  const id = subtypeId.toUpperCase();
  if (testType === 'Jumps') {
    switch (id) {
      case 'CMJ': return ['countermovement jump'];
      case 'DJ': return ['drop jump'];
      case 'SJ': return ['squat jump'];
      case 'POGOS':
      case 'POGO': return ['pogo'];
    }
  }
  if (testType === 'Isometrics') {
    switch (id) {
      case 'IMTP': return ['imtp', 'mid-thigh', 'mid thigh'];
      case 'ISO_SQUAT': return ['isometric squat'];
      case 'ISO_PUSH': return ['isometric push'];
    }
  }
  if (testType === 'Movement') {
    switch (id) {
      case 'GOLF_SWING': return ['golf'];
      case 'SIT_TO_STAND': return ['sit-to-stand', 'sit to stand'];
    }
  }
  return null;
}

/**
 * Acceptable test_type values for a UI selection. Pogos are special-cased
 * (stored as test_type='pogo' in DB, surfaced under "Jumps" in the UI).
 */
export function dbTestTypesFor(
  testType: TestType,
  subtypeId: string | null,
): string[] {
  if (testType === 'Jumps') {
    const id = (subtypeId || '').toUpperCase();
    if (id === 'POGOS' || id === 'POGO') return ['pogo'];
    if (id === 'DJ') return ['jump', 'isometric']; // Single Leg DJ is mis-typed as 'isometric'
    if (!subtypeId) return ['jump', 'pogo'];
    return ['jump'];
  }
  return [DB_TEST_TYPE[testType]];
}

/** True if a row matches the UI (testType, subtype) selection. */
export function rowMatchesUiSelection(
  row: TestRowLike,
  testType: TestType | null,
  subtypeId: string | null,
): boolean {
  if (!testType) return true;
  const tt = (row.test_type || '').toLowerCase();
  const tn = (row.test_name || '').toLowerCase();

  const allowedTypes = dbTestTypesFor(testType, subtypeId);
  // For DJ we may also accept rows where test_type isn't set yet but the name matches.
  const typeOk = !tt || allowedTypes.includes(tt) || (testType === 'Jumps' && /jump|pogo/.test(tt));
  if (!typeOk && tt) return false;

  const patterns = namePatternsFor(testType, subtypeId);
  if (!patterns) return true;
  return patterns.some((p) => tn.includes(p));
}

/** Infer a canonical test_type from a free-form test_name (for live API rows). */
export function inferTestTypeFromName(name: string | null | undefined): string {
  const n = (name || '').toLowerCase();
  if (/pogo/.test(n)) return 'pogo';
  if (/jump/.test(n)) return 'jump';
  if (/isometric|imtp|mid-thigh|hamstring|quad|adductor|neck|gastroc|soleus/.test(n)) return 'isometric';
  if (/balance|sway|cop/.test(n)) return 'balance';
  if (/golf|sit-to-stand|squat assessment|movement/.test(n)) return 'movement';
  return 'jump';
}
