/**
 * ValdAthleteMetadataSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Displayed inside AthleteCredentialsTab when the user switches to the
 * "VALD Athletes" sub-tab. Shows every athlete from the VALD bridge alongside
 * editable metadata (sex, weight, height, position, sport, team) that is
 * stored in the `vald_profile_metadata` Supabase table — because VALD's
 * external API doesn't expose these fields.
 *
 * The bridge joins this table in handleAthletes() so the values flow through
 * to the ValdReportHub / ValdAnalytics filters automatically.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Save, X, Search, RefreshCw, Activity } from "lucide-react";
import { toast } from "sonner";
import { ALL_CANONICAL_SPORTS } from "@/lib/sports/normalize";

// ── Types ────────────────────────────────────────────────────────────────────

interface ValdAthlete {
  id: string;
  name: string;
  givenName: string;
  familyName: string;
  dob: string;
  number: string;
  // from vald_profile_metadata (may be blank until user sets them)
  sex?: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  position?: string;
  sport?: string;
  team?: string;
  notes?: string;
}

interface EditForm {
  sex: string;
  weight_kg: string;
  height_cm: string;
  position: string;
  sport: string;
  team: string;
  notes: string;
}

const EMPTY_FORM: EditForm = {
  sex: "", weight_kg: "", height_cm: "", position: "", sport: "", team: "", notes: "",
};

const BRIDGE =
  "https://bvieqoevqkwdkphubabt.supabase.co/functions/v1/vald-bridge";

const SEX_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

// ── Component ────────────────────────────────────────────────────────────────

export const ValdAthleteMetadataSection = () => {
  const [athletes,   setAthletes]   = useState<ValdAthlete[]>([]);
  const [metadata,   setMetadata]   = useState<Record<string, Partial<ValdAthlete>>>({});
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [form,       setForm]       = useState<EditForm>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  // ── Fetch VALD athletes from bridge ────────────────────────────────────────
  const fetchAthletes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const res = await fetch(`${BRIDGE}?action=athletes`, {
        headers: { Authorization: `Bearer ${token}`, apikey: token },
      });
      if (!res.ok) throw new Error(`Bridge ${res.status}`);
      const d = await res.json();
      setAthletes(d.athletes ?? []);
    } catch (e) {
      console.error("VALD bridge error:", e);
      toast.error("Could not load VALD athletes — check bridge connection");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch metadata from Supabase ──────────────────────────────────────────
  const fetchMetadata = useCallback(async () => {
    const { data, error } = await supabase
      .from("vald_profile_metadata")
      .select("*");
    if (error) { console.error(error); return; }
    const map: Record<string, Partial<ValdAthlete>> = {};
    (data ?? []).forEach((row: any) => { map[row.profile_id] = row; });
    setMetadata(map);
  }, []);

  useEffect(() => {
    fetchAthletes();
    fetchMetadata();
  }, [fetchAthletes, fetchMetadata]);

  // ── Merge VALD athletes with metadata ─────────────────────────────────────
  const merged: ValdAthlete[] = athletes.map((a) => ({
    ...a,
    ...(metadata[a.id] ?? {}),
  }));

  const filtered = merged.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.team ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (a.sport ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = (a: ValdAthlete) => {
    setEditingId(a.id);
    setForm({
      sex:       a.sex       ?? "",
      weight_kg: a.weight_kg != null ? String(a.weight_kg) : "",
      height_cm: a.height_cm != null ? String(a.height_cm) : "",
      position:  a.position  ?? "",
      sport:     a.sport     ?? "",
      team:      a.team      ?? "",
      notes:     a.notes     ?? "",
    });
  };

  const handleCancel = () => { setEditingId(null); setForm(EMPTY_FORM); };

  const handleSave = async (profileId: string) => {
    setSaving(true);
    try {
      const row = {
        profile_id: profileId,
        sex:        form.sex       || null,
        weight_kg:  form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm:  form.height_cm ? parseFloat(form.height_cm) : null,
        position:   form.position  || null,
        sport:      form.sport     || null,
        team:       form.team      || null,
        notes:      form.notes     || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("vald_profile_metadata")
        .upsert(row, { onConflict: "profile_id" });

      if (error) throw error;

      // Update local metadata cache
      setMetadata((prev) => ({ ...prev, [profileId]: row }));
      toast.success("VALD athlete profile updated");
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to save: " + (e.message ?? "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading VALD athletes…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-sm text-teal-800">
        <strong className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4" /> VALD Hub Athlete Metadata
        </strong>
        VALD's external API does not expose sex, weight, height, position or sport. Set them
        here — they are stored in NEXUS HUB and used to power the Team, Sex and Sport filters
        in the VALD Hub analytics page.
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, team or sport…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={() => { fetchAthletes(); fetchMetadata(); }}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} / {athletes.length} athletes
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Name</TableHead>
              <TableHead>DOB</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Team / Group</TableHead>
              <TableHead>Sport</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Weight (kg)</TableHead>
              <TableHead>Height (cm)</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No athletes found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((a) => {
              const isEditing = editingId === a.id;
              return (
                <TableRow key={a.id} className={isEditing ? "bg-teal-50/50" : ""}>
                  {/* Name */}
                  <TableCell className="font-medium whitespace-nowrap">
                    {a.name}
                    {a.number && (
                      <span className="ml-1 text-xs text-muted-foreground font-mono">#{a.number}</span>
                    )}
                  </TableCell>

                  {/* DOB */}
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {a.dob ? a.dob.slice(0, 10) : "—"}
                  </TableCell>

                  {/* Sex */}
                  <TableCell>
                    {isEditing ? (
                      <Select value={form.sex || "__none__"} onValueChange={(v) => setForm({ ...form, sex: v === "__none__" ? "" : v })}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— not set —</SelectItem>
                          {SEX_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : a.sex ? (
                      <Badge variant="secondary">{a.sex}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Team */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={form.team}
                        onChange={(e) => setForm({ ...form, team: e.target.value })}
                        placeholder="Team / group name"
                        className="h-8 text-xs w-36"
                      />
                    ) : a.team ? (
                      <span className="text-sm">{a.team}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Sport */}
                  <TableCell>
                    {isEditing ? (
                      <Select value={form.sport || "__none__"} onValueChange={(v) => setForm({ ...form, sport: v === "__none__" ? "" : v })}>
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue placeholder="Select sport…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="__none__">— not set —</SelectItem>
                          {ALL_CANONICAL_SPORTS.sort().map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : a.sport ? (
                      <Badge variant="outline">{a.sport}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Position */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={form.position}
                        onChange={(e) => setForm({ ...form, position: e.target.value })}
                        placeholder="e.g. Forward"
                        className="h-8 text-xs w-28"
                      />
                    ) : (
                      <span className="text-sm">{a.position || <span className="text-xs text-muted-foreground">—</span>}</span>
                    )}
                  </TableCell>

                  {/* Weight */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={form.weight_kg}
                        onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                        placeholder="kg"
                        className="h-8 text-xs w-20"
                        min={0} max={250} step={0.1}
                      />
                    ) : (
                      <span className="text-sm font-mono">
                        {a.weight_kg != null ? `${a.weight_kg} kg` : <span className="text-xs text-muted-foreground">—</span>}
                      </span>
                    )}
                  </TableCell>

                  {/* Height */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={form.height_cm}
                        onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                        placeholder="cm"
                        className="h-8 text-xs w-20"
                        min={0} max={250} step={0.5}
                      />
                    ) : (
                      <span className="text-sm font-mono">
                        {a.height_cm != null ? `${a.height_cm} cm` : <span className="text-xs text-muted-foreground">—</span>}
                      </span>
                    )}
                  </TableCell>

                  {/* Notes */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Optional notes"
                        className="h-8 text-xs w-36"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">{a.notes || "—"}</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm" className="h-7 px-2"
                          onClick={() => handleSave(a.id)}
                          disabled={saving}
                        >
                          {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleCancel}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 w-full" onClick={() => handleEdit(a)}>
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ValdAthleteMetadataSection;
