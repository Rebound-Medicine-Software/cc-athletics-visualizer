import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  label: string;
  optional?: boolean;
}

interface WizardStepperProps {
  steps: WizardStep[];
  /** Zero-indexed current step */
  current: number;
  /** Set of step ids that are marked complete */
  completed: Set<string>;
  onStepClick?: (index: number) => void;
}

/**
 * Horizontal step indicator for the organisation onboarding wizard.
 * Collapses to a compact "Step X of Y" bar on small screens.
 */
export const WizardStepper = ({ steps, current, completed, onStepClick }: WizardStepperProps) => {
  return (
    <div className="w-full">
      {/* Mobile: compact progress bar */}
      <div className="sm:hidden mb-4">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span className="font-semibold">
            Step {current + 1} of {steps.length}
          </span>
          <span>{steps[current]?.label}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: full step list */}
      <ol className="hidden sm:flex items-center justify-between gap-2">
        {steps.map((step, i) => {
          const isCompleted = completed.has(step.id);
          const isCurrent = i === current;
          const clickable = !!onStepClick && (isCompleted || i <= current);
          return (
            <li key={step.id} className="flex-1 flex items-center">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(i)}
                className={cn(
                  "flex items-center gap-2 text-left transition-colors",
                  clickable ? "cursor-pointer" : "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 shrink-0 transition-colors",
                    isCompleted
                      ? "bg-blue-600 border-blue-600 text-white"
                      : isCurrent
                      ? "bg-white border-blue-600 text-blue-600"
                      : "bg-white border-gray-300 text-gray-400"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                </span>
                <div className="hidden lg:block">
                  <div
                    className={cn(
                      "text-xs font-semibold leading-tight",
                      isCurrent ? "text-blue-700" : isCompleted ? "text-gray-700" : "text-gray-400"
                    )}
                  >
                    {step.label}
                  </div>
                  {step.optional && (
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                      Optional
                    </div>
                  )}
                </div>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-2 transition-colors",
                    completed.has(step.id) ? "bg-blue-600" : "bg-gray-300"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
