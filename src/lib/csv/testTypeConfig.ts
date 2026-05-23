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
    description: 'Vertical, drop and reactive jump assessments.',
    subtypes: [
      { id: 'CMJ', label: 'CMJ', testName: 'Countermovement Jump' },
      { id: 'DJ', label: 'DJ', testName: 'Drop Jump' },
      { id: 'SJ', label: 'SJ', testName: 'Squat Jump' },
      { id: 'Pogos', label: 'Pogos', testName: 'Pogo Jump' },
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
