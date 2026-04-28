import { toast } from 'sonner';
import { useIsViewAsMode } from './useEffectiveTeamId';

/**
 * Returns a guard function that blocks a write action when in
 * super admin View-As (impersonation) mode and shows a toast.
 *
 *   const guardWrite = useViewAsWriteGuard();
 *   const handleSave = () => {
 *     if (guardWrite('Save booking')) return;
 *     // ...perform write
 *   };
 *
 * Returns `true` when the action was blocked, `false` when safe to proceed.
 */
export const useViewAsWriteGuard = () => {
  const isViewAs = useIsViewAsMode();
  return (actionLabel = 'This action'): boolean => {
    if (!isViewAs) return false;
    toast.warning(`${actionLabel} is disabled in View-As mode.`, {
      description: 'End impersonation to perform write actions.',
    });
    return true;
  };
};
