import { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { supabase } from '@/integrations/supabase/client';
import { WizardStepper } from '@/components/setup/WizardStepper';
import { StepFilesUpload } from './StepFilesUpload';
import { StepTestType } from './StepTestType';
import { StepAssignTarget } from './StepAssignTarget';
import { StepPreview } from './StepPreview';
import { fingerprintFile } from '@/lib/csv/fingerprintFile';
import { parseCsvFile } from '@/lib/csv/parseCsv';
import { detectRowDuplicates } from '@/lib/csv/detectDuplicates';
import { getSubtype } from '@/lib/csv/testTypeConfig';
import { useCsvImport, findDuplicateFile, type ImportSummary } from '@/hooks/useCsvImport';
import type { UploadedFileState, WizardState } from './types';

const STEPS = [
  { id: 'files', label: 'Upload files' },
  { id: 'type', label: 'Test type' },
  { id: 'target', label: 'Team & athlete' },
  { id: 'preview', label: 'Preview & import' },
];

export const CsvUploadWizard = () => {
  const { user } = useAuth();
  const { teamId: defaultTeamId } = useEffectiveTeamId();
  const importMutation = useCsvImport();

  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const [state, setState] = useState<WizardState>({
    files: [],
    testType: null,
    testSubtypeId: null,
    teamId: defaultTeamId,
    athleteId: null,
  });

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const handleAddFiles = useCallback(async (newFiles: File[]) => {
    const enriched: UploadedFileState[] = await Promise.all(
      newFiles.map(async (file) => ({
        file,
        fingerprint: await fingerprintFile(file),
        resolution: 'skip' as const,
      })),
    );
    setState((s) => ({ ...s, files: [...s.files, ...enriched] }));
  }, []);

  const handleRemoveFile = useCallback((idx: number) => {
    setState((s) => ({ ...s, files: s.files.filter((_, i) => i !== idx) }));
  }, []);

  const handleSetResolution = useCallback(
    (idx: number, resolution: UploadedFileState['resolution']) => {
      setState((s) => ({
        ...s,
        files: s.files.map((f, i) => (i === idx ? { ...f, resolution } : f)),
      }));
    },
    [],
  );

  const goNext = useCallback(async () => {
    const currentId = STEPS[step].id;

    if (currentId === 'target') {
      // Run parsing + duplicate detection before preview
      if (!state.testType || !state.athleteId) return;
      const subtype = getSubtype(state.testType, state.testSubtypeId);
      const testName = subtype?.testName ?? state.testType;

      const enriched: UploadedFileState[] = [];
      for (const f of state.files) {
        try {
          const parsed = await parseCsvFile(f.file, state.testType);
          const dupFile = await findDuplicateFile(
            state.athleteId,
            state.testType,
            f.fingerprint!.hash,
          );
          const rowDuplicates = await detectRowDuplicates({
            athleteId: state.athleteId,
            testType: state.testType,
            testName,
            rows: parsed.rows,
            fallbackDate: new Date().toISOString().split('T')[0],
          });
          enriched.push({
            ...f,
            parsed,
            duplicateFile: dupFile,
            rowDuplicates,
            resolution: dupFile ? 'skip' : 'import_new_only',
          });
        } catch (err: any) {
          enriched.push({ ...f, error: err.message ?? String(err), resolution: 'skip' });
        }
      }
      setState((s) => ({ ...s, files: enriched }));
    }

    setCompleted((c) => new Set([...c, currentId]));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [step, state]);

  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const canProceed = useMemo(() => {
    const id = STEPS[step].id;
    if (id === 'files') return state.files.length > 0;
    if (id === 'type') return !!state.testType;
    if (id === 'target') return !!state.teamId && !!state.athleteId;
    if (id === 'preview') {
      return (
        state.files.some((f) => f.parsed && f.parsed.rowCount > 0) &&
        state.files.every((f) => !f.duplicateFile || f.resolution !== undefined)
      );
    }
    return false;
  }, [step, state]);

  const handleImport = useCallback(async () => {
    if (!state.teamId || !state.athleteId || !state.testType) return;

    // Fetch athlete + team display names for test_data row
    const { data: athlete } = await supabase
      .from('athletes')
      .select('name, cc_athlete_id, team_id, teams ( name )')
      .eq('id', state.athleteId)
      .single();

    if (!athlete) {
      toast.error('Athlete not found');
      return;
    }

    try {
      const result = await importMutation.mutateAsync({
        teamId: state.teamId,
        athleteId: state.athleteId,
        athleteName: athlete.name,
        teamName: (athlete as any).teams?.name ?? '',
        ccAthleteId: athlete.cc_athlete_id ?? null,
        testType: state.testType,
        testSubtypeId: state.testSubtypeId,
        files: state.files,
        uploadedBy: user?.id ?? null,
      });
      setSummary(result);
      toast.success(`Imported ${result.rowsImported} test rows`);
    } catch (err: any) {
      toast.error(err.message ?? 'Import failed');
    }
  }, [state, importMutation, user]);

  if (summary) {
    return (
      <Card className="p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="text-xl font-semibold">Import complete</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>{summary.filesImported} file(s) imported</div>
          <div>{summary.rowsImported} new test rows added</div>
          <div>{summary.rowsSkipped} row(s) skipped</div>
          <div>{summary.duplicateConflicts} duplicate conflict(s) detected</div>
        </div>
        <Button
          onClick={() => {
            setSummary(null);
            setStep(0);
            setCompleted(new Set());
            setState({
              files: [],
              testType: null,
              testSubtypeId: null,
              teamId: defaultTeamId,
              athleteId: null,
            });
          }}
        >
          Upload more files
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <WizardStepper
        steps={STEPS}
        current={step}
        completed={completed}
        onStepClick={(i) => i <= step && setStep(i)}
      />

      <Card className="p-6">
        {STEPS[step].id === 'files' && (
          <StepFilesUpload
            files={state.files}
            onAdd={handleAddFiles}
            onRemove={handleRemoveFile}
          />
        )}
        {STEPS[step].id === 'type' && (
          <StepTestType
            testType={state.testType}
            subtypeId={state.testSubtypeId}
            onChange={(testType, testSubtypeId) => update({ testType, testSubtypeId })}
          />
        )}
        {STEPS[step].id === 'target' && (
          <StepAssignTarget
            teamId={state.teamId}
            athleteId={state.athleteId}
            onChange={(teamId, athleteId) => update({ teamId, athleteId })}
          />
        )}
        {STEPS[step].id === 'preview' && (
          <StepPreview files={state.files} onResolutionChange={handleSetResolution} />
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goBack} disabled={step === 0 || importMutation.isPending}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        {STEPS[step].id === 'preview' ? (
          <Button onClick={handleImport} disabled={!canProceed || importMutation.isPending}>
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…
              </>
            ) : (
              'Import new data'
            )}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canProceed}>
            Next <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};
