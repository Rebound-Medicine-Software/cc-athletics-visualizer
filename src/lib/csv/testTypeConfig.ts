// Test type taxonomy for manual CSV uploads.
// Aligns with how API-synced rows are stored in public.test_data
// (test_name + metrics jsonb), and adds test_subtype for finer grouping.

export type TestType = 'Movement' | 'Balance' | 'Jumps' | 'Isometrics';

export interface TestSubtype {
  id: string;
  label: string;
  /** Value persisted to test_data.test_name for compatibility with existing analytics. */
  testName: string;
}

export interface TestTypeOption {
  id: TestType;
  label: string;
  description: string;
  subtypes?: TestSubtype[];
}

export const TEST_TYPES: TestTypeOption[] = [
  {
    id: 'Jumps',
    label: 'Jumps',
    description: 'Vertical, drop and reactive jump assessments (incl. unilateral variants).',
    subtypes: [
      { id: 'CMJ', label: 'CMJ', testName: 'Countermovement Jump' },
      { id: 'SL_CMJ', label: 'Single Leg CMJ', testName: 'Single Leg Countermovement Jump' },
      { id: 'LEFT_CMJ', label: 'Left CMJ', testName: 'Left Side Countermovement Jump' },
      { id: 'RIGHT_CMJ', label: 'Right CMJ', testName: 'Right Side Countermovement Jump' },
      { id: 'DJ', label: 'Drop Jump', testName: 'Drop Jump' },
      { id: 'SL_DJ', label: 'Single Leg DJ', testName: 'Single Leg Drop Jump' },
      { id: 'LEFT_DJ', label: 'Left DJ', testName: 'Left Side Drop Jump' },
      { id: 'RIGHT_DJ', label: 'Right DJ', testName: 'Right Side Drop Jump' },
      { id: 'SJ', label: 'Squat Jump', testName: 'Squat Jump' },
      { id: 'SL_SJ', label: 'Single Leg SJ', testName: 'Single Leg Squat Jump' },
      { id: 'LEFT_SJ', label: 'Left SJ', testName: 'Left Side Squat Jump' },
      { id: 'RIGHT_SJ', label: 'Right SJ', testName: 'Right Side Squat Jump' },
      { id: 'POGOS', label: 'Pogos', testName: 'Pogo Jump' },
      { id: 'SL_POGOS', label: 'Single Leg Pogos', testName: 'Single Leg Pogo Jump' },
      { id: 'LEFT_POGOS', label: 'Left Pogos', testName: 'Left Side Pogo Jump' },
      { id: 'RIGHT_POGOS', label: 'Right Pogos', testName: 'Right Side Pogo Jump' },
    ],
  },
  {
    id: 'Isometrics',
    label: 'Isometrics',
    description: 'IMTP, isometric squat, isometric pulls.',
    subtypes: [
      { id: 'IMTP', label: 'IMTP', testName: 'Isometric Mid-Thigh Pull' },
      { id: 'ISO_SQUAT', label: 'Isometric Squat', testName: 'Isometric Squat' },
      { id: 'ISO_PUSH', label: 'Isometric Push', testName: 'Isometric Push' },
    ],
  },
  {
    id: 'Movement',
    label: 'Movement',
    description: 'Functional movement assessments.',
    subtypes: [
      { id: 'GOLF_SWING', label: 'Golf Swing', testName: 'Golf Swing' },
      { id: 'SIT_TO_STAND', label: 'Sit-to-stand', testName: 'Sit-to-stand' },
    ],
  },
  {
    id: 'Balance',
    label: 'Balance',
    description: 'Single- or double-leg balance assessments.',
  },
];

export function getSubtype(typeId: TestType, subtypeId: string | null): TestSubtype | null {
  if (!subtypeId) return null;
  const t = TEST_TYPES.find((x) => x.id === typeId);
  return t?.subtypes?.find((s) => s.id === subtypeId) ?? null;
}

/** Canonical DB values allowed by test_data.test_type CHECK constraint. */
export type DbTestType = 'movement' | 'balance' | 'jump' | 'isometric' | 'pogo';

/**
 * Map UI test type + subtype to the canonical DB { test_type, test_subtype } pair.
 * Pogos subtype is special-cased to test_type = 'pogo' to match API-synced rows.
 */
export function toDbTestType(
  uiTestType: TestType,
  uiSubtypeId: string | null,
): { test_type: DbTestType; test_subtype: string | null } {
  const sub = uiSubtypeId ? uiSubtypeId.toLowerCase() : null;
  switch (uiTestType) {
    case 'Movement':
      return { test_type: 'movement', test_subtype: sub };
    case 'Balance':
      return { test_type: 'balance', test_subtype: sub };
    case 'Isometrics':
      return { test_type: 'isometric', test_subtype: sub };
    case 'Jumps':
      if (sub === 'pogos' || sub === 'pogo') return { test_type: 'pogo', test_subtype: 'pogo' };
      return { test_type: 'jump', test_subtype: sub };
    default:
      return { test_type: 'jump', test_subtype: sub };
  }
}
