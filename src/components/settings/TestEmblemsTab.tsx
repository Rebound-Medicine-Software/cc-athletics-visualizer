import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Trash2, ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';

// Storage bucket + table created in supabase/migrations/20261123141700_create_test_emblems.sql
const BUCKET = 'test-emblems';

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

interface EmblemRow {
  test_name: string;
  storage_path: string | null;
  signedUrl?: string;
}

/**
 * Lets a practitioner upload a PNG emblem for each test name that has
 * actually shown up in this team's data (CC Athletics / VALD / manual CSV -
 * whatever test_name string the source system used). A test with no row in
 * test_emblems simply has no emblem yet; the force plate report leaves that
 * slot blank rather than falling back to a placeholder or default image.
 */
export function TestEmblemsTab() {
  const { teamId } = useEffectiveTeamId();
  const [rows, setRows] = useState<EmblemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const load = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const { data: testNames, error: namesErr } = await supabase
        .from('test_data')
        .select('test_name')
        .eq('team_id', teamId);
      if (namesErr) throw namesErr;
      const uniqueNames = Array.from(
        new Set((testNames ?? []).map((r: any) => r.test_name).filter(Boolean))
      ).sort();

      // test_emblems is not in the generated Supabase types yet (the
      // definitions are stale), so this call is cast through any.
      const { data: emblems, error: emblemsErr } = await (supabase as any)
        .from('test_emblems')
        .select('test_name, storage_path')
        .eq('team_id', teamId);
      if (emblemsErr) throw emblemsErr;
      const byName = new Map<string, string | null>(
        (emblems ?? []).map((e: any) => [e.test_name, e.storage_path ?? null] as [string, string | null])
      );

      const merged: EmblemRow[] = uniqueNames.map((name) => ({
        test_name: name,
        storage_path: byName.get(name) ?? null,
      }));

      await Promise.all(
        merged.map(async (row) => {
          if (row.storage_path) {
            const { data } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 3600);
            row.signedUrl = data?.signedUrl;
          }
        })
      );

      setRows(merged);
    } catch (e: any) {
      toast.error(`Failed to load test emblems: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const handleUpload = async (testName: string, file: File) => {
    if (!teamId) return;
    if (file.type !== 'image/png') {
      toast.error('Emblem must be a PNG file.');
      return;
    }
    setUploadingFor(testName);
    try {
      const path = `${teamId}/${sanitize(testName)}.png`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { error: upsertErr } = await (supabase as any)
        .from('test_emblems')
        .upsert({ team_id: teamId, test_name: testName, storage_path: path }, { onConflict: 'team_id,test_name' });
      if (upsertErr) throw upsertErr;

      toast.success(`Emblem saved for ${testName}.`);
      await load();
    } catch (e: any) {
      toast.error(`Upload failed: ${e?.message ?? e}`);
    } finally {
      setUploadingFor(null);
    }
  };

  const handleRemove = async (testName: string, storagePath: string) => {
    if (!teamId) return;
    if (!confirm(`Remove the emblem for ${testName}? The report will leave this blank until you upload a new one.`)) return;
    try {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      await (supabase as any).from('test_emblems').delete().eq('team_id', teamId).eq('test_name', testName);
      toast.success('Emblem removed.');
      await load();
    } catch (e: any) {
      toast.error(`Failed: ${e?.message ?? e}`);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading test names…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tests found for this team yet. Once test data starts coming in, each test name will show up
        here with a slot to upload its emblem.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Upload a PNG emblem for any test below. Reports leave the emblem blank for a test until you
        assign one here.
      </p>
      {rows.map((row) => (
        <Card key={row.test_name} className="p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {row.signedUrl ? (
                <img src={row.signedUrl} alt={row.test_name} className="h-full w-full object-contain" />
              ) : (
                <ImageOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span className="text-sm font-medium truncate">{row.test_name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              id={`emblem-upload-${row.test_name}`}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(row.test_name, f);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={uploadingFor === row.test_name}
              onClick={() => document.getElementById(`emblem-upload-${row.test_name}`)?.click()}
            >
              <Upload className="h-3 w-3 mr-1" />
              {uploadingFor === row.test_name ? 'Uploading…' : row.storage_path ? 'Replace' : 'Upload'}
            </Button>
            {row.storage_path && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-600"
                onClick={() => handleRemove(row.test_name, row.storage_path!)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
