import type { TestType } from '@/lib/csv/testTypeConfig';
import type { ParsedCsv } from '@/lib/csv/parseCsv';
import type { RowDuplicateStatus } from '@/lib/csv/detectDuplicates';
import type { FileFingerprint } from '@/lib/csv/fingerprintFile';

export type DuplicateResolution = 'skip' | 'import_new_only' | 'force';

export interface UploadedFileState {
  file: File;
  fingerprint?: FileFingerprint;
  parsed?: ParsedCsv;
  duplicateFile?: { existingFileId: string; existingBatchId: string } | null;
  rowDuplicates?: RowDuplicateStatus[];
  resolution: DuplicateResolution;
  error?: string;
}

export interface WizardState {
  files: UploadedFileState[];
  testType: TestType | null;
  testSubtypeId: string | null;
  teamId: string | null;
  athleteId: string | null;
}
