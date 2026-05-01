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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  onRefresh,
}: {
  reports: RecentReport[];
  onPreview: (r: RecentReport) => void;
  onRefresh: () => void;
}) => (
  <Card>
    <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
      <div>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Recent reports
        </CardTitle>
        <CardDescription className="text-xs">
          Recent report activity for your organisation, scoped by tenant.
        </CardDescription>
      </div>
      <Button variant="ghost" size="sm" onClick={onRefresh} className="text-muted-foreground">
        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
      </Button>
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
  const { teamBranding, user } = useAuth();
  const { teamId, isImpersonating, impersonatedTeamName } = useEffectiveTeamId();
  const guardWrite = useViewAsWriteGuard();
  const { hasPermission } = useEffectiveTier();
  const canExport = hasPermission("can_export_reports");
  const canUseAiCoach = hasPermission("can_use_ai_coach");
  const canIncludeAiInPdf = canExport && canUseAiCoach;

  const { data: testData = [], isLoading: testsLoading, refetch } = useSupabaseData();
  const { data: athletes = [], isLoading: athletesLoading } = useAthletes();

  const recent = useRecentReports(teamId);

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [reportKind, setReportKind] = useState<ReportKind>("force-plate");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const [busyKind, setBusyKind] = useState<null | "preview" | "download" | "email">(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  // AI Coach insight state
  const [aiTestName, setAiTestName] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<{
    explanation: string;
    recommendations: string[];
    keyCues: string[];
  } | null>(null);
  const [aiInsightMeta, setAiInsightMeta] = useState<{
    cached: boolean;
    createdAt: string | null;
    testName: string | null;
    testDate: string | null;
  } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<Array<{
    id: string;
    test_name: string;
    test_date: string | null;
    created_at: string;
    insight: any;
    athlete_id: string | null;
  }> | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Whether to embed an AI Coach Insight section into the generated PDF
  const [includeAiInReport, setIncludeAiInReport] = useState(false);

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

  /** Build & call the AI Coach insight edge function for the current selection.
   *  Returns the insight payload (with testName) or null if no eligible test data.
   *  Throws on edge-function error so callers can decide how to handle. */
  const buildAiInsightForReport = async (): Promise<{
    testName: string;
    explanation: string;
    recommendations: string[];
    keyCues: string[];
  } | null> => {
    if (!selectedAthlete) return null;
    const targetTestName = aiTestName || uniqueTestNames[0];
    if (!targetTestName) return null;

    const records = (athleteTests as any[])
      .filter((t) => t.test_name === targetTestName)
      .sort((a, b) => (a.test_date < b.test_date ? 1 : -1));
    const latest = records[0];
    if (!latest) return null;

    const m = latest.metrics ?? {};
    const numericKey =
      ["peak_power", "rsi", "jump_height_ft", "force_peak", "avg_power"].find(
        (k) => typeof m[k] === "number",
      ) ?? Object.keys(m).find((k) => typeof m[k] === "number");
    const currentValue = numericKey ? Number(m[numericKey]) : undefined;
    const previousValues = records
      .slice(1, 6)
      .map((r: any) => (numericKey ? r.metrics?.[numericKey] : undefined))
      .filter((v: any) => typeof v === "number");

    const res = await supabase.functions.invoke("generate-ai-coach-insight", {
      body: {
        team_id: teamId,
        athlete_id: selectedAthlete.id,
        created_by: user?.id ?? null,
        testMetrics: {
          testName: targetTestName,
          testDate: latest.test_date,
          currentValue,
          previousValues,
          metricUnit: "",
          metricType: numericKey ?? undefined,
        },
      },
    });
    if (res.error) throw new Error(res.error.message || "AI insight failed");
    const insight = (res.data as any)?.insight;
    if (!insight || typeof insight.explanation !== "string") {
      throw new Error("Empty AI response");
    }
    return {
      testName: targetTestName,
      explanation: insight.explanation,
      recommendations: Array.isArray(insight.recommendations) ? insight.recommendations : [],
      keyCues: Array.isArray(insight.keyCues) ? insight.keyCues : [],
    };
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
      // Optionally generate or reuse an AI Coach insight to embed.
      // Falls back gracefully (continues without AI) on failure.
      let aiInsightForReport:
        | { testName: string; explanation: string; recommendations: string[]; keyCues: string[] }
        | null = null;
      if (includeAiInReport && canIncludeAiInPdf) {
        try {
          // Reuse the on-screen insight if it matches the chosen test focus
          const focusName = aiTestName || uniqueTestNames[0];
          if (aiInsight && focusName) {
            aiInsightForReport = {
              testName: focusName,
              explanation: aiInsight.explanation,
              recommendations: aiInsight.recommendations,
              keyCues: aiInsight.keyCues,
            };
          } else {
            aiInsightForReport = await buildAiInsightForReport();
          }
          if (aiInsightForReport) {
            // Mirror into on-screen panel for transparency
            setAiInsight({
              explanation: aiInsightForReport.explanation,
              recommendations: aiInsightForReport.recommendations,
              keyCues: aiInsightForReport.keyCues,
            });
          }
        } catch (aiErr: any) {
          toast({
            title: "AI Coach insight unavailable",
            description: `Continuing without AI section. ${aiErr?.message ?? ""}`.trim(),
            variant: "destructive",
          });
        }
      }

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
          ai_insight: aiInsightForReport,
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

  /* ----- AI Coach insight ----- */
  const generateAiInsight = async (opts?: { forceRefresh?: boolean }) => {
    const forceRefresh = !!opts?.forceRefresh;
    if (!selectedAthlete) return;
    if (guardWrite(forceRefresh ? "Refreshing AI insight" : "Generating AI insight")) return;
    if (!canUseAiCoach) {
      toast({
        title: "Upgrade required",
        description:
          "AI Coach is not included in your current tier. Contact your administrator to enable it.",
        variant: "destructive",
      });
      return;
    }
    const targetTestName = aiTestName || uniqueTestNames[0];
    if (!targetTestName) {
      toast({
        title: "No test data",
        description: "Select an athlete with at least one test in range.",
        variant: "destructive",
      });
      return;
    }

    const records = (athleteTests as any[])
      .filter((t) => t.test_name === targetTestName)
      .sort((a, b) => (a.test_date < b.test_date ? 1 : -1));
    const latest = records[0];
    if (!latest) {
      toast({ title: "No records found", variant: "destructive" });
      return;
    }

    const m = latest.metrics ?? {};
    const numericKey =
      ["peak_power", "rsi", "jump_height_ft", "force_peak", "avg_power"].find(
        (k) => typeof m[k] === "number",
      ) ?? Object.keys(m).find((k) => typeof m[k] === "number");
    const currentValue = numericKey ? Number(m[numericKey]) : undefined;

    const previousValues = records
      .slice(1, 6)
      .map((r: any) => (numericKey ? r.metrics?.[numericKey] : undefined))
      .filter((v: any) => typeof v === "number");

    setAiBusy(true);
    setAiError(null);
    setAiInsight(null);
    setAiInsightMeta(null);
    try {
      const res = await supabase.functions.invoke("generate-ai-coach-insight", {
        body: {
          team_id: teamId,
          athlete_id: selectedAthlete.id,
          created_by: user?.id ?? null,
          force_refresh: forceRefresh,
          testMetrics: {
            testName: targetTestName,
            testDate: latest.test_date,
            currentValue,
            previousValues,
            metricUnit: "",
            metricType: numericKey ?? undefined,
          },
        },
      });
      if (res.error) throw new Error(res.error.message || "AI insight failed");
      const insight = (res.data as any)?.insight;
      const cached = !!(res.data as any)?.cached;
      if (!insight) throw new Error("Empty AI response");
      setAiInsight(insight);
      setAiInsightMeta({
        cached,
        createdAt: cached ? null : new Date().toISOString(),
        testName: targetTestName,
        testDate: latest.test_date ?? null,
      });
      recent.add({
        kind: "athlete-summary",
        athlete_name: selectedAthlete.name,
        team_name: selectedAthlete.team,
        status: "success",
      });
    } catch (e: any) {
      const msg = e?.message ?? "Failed to generate insight";
      setAiError(msg);
      toast({ title: "AI Coach failed", description: msg, variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const loadCachedHistory = async () => {
    if (!teamId) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      let q = supabase
        .from("ai_coach_insights")
        .select("id, test_name, test_date, created_at, insight, athlete_id")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (selectedAthlete?.id) q = q.eq("athlete_id", selectedAthlete.id);
      const { data, error } = await q;
      if (error) throw error;
      setHistoryItems((data as any[]) ?? []);
    } catch (e: any) {
      toast({ title: "Failed to load history", description: e?.message ?? "", variant: "destructive" });
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const reuseCachedInsight = (item: {
    id: string;
    test_name: string;
    test_date: string | null;
    created_at: string;
    insight: any;
  }) => {
    const ins = item.insight ?? {};
    setAiInsight({
      explanation: typeof ins.explanation === "string" ? ins.explanation : "",
      recommendations: Array.isArray(ins.recommendations) ? ins.recommendations : [],
      keyCues: Array.isArray(ins.keyCues) ? ins.keyCues : [],
    });
    setAiInsightMeta({
      cached: true,
      createdAt: item.created_at,
      testName: item.test_name,
      testDate: item.test_date,
    });
    setAiTestName(item.test_name);
    setAiError(null);
    setHistoryOpen(false);
  };

  const copyInsight = async () => {
    if (!aiInsight) return;
    const text = [
      `AI Coach Insight — ${selectedAthlete?.name ?? ""} · ${aiTestName || uniqueTestNames[0] || ""}`,
      "",
      aiInsight.explanation,
      "",
      "Recommendations:",
      ...aiInsight.recommendations.map((r) => `• ${r}`),
      "",
      "Key cues:",
      ...aiInsight.keyCues.map((r) => `• ${r}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
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

                {reportKind === "force-plate" && selectedAthlete && (
                  <label
                    className={`flex items-start gap-2 rounded-md border p-2.5 text-xs ${
                      !canIncludeAiInPdf ? "opacity-60" : ""
                    }`}
                  >
                    <Checkbox
                      checked={includeAiInReport && canIncludeAiInPdf}
                      onCheckedChange={(v) => setIncludeAiInReport(v === true)}
                      disabled={!canIncludeAiInPdf || isImpersonating || uniqueTestNames.length === 0}
                      className="mt-0.5"
                    />
                    <span className="space-y-0.5">
                      <span className="font-medium flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        Include AI Coach Insight in PDF
                      </span>
                      <span className="block text-muted-foreground">
                        {uniqueTestNames.length === 0
                          ? "No tests in range to analyse."
                          : !canUseAiCoach
                            ? "Requires a tier with AI Coach access."
                            : !canExport
                              ? "Requires a tier with report export."
                              : isImpersonating
                                ? "Disabled in View-As mode."
                                : `Generates an insight for "${aiTestName || uniqueTestNames[0]}" and appends it as a final page. If AI fails, the report is still produced.`}
                      </span>
                    </span>
                  </label>
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
          onRefresh={recent.refresh}
        />
      </div>

      {/* AI Coach Insight */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> AI Coach Insight
          </CardTitle>
          <CardDescription className="text-xs">
            Generate a quick coaching summary for the selected athlete's most recent test in the
            chosen range. Preview here, copy to share, then export from the report flow above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selectedAthlete ? (
            <EmptyState
              inline
              compact
              icon={User}
              title="Select an athlete"
              description="Pick an athlete in the generator above to enable AI Coach insights."
            />
          ) : uniqueTestNames.length === 0 ? (
            <EmptyState
              inline
              compact
              icon={Activity}
              title="No tests in range"
              description="Adjust the date range to include test data for this athlete."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Test focus</label>
                  <Select
                    value={aiTestName || uniqueTestNames[0]}
                    onValueChange={setAiTestName}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueTestNames.map((n: any) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => generateAiInsight()}
                    disabled={aiBusy || isImpersonating || !canUseAiCoach}
                    title={!canUseAiCoach ? "AI Coach is not included in your tier" : undefined}
                  >
                    {aiBusy ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1.5" />
                    )}
                    Generate insight
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!confirm("Refreshing will bypass the cache and may consume AI credits. Continue?")) return;
                      generateAiInsight({ forceRefresh: true });
                    }}
                    disabled={aiBusy || isImpersonating || !canUseAiCoach}
                    title={
                      isImpersonating
                        ? "Refresh is disabled in View-As mode"
                        : !canUseAiCoach
                          ? "AI Coach is not included in your tier"
                          : "Bypass cache and regenerate (uses AI credits)"
                    }
                  >
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    Refresh
                  </Button>
                  <Button variant="ghost" onClick={loadCachedHistory} disabled={!teamId}>
                    <History className="h-4 w-4 mr-1.5" />
                    History
                  </Button>
                </div>

              </div>

              {!canUseAiCoach && (
                <p className="text-[11px] text-muted-foreground">
                  AI Coach insights require a tier with <code>can_use_ai_coach</code>. Embedding AI
                  in PDFs additionally requires <code>can_export_reports</code>.
                </p>
              )}

              {aiBusy && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              )}

              {aiError && !aiBusy && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {aiInsight && !aiBusy && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2 flex-wrap">
                        <Sparkles className="h-4 w-4 text-amber-600" />
                        Insight for {selectedAthlete.name}
                        {aiInsightMeta?.cached ? (
                          <Badge variant="secondary" className="font-normal">Cached insight</Badge>
                        ) : aiInsightMeta ? (
                          <Badge className="font-normal">Generated just now</Badge>
                        ) : null}
                      </div>
                      {aiInsightMeta && (
                        <div className="text-[11px] text-muted-foreground">
                          {aiInsightMeta.testName}
                          {aiInsightMeta.testDate ? ` · test ${aiInsightMeta.testDate}` : ""}
                          {aiInsightMeta.createdAt
                            ? ` · ${formatRelative(aiInsightMeta.createdAt)}`
                            : aiInsightMeta.cached
                              ? " · reused from cache"
                              : ""}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={copyInsight}>
                      Copy
                    </Button>
                  </div>
                  <p className="text-foreground/90 leading-relaxed">{aiInsight.explanation}</p>
                  {aiInsight.recommendations?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Recommendations
                      </div>
                      <ul className="list-disc pl-5 space-y-1">
                        {aiInsight.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiInsight.keyCues?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Key cues
                      </div>
                      <ul className="list-disc pl-5 space-y-1">
                        {aiInsight.keyCues.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}


              {!aiInsight && !aiBusy && !aiError && (
                <EmptyState
                  inline
                  compact
                  icon={Sparkles}
                  title="No insight yet"
                  description="Click Generate insight to produce a coaching summary."
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

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
        Recent reports reflect server-side activity for your organisation. Platform-wide report
        analytics live in Super Admin → Reports & AI Engine.
      </p>
    </div>
  );
};
