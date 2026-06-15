import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, Crosshair, Save, Trash2, Video as VideoIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VideoPlayerSync } from './VideoPlayerSync';
import { saveGolfMetrics } from '@/lib/movement-engine/modules/golf/persist';
import type { MovementEvent } from '@/lib/movement-engine/core/types';

const BUCKET = 'movement-videos';

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

interface Props {
  testDataId?: string;
  teamId?: string | null;
  athleteId?: string | null;
  events: MovementEvent[];
  initialVideo?: {
    storage_path: string;
    offset_ms: number;
    duration_ms: number;
    synchronised_at: string;
  };
}

export function VideoSyncTab({ testDataId, teamId, athleteId, events, initialVideo }: Props) {
  const [video, setVideo] = useState(initialVideo);
  const [signedUrl, setSignedUrl] = useState<string | undefined>();
  const [offsetMs, setOffsetMs] = useState<number>(initialVideo?.offset_ms ?? 0);
  const [duration, setDuration] = useState<number>(initialVideo?.duration_ms ?? 0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!video?.storage_path) { setSignedUrl(undefined); return; }
    let cancelled = false;
    supabase.storage.from(BUCKET).createSignedUrl(video.storage_path, 3600)
      .then(({ data }) => { if (!cancelled) setSignedUrl(data?.signedUrl); });
    return () => { cancelled = true; };
  }, [video?.storage_path]);

  const handleUpload = async (file: File) => {
    if (!teamId || !athleteId) {
      toast.error('Select an athlete (Database mode) before uploading video.');
      return;
    }
    setUploading(true);
    try {
      const path = `${teamId}/${athleteId}/${Date.now()}_${sanitize(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      setVideo({ storage_path: path, offset_ms: 0, duration_ms: 0, synchronised_at: new Date().toISOString() });
      setOffsetMs(0);
      setSignedUrl(signed?.signedUrl);
      toast.success('Video uploaded.');
    } catch (e: any) {
      toast.error(`Upload failed: ${e?.message ?? e}`);
    } finally { setUploading(false); }
  };

  const saveOffset = async () => {
    if (!testDataId || !video) return;
    setSaving(true);
    try {
      await saveGolfMetrics(testDataId, {
        video: {
          storage_path: video.storage_path,
          offset_ms: offsetMs,
          duration_ms: duration || video.duration_ms,
          synchronised_at: new Date().toISOString(),
        },
      });
      setVideo({ ...video, offset_ms: offsetMs, duration_ms: duration || video.duration_ms, synchronised_at: new Date().toISOString() });
      toast.success('Video sync saved.');
    } catch (e: any) {
      toast.error(`Save failed: ${e?.message ?? e}`);
    } finally { setSaving(false); }
  };

  const removeVideo = async () => {
    if (!testDataId || !video) return;
    if (!confirm('Detach the video from this session?')) return;
    try {
      await saveGolfMetrics(testDataId, { video: undefined as any });
      setVideo(undefined);
      setSignedUrl(undefined);
      toast.success('Video detached.');
    } catch (e: any) { toast.error(`Failed: ${e?.message ?? e}`); }
  };

  if (!signedUrl) {
    return (
      <Card className="p-8 bg-slate-950 border-slate-800 text-slate-100 text-center space-y-3">
        <VideoIcon className="mx-auto h-8 w-8 text-amber-400/60" />
        <h3 className="text-sm uppercase tracking-widest text-slate-300">Video Sync</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Upload a swing video to align with the force trace. Saved offset persists with the session.
          {!testDataId && ' Open a saved session (Database mode) to enable upload.'}
        </p>
        <div>
          <input id="golf-video-upload" type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          <Button size="sm" disabled={uploading || !testDataId}
            onClick={() => document.getElementById('golf-video-upload')?.click()}>
            <Upload className="h-3 w-3 mr-1" /> {uploading ? 'Uploading…' : 'Upload Video'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-slate-950 border-slate-800 text-slate-100 space-y-3">
        <VideoPlayerSync src={signedUrl} offsetMs={offsetMs} onDuration={setDuration} />

        <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
              <Crosshair className="h-3 w-3" /> Impact Offset (ms)
            </label>
            <Input type="number" value={offsetMs} onChange={(e) => setOffsetMs(Number(e.target.value))}
              className="h-8 bg-slate-900 border-slate-700 text-sm" />
            <p className="text-[10px] text-slate-500 mt-1">
              Positive = video starts before swing start. Sync so video impact aligns with phase marker.
            </p>
          </div>
          <Button size="sm" variant="secondary" disabled={saving} onClick={saveOffset}>
            <Save className="h-3 w-3 mr-1" /> Save Sync
          </Button>
          <Button size="sm" variant="outline" className="border-slate-700"
            onClick={() => document.getElementById('golf-video-upload-replace')?.click()}>
            <Upload className="h-3 w-3 mr-1" /> Replace
          </Button>
          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={removeVideo}>
            <Trash2 className="h-3 w-3" />
          </Button>
          <input id="golf-video-upload-replace" type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
        </div>

        <div className="text-[10px] text-slate-500 flex flex-wrap gap-3 pt-1 border-t border-slate-800">
          <span>{events.length} swing{events.length === 1 ? '' : 's'} detected</span>
          {video && <span>duration {Math.round((duration || video.duration_ms) / 1000)}s</span>}
          {video?.synchronised_at && <span>synced {new Date(video.synchronised_at).toLocaleString()}</span>}
        </div>
      </Card>

      <Card className="p-3 bg-slate-950 border-slate-800 text-slate-100">
        <p className="text-[11px] text-slate-400">
          Scrub the video to drive the force-trace cursor, or click a swing/phase to seek the video.
          Both are wired through the movement-engine sync bus.
        </p>
      </Card>
    </div>
  );
}
