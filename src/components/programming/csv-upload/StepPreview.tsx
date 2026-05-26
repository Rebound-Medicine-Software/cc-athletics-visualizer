import { AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toDbTestType, type TestType } from '@/lib/csv/testTypeConfig';
import type { UploadedFileState } from './types';

interface Props {
  files: UploadedFileState[];
  testType: TestType | null;
  subtypeId: string | null;
  onResolutionChange: (idx: number, resolution: UploadedFileState['resolution']) => void;
}

export const StepPreview = ({ files, testType, subtypeId, onResolutionChange }: Props) => {
  const mapping = testType ? toDbTestType(testType, subtypeId) : null;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Preview & confirm</h3>
        <p className="text-sm text-muted-foreground">
          Review parsed rows and resolve any duplicates before importing.
        </p>
      </div>

      {mapping && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <div className="text-muted-foreground">UI test type</div>
            <div className="font-semibold">{testType}</div>
          </div>
          <div>
            <div className="text-muted-foreground">UI subtype</div>
            <div className="font-semibold">{subtypeId ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">DB test_type</div>
            <div className="font-mono font-semibold">{mapping.test_type}</div>
          </div>
          <div>
            <div className="text-muted-foreground">DB test_subtype</div>
            <div className="font-mono font-semibold">{mapping.test_subtype ?? '—'}</div>
          </div>
        </div>
      )}


      {files.map((f, i) => {
        const dupCount = (f.rowDuplicates ?? []).filter((r) => r.isDuplicate).length;
        const importable =
          (f.parsed?.rowCount ?? 0) - (f.resolution === 'force' ? 0 : dupCount);
        const detectedDate =
          f.parsed?.rows.find((r) => r.testDate)?.testDate ?? '—';

        return (
          <div key={i} className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.parsed?.rowCount ?? 0} row(s) · detected date {detectedDate}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {f.duplicateFile && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" /> Duplicate file
                  </Badge>
                )}
                {dupCount > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {dupCount} matching row{dupCount === 1 ? '' : 's'}
                  </Badge>
                )}
                {!f.duplicateFile && dupCount === 0 && (
                  <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15">
                    <CheckCircle2 className="w-3 h-3" /> Clean
                  </Badge>
                )}
              </div>
            </div>

            {f.error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded p-2">
                {f.error}
              </div>
            )}

            {f.parsed && (
              <div className="text-xs text-muted-foreground">
                Detected columns:{' '}
                <span className="font-mono">{f.parsed.headers.slice(0, 6).join(', ')}</span>
                {f.parsed.headers.length > 6 && '…'}
              </div>
            )}

            {f.parsed?.warnings && f.parsed.warnings.length > 0 && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                {f.parsed.warnings.join(' · ')}
              </div>
            )}

            {(f.duplicateFile || dupCount > 0) && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Resolution:</span>
                <Select
                  value={f.resolution}
                  onValueChange={(v) =>
                    onResolutionChange(i, v as UploadedFileState['resolution'])
                  }
                >
                  <SelectTrigger className="w-[220px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip duplicates</SelectItem>
                    <SelectItem value="import_new_only">Import only new rows</SelectItem>
                    <SelectItem value="force">Force import all</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-between text-xs pt-2 border-t">
              <span className="text-muted-foreground">
                Importable: <span className="font-semibold text-foreground">{importable}</span>
              </span>
              <span className="text-muted-foreground">
                Skipped:{' '}
                <span className="font-semibold text-foreground">
                  {(f.parsed?.rowCount ?? 0) - importable}
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
