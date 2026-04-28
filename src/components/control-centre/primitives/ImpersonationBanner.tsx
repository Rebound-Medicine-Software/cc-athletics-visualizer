import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useImpersonation } from '@/lib/impersonation/ImpersonationContext';
import { ShieldAlert, X } from 'lucide-react';

export const ImpersonationBanner: React.FC = () => {
  const { impersonation, endImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!impersonation) return null;

  const handleEnd = async () => {
    await endImpersonation();
    navigate('/control-centre');
  };

  return (
    <div
      className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium"
      style={{
        background: 'linear-gradient(90deg, #b45309, #f59e0b)',
        color: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 2000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}
      role="alert"
    >
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">
          Impersonating <strong>{impersonation.teamName}</strong> · Read-only super admin view ·
          Reason: <em className="font-normal">{impersonation.reason}</em>
        </span>
      </div>
      <button
        onClick={handleEnd}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-black/30 hover:bg-black/50 transition-colors flex-shrink-0"
      >
        <X className="w-3 h-3" />
        End Impersonation
      </button>
    </div>
  );
};
