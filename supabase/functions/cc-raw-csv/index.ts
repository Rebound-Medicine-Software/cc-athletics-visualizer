// Secure proxy: resolves CC Athletics signed download URL for a raw force-trace
// CSV and streams the CSV text back to the caller. The CC API key never leaves
// the server. Temporary download URL is not persisted.
//
// POST { path: string, downsample_factor?: number }
//  -> { success: true, csv: string, download_url: string, sample_count: number,
//       columns: string[] }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { success: false, error: 'method_not_allowed' });

  // Require an authenticated caller (JWT-verified)
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json(401, { success: false, error: 'unauthorized' });
  }
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claims, error: claimsErr } = await supa.auth.getClaims(
    authHeader.replace('Bearer ', ''),
  );
  if (claimsErr || !claims?.claims) return json(401, { success: false, error: 'unauthorized' });

  const apiKey = Deno.env.get('CC_ATHLETICS_API_KEY');
  if (!apiKey) return json(500, { success: false, error: 'CC_ATHLETICS_API_KEY not configured' });

  let body: { path?: string; downsample_factor?: number };
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: 'invalid_json' });
  }
  const path = String(body.path ?? '').trim();
  if (!path) return json(400, { success: false, error: 'missing_path' });

  const params = new URLSearchParams({ path });
  if (body.downsample_factor && Number.isFinite(body.downsample_factor)) {
    params.set('downsample_factor', String(body.downsample_factor));
  }

  try {
    const urlRes = await fetch(
      `https://europe-west1-forcemate-desktop.cloudfunctions.net/get_csv_download_url?${params.toString()}`,
      { headers: { 'X-API-Key': apiKey } },
    );
    if (!urlRes.ok) {
      const text = await urlRes.text().catch(() => '');
      return json(urlRes.status, {
        success: false,
        error: `get_csv_download_url failed: ${urlRes.status}`,
        detail: text.slice(0, 500),
      });
    }
    const { download_url } = await urlRes.json();
    if (!download_url) return json(502, { success: false, error: 'no_download_url' });

    const csvRes = await fetch(download_url);
    if (!csvRes.ok) {
      return json(502, { success: false, error: `csv_download_failed: ${csvRes.status}` });
    }
    const csv = await csvRes.text();

    // Lightweight header peek (don't full-parse server-side; client uses PapaParse)
    const firstLine = csv.split(/\r?\n/, 1)[0] ?? '';
    const columns = firstLine.split(/[,;\t]/).map((c) => c.trim());
    const sample_count = Math.max(0, csv.split('\n').length - 1);

    return json(200, { success: true, download_url, csv, columns, sample_count });
  } catch (e) {
    return json(500, { success: false, error: (e as Error).message });
  }
});
