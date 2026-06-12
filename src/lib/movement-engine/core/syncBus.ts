// Tiny typed pub/sub for cross-component synchronisation
// (video ↔ force chart ↔ CoP ↔ phase timeline).

export type SyncEvent =
  | { type: 'time'; ms: number; source?: string }
  | { type: 'phase'; name: string; eventIndex?: number; source?: string }
  | { type: 'impact'; eventIndex: number; source?: string }
  | { type: 'swingIndex'; index: number; source?: string }
  | { type: 'play' | 'pause'; source?: string };

type Handler = (e: SyncEvent) => void;

class SyncBus {
  private handlers = new Set<Handler>();
  on(h: Handler) {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }
  emit(e: SyncEvent) {
    this.handlers.forEach((h) => {
      try { h(e); } catch (err) { console.error('syncBus handler error', err); }
    });
  }
}

export const syncBus = new SyncBus();
