import React from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * Consistent in-page section header used at the top of each dashboard
 * section's content area. Sits below the persistent DashboardHeader.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  actions,
}) => (
  <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
    <div className="min-w-0">
      <h2 className="text-lg font-semibold text-foreground leading-tight">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
