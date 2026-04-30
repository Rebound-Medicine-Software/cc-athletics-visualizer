import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  WifiOff,
  ShieldAlert,
  Unplug,
  RefreshCw,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ErrorStateVariant =
  | "load-failed"
  | "integration-failed"
  | "permission-denied"
  | "disconnected"
  | "generic";

interface ErrorStateProps {
  variant?: ErrorStateVariant;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  inline?: boolean;
  className?: string;
}

const presets: Record<
  ErrorStateVariant,
  { icon: LucideIcon; title: string; description: string; tone: string }
> = {
  "load-failed": {
    icon: AlertCircle,
    title: "Couldn't load this section",
    description: "Something went wrong fetching the data. Please try again in a moment.",
    tone: "text-red-600 bg-red-50 border-red-200",
  },
  "integration-failed": {
    icon: WifiOff,
    title: "Integration unreachable",
    description: "We couldn't reach the connected service. Check the integration status and try again.",
    tone: "text-amber-700 bg-amber-50 border-amber-200",
  },
  "permission-denied": {
    icon: ShieldAlert,
    title: "You don't have access to this",
    description: "This area requires additional permissions. Contact your organisation admin.",
    tone: "text-slate-700 bg-slate-50 border-slate-200",
  },
  disconnected: {
    icon: Unplug,
    title: "API disconnected",
    description: "Reconnect this integration in Settings to resume data sync.",
    tone: "text-amber-700 bg-amber-50 border-amber-200",
  },
  generic: {
    icon: AlertCircle,
    title: "Something went wrong",
    description: "An unexpected error occurred.",
    tone: "text-red-600 bg-red-50 border-red-200",
  },
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  variant = "generic",
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  secondaryLabel,
  onSecondary,
  inline = false,
  className,
}) => {
  const preset = presets[variant];
  const Icon = preset.icon;

  const body = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center max-w-md mx-auto py-8",
        className
      )}
    >
      <div
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center mb-4 border",
          preset.tone
        )}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        {title ?? preset.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        {description ?? preset.description}
      </p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {onRetry && (
          <Button size="sm" onClick={onRetry} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryLabel}
          </Button>
        )}
        {secondaryLabel && (
          <Button size="sm" variant="outline" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );

  if (inline) return body;
  return (
    <Card className="border-2 border-dashed animate-fade-in">
      <CardContent className="p-6">{body}</CardContent>
    </Card>
  );
};
