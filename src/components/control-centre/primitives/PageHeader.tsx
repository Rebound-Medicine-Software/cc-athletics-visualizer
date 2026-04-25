import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
    <div>
      <h1 className="cc-h1">{title}</h1>
      {subtitle && <p className="cc-subtle mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
