import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
import { useEffectiveTier } from "@/lib/impersonation/useEffectiveTeam";
import { useViewAsWriteGuard } from "@/lib/impersonation/useViewAsWriteGuard";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useAthletes } from "@/hooks/useAthletes";
import { supabase } from "@/integrations/supabase/client";
import { Document, Page, pdfjs } from "react-pdf";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

import { SectionHeader } from "../SectionHeader";
import { EmptyState } from "../EmptyState";
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
  FileWarning,
} from "lucide-react";

import { useRecentReports, type ReportKind, type RecentReport } from "./useRecentReports";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/* ---------- helpers ---------- */

type DateRange = "all" | "30" | "90" | "365";

const RANGE_LABEL: Record<DateRange, string> = {
  all: "All time",
  "30": "Last 30 days",
  "90": "Last 90 days",
  "365": "Last 12 months",
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ---------- PDF preview ---------- */

const PdfPreview = ({ fileUrl }: { fileUrl: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);

  useEffect(() => {
    const update = () => {
      const w = containerRef.current?.clientWidth ?? 0;
      setPageWidth(Math.max(Math.min(w - 32, 1100), 280));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-muted/30 p-4">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setPageCount(numPages)}
        loading={
          <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading preview...
          </div>
        }
        error={
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <FileWarning className="h-8 w-8" />
            <p className="text-sm">Preview unavailable. Use “Download” instead.</p>
          </div>
        }
        className="flex flex-col items-center gap-4"
      >
        {Array.from({ length: pageCount }, (_, i) => (
          <Page
            key={i}
            pageNumber={i + 1}
            width={pageWidth || undefined}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            className="overflow-hidden rounded-lg border bg-background shadow-sm"
          />
        ))}
      </Document>
    </div>
  );
};

/* ---------- recent reports table ---------- */

const RecentReportsCard = ({
  reports,
  onPreview,
  onClear,
}: {
  reports: RecentReport[];
  onPreview: (r: RecentReport) => void;
  onClear: () => void;
}) => (
  <Card>
    <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
      <div>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Recent reports
        </CardTitle>
        <CardDescription className="text-xs">
          Reports generated from this device. Stored locally for your reference.
        </CardDescription>
      </div>
      {reports.length > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>
      )}
    </CardHeader>
    <CardContent className="pt-0">
      {reports.length === 0 ? (
        <EmptyState
          inline
          compact
          icon={FileText}
          title="No reports yet"
          description="Generated reports will appear here."
        />
      ) : (
        <ul className="divide-y">
          {reports.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  r.status === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {r.status === "success" ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{r.athlete_name}</span>
                  <Badge variant="outline" className="text-[10px] py-0 h-4">
                    {r.kind === "force-plate" ? "Force Plate" : "Athlete Summary"}
                  </Badge>
                  {r.test_count != null && (
                    <span className="text-[11px] text-muted-foreground">
                      {r.test_count} test{r.test_count === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {r.team_name ? `${r.team_name} · ` : ""}
                  {formatRelative(r.created_at)}
                  {r.status === "failed" && r.error ? ` · ${r.error}` : ""}
                </div>
              </div>
              {r.status === "success" && r.url && (
                <Button size="sm" variant="ghost" onClick={() => onPreview(r)} className="shrink-0">
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

/* ---------- main section ---------- */

export const ReportsSection = () => {
  const { teamBranding } = useAuth();
  const { teamId, isImpersonating, impersonatedTeamName } = useEffectiveTeamId();
  const guardWrite = useViewAsWriteGuard();
  const { hasPermission } = useEffectiveTier();
  const canExport = hasPermission("can_export_reports");

  const { data: testData = [], isLoading: testsLoading, refetch } = useSupabaseData();
  const { data: athletes = [], isLoading: athletesLoading } = useAthletes();

  const recent = useRecentReports(teamId);

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [reportKind, setReportKind] = useState<ReportKind>("force-plate");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const [busyKind, setBusyKind] = useState<null | "preview" | "download" | "email">(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  // Cleanup blob urls on unmount
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === selectedAthleteId) ?? null,
    [athletes, selectedAthleteId],
  );

  // Tests for the selected athlete (matched by name+team since test_data has no athlete_id link)
  const athleteTests = useMemo(() => {
    if (!selectedAthlete) return [];
    const cutoff =
      dateRange === "all"
        ? null
        : new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000);
    return (testData as any[]).filter((t) => {
      if (t.athlete_name !== selectedAthlete.name) return false;
      if (selectedAthlete.team && t.team_name !== selectedAthlete.team) return false;
      if (cutoff && t.test_date) {
        const d = new Date(t.test_date);
        if (!isNaN(d.getTime()) && d < cutoff) return false;
      }
      return true;
    });
  }, [testData, selectedAthlete, dateRange]);

  const uniqueTestNames = useMemo(
    () => Array.from(new Set(athleteTests.map((t: any) => t.test_name))).filter(Boolean),
    [athleteTests],
  );

  /* ----- KPIs ----- */
  const successCount = recent.items.filter((r) => r.status === "success").length;
  const failedCount = recent.items.filter((r) => r.status === "failed").length;

  /* ----- generation flows ----- */

  const fetchPdfBlobUrl = async (reportUrl: string) => {
    const res = await fetch(reportUrl);
    if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
    const blob = await res.blob();
    return URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  };

  const downloadBlob = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const generateForcePlate = async (mode: "preview" | "download" | "email") => {
    if (!selectedAthlete) return;
    if (mode !== "preview" && guardWrite("Generating reports")) return;
    if (mode !== "preview" && !canExport) {
      toast({
        title: "Upgrade required",
        description: "Your current tier doesn't include report export. Preview is still available.",
        variant: "destructive",
      });
      return;
    }
    if (athleteTests.length === 0) {
      toast({
        title: "No test data",
        description: "This athlete has no tests in the selected date range.",
        variant: "destructive",
      });
      return;
    }

    setBusyKind(mode);
    try {
      const res = await supabase.functions.invoke("generate-force-plate-report", {
        body: {
          athlete_id: selectedAthlete.id,
          athlete_name: selectedAthlete.name,
          team_name: selectedAthlete.team,
          test_data: athleteTests,
          branding: teamBranding
            ? {
                logo_url: teamBranding.logo_url,
                primary_color: teamBranding.primary_color,
                secondary_color: teamBranding.secondary_color,
                accent_color: teamBranding.accent_color,
                org_name: teamBranding.name,
              }
            : null,
        },
      });
      if (res.error) throw new Error(res.error.message || "Generation failed");
      const { report_url, filename, test_count } = (res.data ?? {}) as any;
      if (!report_url) throw new Error("No report URL returned");

      const blobUrl = await fetchPdfBlobUrl(report_url);
      const safeName = filename || `${selectedAthlete.name} Force Plate Report.pdf`;

      if (mode === "preview") {
        if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(blobUrl);
        setPreviewName(safeName);
      } else if (mode === "download") {
        downloadBlob(blobUrl, safeName);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
      } else if (mode === "email") {
        const emailRes = await supabase.functions.invoke("send-report-via-notifications-api", {
          body: { athlete_id: selectedAthlete.id, pdf_path: report_url },
        });
        if (emailRes.error) throw new Error("Email delivery failed");
        toast({ title: "Report sent", description: `Emailed to ${selectedAthlete.name}.` });
      }

      recent.add({
        kind: "force-plate",
        athlete_name: selectedAthlete.name,
        team_name: selectedAthlete.team,
        status: "success",
        url: mode === "preview" ? blobUrl : undefined,
        filename: safeName,
        test_count: test_count ?? athleteTests.length,
      });
    } catch (e: any) {
      const msg = e?.message ?? "Failed to generate report";
      toast({ title: "Report failed", description: msg, variant: "destructive" });
      recent.add({
        kind: "force-plate",
        athlete_name: selectedAthlete.name,
        team_name: selectedAthlete.team,
        status: "failed",
        error: msg,
      });
    } finally {
      setBusyKind(null);
    }
  };

  const generateAthleteSummary = async () => {
    if (!selectedAthlete) return;
    if (guardWrite("Generating reports")) return;
    if (!canExport) {
      toast({
        title: "Upgrade required",
        description: "Your current tier doesn't include report export.",
        variant: "destructive",
      });
      return;
    }

    setBusyKind("download");
    try {
      const res = await supabase.functions.invoke("generate-athlete-report", {
        body: { athlete_id: selectedAthlete.id },
      });
      if (res.error) throw new Error(res.error.message || "Generation failed");
      const { report_url, public_url, url } = (res.data ?? {}) as any;
      const finalUrl = report_url || public_url || url;
      if (finalUrl) {
        window.open(finalUrl, "_blank", "noopener");
      }
      toast({ title: "Athlete summary generated" });
      recent.add({
        kind: "athlete-summary",
        athlete_name: selectedAthlete.name,
        team_name: selectedAthlete.team,
        status: "success",
        url: finalUrl,
      });
    } catch (e: any) {
      const msg = e?.message ?? "Failed";
      toast({ title: "Report failed", description: msg, variant: "destructive" });
      recent.add({
        kind: "athlete-summary",
        athlete_name: selectedAthlete.name,
        team_name: selectedAthlete.team,
        status: "failed",
        error: msg,
      });
    } finally {
      setBusyKind(null);
    }
  };

  const handlePreviewExisting = async (r: RecentReport) => {
    if (!r.url) return;
    setPreviewUrl(r.url);
    setPreviewName(r.filename || `${r.athlete_name}.pdf`);
  };

  /* ----- top-level empty / loading states ----- */

  const dataReady = !athletesLoading && !testsLoading;

  if (athletesLoading || testsLoading) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Reports" description="Generate athlete reports and review recent activity." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-72 lg:col-span-2 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  const noAthletes = athletes.length === 0;
  const noTests = testData.length === 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Reports"
        description={
          isImpersonating
            ? `Viewing as ${impersonatedTeamName}. Report generation is disabled in View-As mode.`
            : "Generate athlete and force-plate reports, and review recent activity."
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh data
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Users className="h-3.5 w-3.5" /> Athletes available
            </div>
            <div className="text-2xl font-semibold mt-1">{athletes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Activity className="h-3.5 w-3.5" /> Tests in scope
            </div>
            <div className="text-2xl font-semibold mt-1">{testData.length.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <FileText className="h-3.5 w-3.5" /> Generated (local)
            </div>
            <div className="text-2xl font-semibold mt-1">{successCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <AlertTriangle className="h-3.5 w-3.5" /> Failures (local)
            </div>
            <div className="text-2xl font-semibold mt-1">{failedCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Generator */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Generate a report
            </CardTitle>
            <CardDescription className="text-xs">
              Reports are produced by the existing <code>generate-force-plate-report</code> and{" "}
              <code>generate-athlete-report</code> services and respect your organisation branding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {noAthletes ? (
              <EmptyState
                inline
                icon={Users}
                title="No athletes yet"
                description="Add athletes from Settings → Athlete Credentials, or sync via your CC Athletics integration."
                primaryAction={{ label: "Open Settings", href: "/settings?tab=athlete-credentials" }}
              />
            ) : noTests ? (
              <EmptyState
                inline
                icon={Activity}
                title="No test data yet"
                description="Once force-plate testing data is uploaded or synced, you can generate athlete reports."
                primaryAction={{ label: "Refresh", onClick: () => refetch() }}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Athlete</label>
                    <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an athlete..." />
                      </SelectTrigger>
                      <SelectContent>
                        {athletes.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            <span className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {a.name}
                              {a.team && (
                                <span className="text-xs text-muted-foreground">({a.team})</span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Date range</label>
                    <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(RANGE_LABEL) as DateRange[]).map((k) => (
                          <SelectItem key={k} value={k}>
                            {RANGE_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Report type</label>
                    <Select value={reportKind} onValueChange={(v) => setReportKind(v as ReportKind)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="force-plate">Force Plate Report (PDF)</SelectItem>
                        <SelectItem value="athlete-summary">Athlete Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedAthlete && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="font-medium">{selectedAthlete.name}</div>
                      <div className="text-xs text-muted-foreground">{selectedAthlete.team}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {athleteTests.length} test record{athleteTests.length === 1 ? "" : "s"} in {RANGE_LABEL[dateRange].toLowerCase()}
                      {uniqueTestNames.length > 0 && (
                        <> · {uniqueTestNames.length} unique test{uniqueTestNames.length === 1 ? "" : "s"}</>
                      )}
                    </div>
                  </div>
                )}

                {reportKind === "force-plate" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      onClick={() => generateForcePlate("preview")}
                      disabled={!selectedAthlete || busyKind !== null}
                    >
                      {busyKind === "preview" ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4 mr-1.5" />
                      )}
                      Preview
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => generateForcePlate("download")}
                      disabled={!selectedAthlete || busyKind !== null || isImpersonating || !canExport}
                      title={!canExport ? "Report export is not included in your tier" : undefined}
                    >
                      {busyKind === "download" ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1.5" />
                      )}
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => generateForcePlate("email")}
                      disabled={!selectedAthlete || busyKind !== null || isImpersonating || !canExport}
                      title={!canExport ? "Report export is not included in your tier" : undefined}
                    >
                      {busyKind === "email" ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-1.5" />
                      )}
                      Generate & Email
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Button
                      onClick={generateAthleteSummary}
                      disabled={!selectedAthlete || busyKind !== null || isImpersonating || !canExport}
                      title={!canExport ? "Report export is not included in your tier" : undefined}
                    >
                      {busyKind ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-1.5" />
                      )}
                      Generate Athlete Summary
                    </Button>
                  </div>
                )}
                {!canExport && (
                  <p className="text-[11px] text-muted-foreground">
                    Download and email require a tier with report export. Preview remains available.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent */}
        <RecentReportsCard
          reports={recent.items}
          onPreview={handlePreviewExisting}
          onClear={recent.clear}
        />
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="flex h-[90vh] max-w-5xl flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5" /> Report Preview
              </span>
              <span className="text-sm font-normal text-muted-foreground truncate">{previewName}</span>
            </DialogTitle>
            <DialogDescription>Review the generated PDF below.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/30">
            {previewUrl && <PdfPreview fileUrl={previewUrl} />}
          </div>
          <div className="flex flex-shrink-0 gap-3 pt-3">
            <Button
              className="flex-1"
              onClick={() => previewUrl && previewName && downloadBlob(previewUrl, previewName)}
              disabled={isImpersonating || !canExport}
              title={!canExport ? "Report export is not included in your tier" : undefined}
            >
              <Download className="h-4 w-4 mr-1.5" /> Save as PDF
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setPreviewUrl(null)}>
              <X className="h-4 w-4 mr-1.5" /> Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footnote about scope */}
      <p className="text-[11px] text-muted-foreground">
        Recent reports are stored locally in your browser per organisation. Platform-wide report
        analytics live in Super Admin → Reports & AI Engine.
      </p>
    </div>
  );
};
