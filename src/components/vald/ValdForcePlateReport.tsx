import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Eye, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/useBranding";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
import { useAuth } from "@/contexts/AuthContext";
import { valdTestsToReportData } from "@/lib/valdToCCAthletics";
import { ValdAthlete, ValdTest, ValdTestDetail } from "@/hooks/useVald";

interface Props {
  athlete?: ValdAthlete;
  tests: (ValdTest | ValdTestDetail)[];
}

/**
 * "Generate Force Plate Report" for VALD data — invokes the same
 * `generate-force-plate-report` edge function used by the CC Athletics
 * dashboard, with VALD tests mapped into the CC Athletics TestData shape.
 */
export const ValdForcePlateReport = ({ athlete, tests }: Props) => {
  const { profile } = useAuth();
  const { teamId: effectiveTeamId, isImpersonating } = useEffectiveTeamId();
  const { branding } = useBranding(effectiveTeamId, isImpersonating ? "organisation" : profile?.role);

  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");

  const disabled = !athlete || tests.length === 0 || isGenerating;

  const generate = async (mode: "preview" | "download") => {
    if (!athlete) return;
    setIsGenerating(true);
    try {
      const reportData = valdTestsToReportData(tests, athlete);

      const response = await supabase.functions.invoke("generate-force-plate-report", {
        body: {
          athlete_id: athlete.id || null,
          athlete_name: athlete.name,
          team_name: athlete.teams || "VALD",
          test_data: reportData,
          branding: branding
            ? {
                logo_url: branding.logo_url,
                primary_color: branding.primary_color,
                secondary_color: branding.secondary_color,
                accent_color: branding.accent_color,
                org_name: branding.name,
              }
            : null,
        },
      });

      if (response.error) throw response.error;

      const { report_url, filename } = response.data ?? {};
      if (!report_url) throw new Error("No report URL returned from the report generator.");

      const pdfResponse = await fetch(report_url);
      if (!pdfResponse.ok) throw new Error(`Failed to fetch PDF (${pdfResponse.status})`);
      const blob = await pdfResponse.blob();
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const name = filename || `${athlete.name} VALD Force Plate Report.pdf`;

      if (mode === "download") {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        toast.success("Force plate report downloaded");
      } else {
        if (previewUrl?.startsWith("blob:")) window.URL.revokeObjectURL(previewUrl);
        setPreviewFilename(name);
        setPreviewUrl(blobUrl);
        toast.success("Report ready to preview");
      }
    } catch (error: any) {
      console.error("VALD force plate report error:", error);
      toast.error(error?.message || "Failed to generate the force plate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const closePreview = () => {
    if (previewUrl?.startsWith("blob:")) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFilename("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Generate Force Plate Report
        </CardTitle>
        <CardDescription className="text-xs">
          Same report as the Analytics dashboard, built from VALD Hub data
          {athlete ? ` — ${tests.length} test${tests.length === 1 ? "" : "s"} for ${athlete.name}` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => generate("preview")}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Preview
          </Button>
          <Button size="sm" disabled={disabled} onClick={() => generate("download")}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Generate & Download
          </Button>
        </div>

        {!athlete && (
          <p className="text-sm text-muted-foreground">Select a VALD athlete to generate a report.</p>
        )}
        {athlete && tests.length === 0 && (
          <p className="text-sm text-muted-foreground">No VALD tests available for this athlete.</p>
        )}

        {previewUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="truncate text-xs text-muted-foreground">{previewFilename}</span>
              <Button variant="ghost" size="sm" onClick={closePreview}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <iframe title="Force plate report preview" src={previewUrl} className="h-[600px] w-full rounded-md border" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ValdForcePlateReport;
