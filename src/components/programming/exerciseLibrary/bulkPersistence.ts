import type { Exercise } from './types';

const SELECTION_KEY = 'exlib.selection.v1';
const UNDO_KEY = 'exlib.undo.v1';
const UNDO_TTL_MS = 15_000;

interface SelectionBlob {
  teamId: string;
  ids: string[];
  exercises: Exercise[];
  savedAt: number;
}

interface UndoBlob {
  teamId: string;
  exercises: Exercise[];
  savedAt: number;
}

const safeGet = (k: string): string | null => {
  try { return sessionStorage.getItem(k); } catch { return null; }
};
const safeSet = (k: string, v: string) => {
  try { sessionStorage.setItem(k, v); } catch { /* ignore quota */ }
};
const safeRemove = (k: string) => {
  try { sessionStorage.removeItem(k); } catch { /* ignore */ }
};

export const saveSelection = (teamId: string, exercises: Exercise[]) => {
  if (!teamId) return;
  if (exercises.length === 0) {
    safeRemove(SELECTION_KEY);
    return;
  }
  const blob: SelectionBlob = {
    teamId,
    ids: exercises.map((e) => e.id),
    exercises,
    savedAt: Date.now(),
  };
  safeSet(SELECTION_KEY, JSON.stringify(blob));
};

export const loadSelection = (teamId: string): Exercise[] => {
  const raw = safeGet(SELECTION_KEY);
  if (!raw) return [];
  try {
    const blob = JSON.parse(raw) as SelectionBlob;
    if (blob.teamId !== teamId) return [];
    return blob.exercises ?? [];
  } catch {
    return [];
  }
};

export const clearSelectionStorage = () => safeRemove(SELECTION_KEY);

export const saveUndoBuffer = (teamId: string, exercises: Exercise[]) => {
  if (!teamId || exercises.length === 0) return;
  const blob: UndoBlob = { teamId, exercises, savedAt: Date.now() };
  safeSet(UNDO_KEY, JSON.stringify(blob));
};

export const loadUndoBuffer = (teamId: string): Exercise[] => {
  const raw = safeGet(UNDO_KEY);
  if (!raw) return [];
  try {
    const blob = JSON.parse(raw) as UndoBlob;
    if (blob.teamId !== teamId) return [];
    if (Date.now() - blob.savedAt > UNDO_TTL_MS) {
      safeRemove(UNDO_KEY);
      return [];
    }
    return blob.exercises ?? [];
  } catch {
    return [];
  }
};

export const clearUndoBuffer = () => safeRemove(UNDO_KEY);

export const UNDO_TTL = UNDO_TTL_MS;
