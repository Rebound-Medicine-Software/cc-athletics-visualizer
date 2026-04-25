import React from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'muted';

interface StatusBadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  dot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant = 'muted', children, dot }) => (
  <span className={`cc-badge cc-badge-${variant}`}>
    {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />}
    {children}
  </span>
);
