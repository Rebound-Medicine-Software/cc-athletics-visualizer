import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Ctx = {
  /** Register/clear an unsaved-changes flag for a given form id. */
  setDirty: (id: string, dirty: boolean) => void;
  /** Run `action` if no forms are dirty, otherwise prompt the user. */
  guard: (action: () => void) => void;
  isDirty: boolean;
};

const UnsavedChangesContext = createContext<Ctx | null>(null);

export const UnsavedChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dirtyMap = useRef<Map<string, boolean>>(new Map());
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const recompute = useCallback(() => {
    const any = Array.from(dirtyMap.current.values()).some(Boolean);
    setIsDirty(any);
  }, []);

  const setDirty = useCallback((id: string, dirty: boolean) => {
    if (dirty) dirtyMap.current.set(id, true);
    else dirtyMap.current.delete(id);
    recompute();
  }, [recompute]);

  const guard = useCallback((action: () => void) => {
    const any = Array.from(dirtyMap.current.values()).some(Boolean);
    if (any) {
      setPendingAction(() => action);
    } else {
      action();
    }
  }, []);

  const handleDiscard = () => {
    dirtyMap.current.clear();
    setIsDirty(false);
    const a = pendingAction;
    setPendingAction(null);
    a?.();
  };

  const value = useMemo(() => ({ setDirty, guard, isDirty }), [setDirty, guard, isDirty]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <AlertDialog open={!!pendingAction} onOpenChange={(o) => !o && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave now, your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on page</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChanges = () => {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    // Safe fallback when used outside provider
    return {
      setDirty: () => {},
      guard: (a: () => void) => a(),
      isDirty: false,
    } as Ctx;
  }
  return ctx;
};

/** Hook that registers a form's dirty state and unregisters on unmount. */
export const useDirtyTracker = (id: string, dirty: boolean) => {
  const { setDirty } = useUnsavedChanges();
  React.useEffect(() => {
    setDirty(id, dirty);
    return () => setDirty(id, false);
  }, [id, dirty, setDirty]);

  // Native browser-leave guard
  React.useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
};
