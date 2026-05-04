import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Link2, Unlink, RefreshCw, AlertTriangle, CheckCircle2, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveTeamId, useIsViewAsMode } from "@/lib/impersonation/useEffectiveTeamId";

type MatchRow = {
  athlete_id: string;
  athlete_name: string;
  athlete_email: string | null;
  athlete_last_test_at: string | null;
  match_user_id: string | null;
  match_profile_id: string | null;
  match_email: string | null;
  match_full_name: string | null;
  match_role: string | null;
  match_setup_completed: boolean | null;
  match_count: number;
};

type LinkedAthlete = {
  id: string;
  name: string;
  email: string | null;
  user_id: string;
  profile_email?: string | null;
  profile_name?: string | null;
};

const confidenceFor = (row: MatchRow): { label: string; tone: "high" | "medium" | "none" } => {
  if (!row.match_user_id) return { label: "No match", tone: "none" };
  if (row.match_count === 1 && row.athlete_email && row.match_email &&
      row.athlete_email.toLowerCase() === row.match_email.toLowerCase()) {
    return { label: "High", tone: "high" };
  }
  if (row.match_count > 1) return { label: "Ambiguous", tone: "medium" };
  return { label: "Medium", tone: "medium" };
};

export const AthleteAccountLinkingTab = () => {
  const { teamId } = useEffectiveTeamId();
  const isViewAs = useIsViewAsMode();
  const [unlinked, setUnlinked] = useState<MatchRow[] | null>(null);
  const [linked, setLinked] = useState<LinkedAthlete[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedAthlete | null>(null);
  const [unlinkReason, setUnlinkReason] = useState("");

  const load = async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "list_unlinked_athletes_with_profile_matches",
        { team_uuid: teamId },
      );
      if (rpcErr) throw rpcErr;
      setUnlinked((rpcData ?? []) as MatchRow[]);

      const { data: linkedData, error: linkedErr } = await supabase
        .from("athletes")
        .select("id, name, email, user_id")
        .eq("team_id", teamId)
        .not("user_id", "is", null);
      if (linkedErr) throw linkedErr;

      const userIds = (linkedData ?? []).map((a) => a.user_id).filter(Boolean) as string[];
      let profileMap = new Map<string, { email: string | null; full_name: string | null }>();
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", userIds);
        (profs ?? []).forEach((p: any) => profileMap.set(p.user_id, { email: p.email, full_name: p.full_name }));
      }
      setLinked((linkedData ?? []).map((a: any) => ({
        id: a.id, name: a.name, email: a.email, user_id: a.user_id,
        profile_email: profileMap.get(a.user_id)?.email ?? null,
        profile_name: profileMap.get(a.user_id)?.full_name ?? null,
      })));
    } catch (e: any) {
      console.error("AthleteAccountLinkingTab load error", e);
      setError(e?.message || "Failed to load athlete linking data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [teamId]);

  const filteredUnlinked = useMemo(() => {
    if (!unlinked) return [];
    const q = search.trim().toLowerCase();
    if (!q) return unlinked;
    return unlinked.filter((r) =>
      r.athlete_name?.toLowerCase().includes(q) ||
      r.athlete_email?.toLowerCase().includes(q) ||
      r.match_email?.toLowerCase().includes(q),
    );
  }, [unlinked, search]);

  const handleLink = async (row: MatchRow) => {
    if (isViewAs) { toast.error("View-As mode is read-only"); return; }
    if (!row.match_user_id) return;
    if (row.match_count > 1) {
      const ok = window.confirm("Multiple profile matches exist for this athlete. Link to the highlighted profile anyway?");
      if (!ok) return;
    }
    setBusy(row.athlete_id);
    try {
      const { error } = await supabase.rpc("link_athlete_to_user", {
        athlete_uuid: row.athlete_id,
        user_uuid: row.match_user_id,
      });
      if (error) throw error;
      toast.success(`Linked ${row.athlete_name}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Link failed");
    } finally {
      setBusy(null);
    }
  };

  const handleUnlinkConfirm = async () => {
    if (!unlinkTarget) return;
    if (isViewAs) { toast.error("View-As mode is read-only"); return; }
    if (!unlinkReason.trim()) { toast.error("Reason is required"); return; }
    setBusy(unlinkTarget.id);
    try {
      const { error } = await supabase.rpc("unlink_athlete_user", {
        athlete_uuid: unlinkTarget.id,
        reason: unlinkReason.trim(),
      });
      if (error) throw error;
      toast.success(`Unlinked ${unlinkTarget.name}`);
      setUnlinkTarget(null);
      setUnlinkReason("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Unlink failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" /> Athlete Account Linking
            </CardTitle>
            <CardDescription>
              Connect athlete records to authenticated client accounts so they can see their assigned programmes.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isViewAs && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4" /> View-As mode is read-only — linking actions are disabled.
            </div>
          )}
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search athletes or emails…"
              className="pl-9"
            />
          </div>

          <h3 className="text-sm font-semibold mb-2">Unlinked athletes</h3>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : filteredUnlinked.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              All athletes in this team are linked or have no pending matches.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Suggested profile</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Setup</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnlinked.map((row) => {
                    const conf = confidenceFor(row);
                    return (
                      <TableRow key={row.athlete_id}>
                        <TableCell>
                          <div className="font-medium">{row.athlete_name}</div>
                          <div className="text-xs text-muted-foreground">{row.athlete_email || "no email"}</div>
                        </TableCell>
                        <TableCell>
                          {row.match_user_id ? (
                            <>
                              <div className="text-sm">{row.match_full_name || row.match_email}</div>
                              <div className="text-xs text-muted-foreground">
                                {row.match_email} · {row.match_role || "user"}
                                {row.match_count > 1 && (
                                  <span className="ml-2 text-amber-600">+{row.match_count - 1} more</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">No matching profile</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              conf.tone === "high" ? "border-emerald-500 text-emerald-700" :
                              conf.tone === "medium" ? "border-amber-500 text-amber-700" :
                              "border-muted text-muted-foreground"
                            }
                          >
                            {conf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.match_user_id ? (
                            row.match_setup_completed
                              ? <Badge variant="secondary">Setup done</Badge>
                              : <Badge variant="outline">Pending</Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={!row.match_user_id || isViewAs || busy === row.athlete_id}
                            onClick={() => handleLink(row)}
                          >
                            {busy === row.athlete_id ? "Linking…" : "Link"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" /> Linked athletes
          </CardTitle>
          <CardDescription>Athletes already connected to a client account.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : !linked || linked.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
              No linked athletes yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Linked profile</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linked.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.email || "no email"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{a.profile_name || a.profile_email || a.user_id}</div>
                        <div className="text-xs text-muted-foreground">{a.profile_email}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isViewAs || busy === a.id}
                          onClick={() => { setUnlinkTarget(a); setUnlinkReason(""); }}
                        >
                          <Unlink className="w-4 h-4 mr-1" /> Unlink
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!unlinkTarget} onOpenChange={(o) => !o && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink {unlinkTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The athlete will no longer be able to view their programmes via their client login until re-linked.
              A reason is required for the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={unlinkReason}
            onChange={(e) => setUnlinkReason(e.target.value)}
            placeholder="Reason for unlinking…"
            className="my-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlinkConfirm} disabled={!unlinkReason.trim() || !!busy}>
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
