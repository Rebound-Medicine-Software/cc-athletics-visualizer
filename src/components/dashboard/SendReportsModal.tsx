import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Download,
  Eye,
  FileText,
  FileWarning,
  Loader2,
  Mail,
  User,
  X,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfPreviewContent = ({ fileUrl }: { fileUrl: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      const nextWidth = containerRef.current?.clientWidth ?? 0;
      setPageWidth(Math.max(Math.min(nextWidth - 32, 1100), 280));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-muted/30 p-4 sm:p-6">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setPageCount(numPages)}
        loading={
          <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading PDF preview...
          </div>
        }
        error={
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <FileWarning className="h-8 w-8" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Preview unavailable</p>
              <p className="text-sm">
                The report was generated, but the in-app preview could not be rendered.
                Use “Save as PDF” instead.
              </p>
            </div>
          </div>
        }
        className="flex flex-col items-center gap-4"
      >
        {pageCount > 0 && (
          <div className="sticky top-0 z-10 flex justify-center pb-2">
            <div className="rounded-full border bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
              {pageCount} page{pageCount === 1 ? "" : "s"}
            </div>
          </div>
        )}

        {Array.from({ length: pageCount }, (_, index) => (
          <Page
            key={`pdf-page-${index + 1}`}
            pageNumber={index + 1}
            width={pageWidth || undefined}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading={
              <div className="flex h-[420px] items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-sm">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Rendering page {index + 1}...
              </div>
            }
            className="overflow-hidden rounded-lg border bg-background shadow-sm"
          />
        ))}
      </Document>
    </div>
  );
};

export const SendReportsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [excludedTests, setExcludedTests] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("");

  const { data: testData = [], isLoading: dataLoading } = useSupabaseData();

  const [athleteIdByKey, setAthleteIdByKey] = useState<Record<string, string>>({});
  const [mappingLoading, setMappingLoading] = useState(false);

  useEffect(() => {
    const fetchAthleteIds = async () => {
      try {
        setMappingLoading(true);
        const { data, error } = await supabase
          .from("athletes_new")
          .select("id,name,team");

        if (error) {
          console.error("Error fetching athletes_new:", error);
          return;
        }

        const byKey: Record<string, string> = {};
        (data || []).forEach((athlete: any) => {
          if (athlete?.name && athlete?.team && athlete?.id) {
            const key = `${athlete.name}|||${athlete.team}`;
            byKey[key] = athlete.id;
          }
        });

        setAthleteIdByKey(byKey);
      } catch (error) {
        console.error("Unexpected error fetching athletes_new:", error);
      } finally {
        setMappingLoading(false);
      }
    };

    fetchAthleteIds();
  }, []);

  const athletes = useMemo(() => {
    return Array.from(
      new Map(
        testData.map((record) => [
          `${record.athlete_name}|||${record.team_name}`,
          {
            id: `${record.athlete_name}|||${record.team_name}`,
            name: record.athlete_name,
            team: record.team_name,
          },
        ]),
      ).values(),
    );
  }, [testData]);

  const teamOptions = useMemo(() => {
    return Array.from(new Set(athletes.map((athlete) => athlete.team)))
      .filter(Boolean)
      .sort()
      .map((team) => ({ value: team, label: team }));
  }, [athletes]);

  const filteredAthletes = useMemo(() => {
    if (selectedTeams.length === 0) return athletes;
    return athletes.filter((athlete) => selectedTeams.includes(athlete.team));
  }, [athletes, selectedTeams]);

  const selectedAthleteData = useMemo(() => {
    if (!selectedAthlete) return null;

    const [name, team] = selectedAthlete.split("|||");
    const athleteTests = testData.filter(
      (test) => test.athlete_name === name && test.team_name === team,
    );
    const allTestNames = Array.from(new Set(athleteTests.map((test) => test.test_name)));
    const includedTests = athleteTests.filter((test) => !excludedTests.includes(test.test_name));
    const includedTestNames = allTestNames.filter((testName) => !excludedTests.includes(testName));

    return {
      name,
      team,
      tests: includedTests,
      allTestNames,
      testNames: includedTestNames,
      testCount: includedTests.length,
    };
  }, [selectedAthlete, testData, excludedTests]);

  const createPdfBlobUrl = async (reportUrl: string) => {
    const pdfResponse = await fetch(reportUrl);

    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF (${pdfResponse.status})`);
    }

    const contentType = pdfResponse.headers.get("content-type") || "";
    if (contentType && !contentType.toLowerCase().includes("pdf")) {
      throw new Error(`Unexpected preview response type: ${contentType}`);
    }

    const blob = await pdfResponse.blob();
    return window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  };

  const downloadBlobUrl = (blobUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreviewReport = async () => {
    if (!selectedAthlete || !selectedAthleteData) {
      toast({
        title: "Error",
        description: "Please select an athlete.",
        variant: "destructive",
      });
      return;
    }

    setIsPreviewing(true);

    try {
      console.log(`Generating preview for: ${selectedAthleteData.name}`);

      const athleteId = athleteIdByKey[selectedAthlete];
      const response = await supabase.functions.invoke("generate-force-plate-report", {
        body: {
          athlete_id: athleteId || null,
          athlete_name: selectedAthleteData.name,
          team_name: selectedAthleteData.team,
          test_data: selectedAthleteData.tests,
        },
      });

      if (response.error) {
        console.error("Error generating report:", response.error);
        toast({
          title: "Error",
          description: "Failed to generate PDF report.",
          variant: "destructive",
        });
        return;
      }

      const { report_url, filename } = response.data ?? {};
      if (!report_url) {
        throw new Error("No report URL returned from the report generator.");
      }

      const blobUrl = await createPdfBlobUrl(report_url);

      if (previewUrl?.startsWith("blob:")) {
        window.URL.revokeObjectURL(previewUrl);
      }

      setPreviewFilename(filename || `${selectedAthleteData.name} Force Plate Report.pdf`);
      setPreviewUrl(blobUrl);

      toast({
        title: "Preview Ready",
        description: "Report generated. You can now preview or download it.",
      });
    } catch (error) {
      console.error("Error generating preview:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF preview.",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownloadFromPreview = () => {
    if (!previewUrl || !previewFilename) return;

    try {
      downloadBlobUrl(previewUrl, previewFilename);
      toast({
        title: "Success",
        description: "PDF downloaded successfully!",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download the PDF.",
        variant: "destructive",
      });
    }
  };

  const handleClosePreview = () => {
    if (previewUrl?.startsWith("blob:")) {
      window.URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setPreviewFilename("");
  };

  const handleGenerateAndDownload = async () => {
    if (!selectedAthlete || !selectedAthleteData) {
      toast({
        title: "Error",
        description: "Please select an athlete.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      console.log(`Generating force plate report for: ${selectedAthleteData.name}`);

      const athleteId = athleteIdByKey[selectedAthlete];
      const response = await supabase.functions.invoke("generate-force-plate-report", {
        body: {
          athlete_id: athleteId || null,
          athlete_name: selectedAthleteData.name,
          team_name: selectedAthleteData.team,
          test_data: selectedAthleteData.tests,
        },
      });

      if (response.error) {
        console.error("Error generating report:", response.error);
        toast({
          title: "Error",
          description: "Failed to generate PDF report.",
          variant: "destructive",
        });
        return;
      }

      const { report_url, filename, test_count, tests } = response.data ?? {};
      if (!report_url) {
        throw new Error("No report URL returned from the report generator.");
      }

      const blobUrl = await createPdfBlobUrl(report_url);
      const safeFilename = filename || `${selectedAthleteData.name} Force Plate Report.pdf`;

      downloadBlobUrl(blobUrl, safeFilename);
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 0);

      toast({
        title: "Success",
        description: `PDF generated with ${test_count} test pages: ${(tests || []).join(", ")}`,
        duration: 8000,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendViaEmail = async () => {
    if (!selectedAthlete || !selectedAthleteData) {
      toast({
        title: "Error",
        description: "Please select an athlete.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      console.log(`Generating and sending report for: ${selectedAthleteData.name}`);

      const athleteId = athleteIdByKey[selectedAthlete];
      const reportResponse = await supabase.functions.invoke("generate-force-plate-report", {
        body: {
          athlete_id: athleteId || null,
          athlete_name: selectedAthleteData.name,
          team_name: selectedAthleteData.team,
          test_data: selectedAthleteData.tests,
        },
      });

      if (reportResponse.error) {
        throw new Error("Failed to generate report");
      }

      const { report_url } = reportResponse.data ?? {};
      if (!report_url) {
        throw new Error("No report URL returned from the report generator.");
      }

      if (!athleteId) {
        toast({
          title: "Warning",
          description: "No athlete email found. PDF generated but not sent.",
          variant: "destructive",
        });
        return;
      }

      const emailResponse = await supabase.functions.invoke("send-report-via-notifications-api", {
        body: {
          athlete_id: athleteId,
          pdf_path: report_url,
        },
      });

      if (emailResponse.error) {
        throw new Error("Failed to send email");
      }

      toast({
        title: "Success",
        description: `Report sent to ${selectedAthleteData.name} via email!`,
      });

      setSelectedAthlete("");
      setSelectedTeams([]);
      setIsOpen(false);
    } catch (error) {
      console.error("Error sending report:", error);
      toast({
        title: "Error",
        description: "Failed to send report via email.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const isLoading = isGenerating || isSending || isPreviewing;

  if (previewUrl) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="flex h-[90vh] max-w-5xl flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Report Preview
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {previewFilename}
              </span>
            </DialogTitle>
            <DialogDescription>
              Review the report below. Click "Save as PDF" to download or close to go back.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/30">
            <PdfPreviewContent fileUrl={previewUrl} />
          </div>

          <div className="flex flex-shrink-0 gap-3 pt-4">
            <Button onClick={handleDownloadFromPreview} className="flex-1" variant="default">
              <Download className="mr-2 h-4 w-4" />
              Save as PDF
            </Button>
            <Button variant="outline" onClick={handleClosePreview} className="flex-1">
              <X className="mr-2 h-4 w-4" />
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Send Reports
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Force Plate Report
          </DialogTitle>
          <DialogDescription>
            Select an athlete to generate a multi-page PDF report with individual scores,
            historical comparisons, limb symmetry analysis, and AI coaching insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Team (Optional)</label>
            <MultiSelectDropdown
              options={teamOptions}
              value={selectedTeams}
              onChange={(teams) => {
                setSelectedTeams(teams);
                setSelectedAthlete("");
                setExcludedTests([]);
              }}
              placeholder={dataLoading ? "Loading teams..." : "Select teams to filter..."}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Athlete *</label>
            <Select
              value={selectedAthlete}
              onValueChange={(value) => {
                setSelectedAthlete(value);
                setExcludedTests([]);
              }}
              disabled={dataLoading || mappingLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    dataLoading || mappingLoading
                      ? "Loading athletes..."
                      : filteredAthletes.length === 0
                        ? "No athletes available"
                        : "Select an athlete..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredAthletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {athlete.name}
                      <span className="text-xs text-muted-foreground">({athlete.team})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAthleteData && (
            <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{selectedAthleteData.name}</span>
                <span className="text-sm text-muted-foreground">{selectedAthleteData.team}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{selectedAthleteData.testCount} test records included</p>
                <div className="mt-2">
                  <strong className="text-xs">Tests included:</strong>
                  <div className="mt-1 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {selectedAthleteData.allTestNames.map((testName) => {
                      const isExcluded = excludedTests.includes(testName);

                      return (
                        <span
                          key={testName}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-opacity ${
                            isExcluded
                              ? "bg-muted text-muted-foreground opacity-40 line-through"
                              : "border-primary/20 bg-primary/10 text-primary"
                          }`}
                        >
                          {testName}
                          <button
                            type="button"
                            onClick={() =>
                              setExcludedTests((previous) =>
                                isExcluded
                                  ? previous.filter((test) => test !== testName)
                                  : [...previous, testName],
                              )
                            }
                            className="ml-0.5 transition-colors hover:text-destructive"
                            aria-label={
                              isExcluded ? `Re-include ${testName}` : `Exclude ${testName}`
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                PDF will contain 1 page per test with historical trends, limb comparisons, and AI insights.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handlePreviewReport}
              disabled={isLoading || !selectedAthlete}
              className="w-full"
              variant="default"
            >
              {isPreviewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Report
                </>
              )}
            </Button>

            <Button
              onClick={handleGenerateAndDownload}
              disabled={isLoading || !selectedAthlete}
              className="w-full"
              variant="secondary"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF Directly
                </>
              )}
            </Button>

            <Button
              onClick={handleSendViaEmail}
              disabled={isLoading || !selectedAthlete}
              className="w-full"
              variant="outline"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Generate & Send via Email
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
