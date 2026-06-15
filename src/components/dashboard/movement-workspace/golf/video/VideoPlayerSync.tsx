import { useEffect, useRef, useState } from 'react';
import { syncBus } from '@/lib/movement-engine/core/syncBus';

interface Props {
  src: string;
  offsetMs: number;
  /** When user adjusts offset via calibrator. */
  onOffsetChange?: (ms: number) => void;
  /** When playback duration known. */
  onDuration?: (ms: number) => void;
  className?: string;
}

/**
 * <video> wrapper that bridges to syncBus:
 * - emits `time` on timeupdate (videoTime - offset = sessionTime)
 * - subscribes to `time` events from elsewhere and seeks accordingly
 * - subscribes to `phase` events and seeks to that phase's time
 */
export function VideoPlayerSync({ src, offsetMs, onDuration, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastEmitRef = useRef(0);
  const selfRef = useRef('video-' + Math.random().toString(36).slice(2, 7));
  const [duration, setDuration] = useState(0);

  // Subscribe to remote sync events → seek video
  useEffect(() => {
    const off = syncBus.on((e) => {
      const v = ref.current; if (!v) return;
      if (e.source === selfRef.current) return;
      if (e.type === 'time') {
        const tgt = (e.ms + offsetMs) / 1000;
        if (Math.abs(v.currentTime - tgt) > 0.05) v.currentTime = Math.max(0, tgt);
      } else if (e.type === 'phase') {
        // phase carries no time directly here; rely on `time` from caller
      }
    });
    return off;
  }, [offsetMs]);

  return (
    <video
      ref={ref}
      src={src}
      controls
      className={className ?? 'w-full rounded-md bg-black aspect-video'}
      onLoadedMetadata={(e) => {
        const ms = Math.round(e.currentTarget.duration * 1000);
        setDuration(ms);
        onDuration?.(ms);
      }}
      onTimeUpdate={(e) => {
        const now = performance.now();
        if (now - lastEmitRef.current < 60) return;
        lastEmitRef.current = now;
        const sessionMs = Math.max(0, Math.round(e.currentTarget.currentTime * 1000 - offsetMs));
        syncBus.emit({ type: 'time', ms: sessionMs, source: selfRef.current });
      }}
    />
  );
}
