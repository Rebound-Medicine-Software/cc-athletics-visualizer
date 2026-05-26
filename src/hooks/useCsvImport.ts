import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UploadedFileState } from '@/components/programming/csv-upload/types';
import type { TestType } from '@/lib/csv/testTypeConfig';
import { getSubtype, toDbTestType } from '@/lib/csv/testTypeConfig';

interface ImportArgs {
  teamId: string;
  athleteId: string;
  athleteName: string;
  teamName: string;
  ccAthleteId: string | null;
  testType: TestType;
  testSubtypeId: string | null;
  files: UploadedFileState[];
  uploadedBy: string | null;
}

export interface ImportSummary {
  batchId: string;
  filesImported: number;
  rowsImported: number;
  rowsSkipped: number;
  duplicateConflicts: number;
  rowsParsed: number;
  rowsAttempted: number;
  errors: { fileName: string; message: string }[];
}

/** Look up duplicate files by content hash for an athlete+test type combo. */
export async function findDuplicateFile(athleteId: string, testType: string, fileHash: string) {
  const { data } = await supabase
    .from('csv_import_files')
    .select('id, batch_id')
    .eq('athlete_id', athleteId)
    .eq('test_type', testType)
    .eq('file_hash', fileHash)
    .maybeSingle();
  return data ? { existingFileId: data.id, existingBatchId: data.batch_id } : null;
}

export function useCsvImport() {
  return useMutation({
    mutationFn: async (args: ImportArgs): Promise<ImportSummary> => {
      const subtype = getSubtype(args.testType, args.testSubtypeId);
      const testName = subtype?.testName ?? args.testType;
      const { test_type: dbTestType, test_subtype: dbTestSubtype } = toDbTestType(
        args.testType,
        args.testSubtypeId,
      );

      // 1. Create batch
      const fileNames = args.files.map((f) => f.file.name);
      const fileHashes = args.files.map((f) => f.fingerprint!.hash);

      const { data: batch, error: batchErr } = await supabase
        .from('csv_import_batches')
        .insert({
          team_id: args.teamId,
          athlete_id: args.athleteId,
          uploaded_by: args.uploadedBy,
          test_type: args.testType,
          test_subtype: args.testSubtypeId,
          file_names: fileNames,
          file_hashes: fileHashes,
          status: 'pending',
        })
        .select('id')
        .single();
      if (batchErr || !batch) throw batchErr ?? new Error('Failed to create batch');

      let totalRowsParsed = 0;
      let totalRowsImported = 0;
      let totalRowsSkipped = 0;
      let totalConflicts = 0;
      let totalRowsAttempted = 0;
      let filesImported = 0;
      const errors: { fileName: string; message: string }[] = [];

      for (const f of args.files) {
        if (!f.parsed || !f.fingerprint) continue;
        const isDupFile = !!f.duplicateFile;
        const shouldSkipFile = isDupFile && f.resolution === 'skip';

        if (shouldSkipFile) {
          totalRowsSkipped += f.parsed.rowCount;
          await supabase.from('csv_import_files').insert({
            batch_id: batch.id,
            team_id: args.teamId,
            athlete_id: args.athleteId,
            test_type: args.testType,
            file_name: f.file.name,
            file_size: f.file.size,
            file_last_modified: new Date(f.file.lastModified).toISOString(),
            file_hash: f.fingerprint.hash + '_dup_' + Date.now(), // avoid unique collision
            rows_parsed: f.parsed.rowCount,
            rows_imported: 0,
            rows_skipped: f.parsed.rowCount,
            status: 'skipped_duplicate_file',
          });
          continue;
        }

        // Build rows to insert, respecting per-row duplicate resolution
        const dupSet = new Set(
          (f.rowDuplicates ?? []).filter((r) => r.isDuplicate).map((r) => r.index),
        );
        totalConflicts += dupSet.size;

        const rowsToInsert = f.parsed.rows
          .map((row, i) => ({ row, i }))
          .filter(({ i }) => {
            if (!dupSet.has(i)) return true;
            return f.resolution === 'force';
          })
          .map(({ row }) => ({
            athlete_id: args.athleteId,
            cc_athlete_id: args.ccAthleteId ?? args.athleteId,
            athlete_name: args.athleteName,
            team_name: args.teamName,
            team_id: args.teamId,
            test_date: row.testDate ?? new Date().toISOString().split('T')[0],
            test_name: testName,
            test_type: args.testType,
            test_subtype: args.testSubtypeId,
            repetition_number: row.repetitionNumber,
            metrics: row.metrics,
            source: 'manual_csv',
            import_batch_id: batch.id,
            file_hash: f.fingerprint!.hash,
            original_file_name: f.file.name,
            uploaded_by: args.uploadedBy,
          }));

        const skippedThisFile = f.parsed.rowCount - rowsToInsert.length;
        totalRowsParsed += f.parsed.rowCount;
        totalRowsSkipped += skippedThisFile;

        let fileStatus: 'imported' | 'partial' | 'failed' | 'skipped_all_duplicates' = 'imported';
        let fileError: string | null = null;
        let insertedCount = 0;

        if (rowsToInsert.length > 0) {
          totalRowsAttempted += rowsToInsert.length;
          const { error: insErr, count } = await supabase
            .from('test_data')
            .insert(rowsToInsert, { count: 'exact' });
          if (insErr) {
            fileStatus = 'failed';
            fileError = insErr.message;
            errors.push({ fileName: f.file.name, message: insErr.message });
            console.error('[CSV import] test_data insert failed', insErr, { sampleRow: rowsToInsert[0] });
          } else {
            insertedCount = count ?? rowsToInsert.length;
            totalRowsImported += insertedCount;
            if (skippedThisFile > 0) fileStatus = 'partial';
            filesImported += 1;
          }
        } else {
          fileStatus = 'skipped_all_duplicates';
        }

        await supabase.from('csv_import_files').insert({
          batch_id: batch.id,
          team_id: args.teamId,
          athlete_id: args.athleteId,
          test_type: args.testType,
          file_name: f.file.name,
          file_size: f.file.size,
          file_last_modified: new Date(f.file.lastModified).toISOString(),
          file_hash: f.fingerprint.hash,
          rows_parsed: f.parsed.rowCount,
          rows_imported: insertedCount,
          rows_skipped: skippedThisFile,
          status: fileStatus,
          error: fileError,
        });
      }

      const overallStatus =
        totalRowsImported === 0 ? 'failed' : totalRowsSkipped > 0 ? 'partial' : 'completed';

      await supabase
        .from('csv_import_batches')
        .update({
          rows_parsed: totalRowsParsed,
          rows_imported: totalRowsImported,
          rows_skipped: totalRowsSkipped,
          duplicate_conflicts: totalConflicts,
          status: overallStatus,
        })
        .eq('id', batch.id);

      return {
        batchId: batch.id,
        filesImported,
        rowsImported: totalRowsImported,
        rowsSkipped: totalRowsSkipped,
        duplicateConflicts: totalConflicts,
        rowsParsed: totalRowsParsed,
        rowsAttempted: totalRowsAttempted,
        errors,
      };
    },
  });
}
