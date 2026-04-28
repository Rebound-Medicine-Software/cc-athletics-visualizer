import React from 'react';

/**
 * Lightweight loading state used by route guards while
 * the Supabase session and profile are still loading.
 */
const AuthLoading: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen w-full flex items-center justify-center bg-background text-foreground"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  );
};

export default AuthLoading;
