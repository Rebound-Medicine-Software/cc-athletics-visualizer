import { Card } from '@/components/ui/card';
import { TEST_TYPES, type TestType } from '@/lib/csv/testTypeConfig';
import { cn } from '@/lib/utils';

interface Props {
  testType: TestType | null;
  subtypeId: string | null;
  onChange: (testType: TestType, subtypeId: string | null) => void;
}

export const StepTestType = ({ testType, subtypeId, onChange }: Props) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">What test type is this?</h3>
        <p className="text-sm text-muted-foreground">
          Pick the category that matches the data in your CSV files.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEST_TYPES.map((t) => (
          <Card
            key={t.id}
            onClick={() => onChange(t.id, t.subtypes ? subtypeId : null)}
            className={cn(
              'p-4 cursor-pointer transition-colors border-2',
              testType === t.id ? 'border-primary' : 'border-transparent hover:border-border',
            )}
          >
            <div className="font-semibold">{t.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
          </Card>
        ))}
      </div>

      {testType && TEST_TYPES.find((t) => t.id === testType)?.subtypes && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Sub-type
          </div>
          <div className="flex flex-wrap gap-2">
            {TEST_TYPES.find((t) => t.id === testType)!.subtypes!.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange(testType, s.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm border transition-colors',
                  subtypeId === s.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
