import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { motionEase } from "@/lib/motion";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /** Render inline (no card wrapper) — useful inside an existing Card */
  inline?: boolean;
  /** Reduce vertical padding for use inside small containers */
  compact?: boolean;
  className?: string;
}

const renderAction = (a: EmptyStateAction, fallbackVariant: EmptyStateAction["variant"]) => {
  const Icon = a.icon;
  const content = (
    <>
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {a.label}
    </>
  );
  if (a.href) {
    return (
      <Button asChild size="sm" variant={a.variant ?? fallbackVariant}>
        <a href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
          {content}
        </a>
      </Button>
    );
  }
  return (
    <Button size="sm" variant={a.variant ?? fallbackVariant} onClick={a.onClick}>
      {content}
    </Button>
  );
};

/**
 * Reusable empty state. Use `inline` for inside-a-card layouts, otherwise it
 * renders inside its own dashed Card matching the dashboard chrome.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  primaryAction,
  secondaryAction,
  inline = false,
  compact = false,
  className,
}) => {
  const reduce = useReducedMotion();
  const body = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center max-w-md mx-auto",
        compact ? "py-6" : "py-10",
        className
      )}
    >
      <motion.div
        initial={reduce ? false : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.32, ease: motionEase.emphasized }}
        className={cn(
          "rounded-full bg-muted flex items-center justify-center mb-4",
          compact ? "w-12 h-12" : "w-16 h-16"
        )}
      >
        <Icon className={cn("text-muted-foreground", compact ? "h-6 w-6" : "h-8 w-8")} />
      </motion.div>
      <h3 className={cn("font-semibold text-foreground mb-1.5", compact ? "text-sm" : "text-lg")}>
        {title}
      </h3>
      {description && (
        <p className={cn("text-muted-foreground mb-5", compact ? "text-xs" : "text-sm")}>
          {description}
        </p>
      )}
      {(primaryAction || secondaryAction) && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.08, ease: motionEase.standard }}
          className="flex items-center gap-2 flex-wrap justify-center"
        >
          {primaryAction && renderAction(primaryAction, "default")}
          {secondaryAction && renderAction(secondaryAction, "outline")}
        </motion.div>
      )}
    </div>
  );

  if (inline) return body;

  return (
    <Card className="border-2 border-dashed bg-muted/20 animate-fade-in">
      <CardContent className="p-6">{body}</CardContent>
    </Card>
  );
};
