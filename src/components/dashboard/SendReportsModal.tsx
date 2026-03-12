import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { FileText, Download, Mail, Loader2, User, Eye, X } from "lucide-react";

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

  // Map composite key "name-team" to UUID from athletes_new
  const [athleteIdByKey, setAthleteIdByKey] = useState<Record<string, string>>({});
  const [mappingLoading, setMappingLoading] = useState(false);

  // Fetch athletes_new to build mapping
  useEffect(() => {
    const fetchAthleteIds = async () => {
      try {
        setMappingLoading(true);
        const { data, error } = await supabase
          .from('athletes_new')
          .select('id,name,team');
        if (error) {
          console.error('Error fetching athletes_new:', error);
          return;
        }
        const byKey: Record<string, string> = {};
        (data || []).forEach((a: any) => {
          if (a?.name && a?.team && a?.id) {
            const key = `${a.name}|||${a.team}`;
            byKey[key] = a.id;
          }
        });
        setAthleteIdByKey(byKey);
      } catch (err) {
        console.error('Unexpected error fetching athletes_new:', err);
      } finally {
        setMappingLoading(false);
      }
    };
    fetchAthleteIds();
  }, []);

  // Extract unique athletes from test data
  const athletes = useMemo(() => {
    return Array.from(
      new Map(
        testData.map(record => [
          `${record.athlete_name}|||${record.team_name}`,
          {
            id: `${record.athlete_name}|||${record.team_name}`,
            name: record.athlete_name,
            team: record.team_name
          }
        ])
      ).values()
    );
  }, [testData]);

  // Get unique team names
  const teamOptions = useMemo(() => {
    return Array.from(new Set(athletes.map(a => a.team)))
      .filter(Boolean)
      .sort()
      .map(team => ({ value: team, label: team }));
  }, [athletes]);

  // Filter athletes based on selected teams
  const filteredAthletes = useMemo(() => {
    if (selectedTeams.length === 0) return athletes;
    return athletes.filter(a => selectedTeams.includes(a.team));
  }, [athletes, selectedTeams]);

  // Get test data for selected athlete
  const selectedAthleteData = useMemo(() => {
    if (!selectedAthlete) return null;
    const [name, team] = selectedAthlete.split('|||');
    const athleteTests = testData.filter(
      t => t.athlete_name === name && t.team_name === team
    );
    const allTestNames = Array.from(new Set(athleteTests.map(t => t.test_name)));
    const includedTests = athleteTests.filter(t => !excludedTests.includes(t.test_name));
    const includedTestNames = allTestNames.filter(t => !excludedTests.includes(t));
    return {
      name,
      team,
      tests: includedTests,
      allTestNames,
      testNames: includedTestNames,
      testCount: includedTests.length,
    };
  }, [selectedAthlete, testData, excludedTests]);

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

      const response = await supabase.functions.invoke('generate-force-plate-report', {
        body: {
          athlete_id: athleteId || null,
          athlete_name: selectedAthleteData.name,
          team_name: selectedAthleteData.team,
          test_data: selectedAthleteData.tests,
        }
      });

      if (response.error) {
        console.error('Error generating report:', response.error);
        toast({
          title: "Error",
          description: "Failed to generate PDF report.",
          variant: "destructive",
        });
        return;
      }

      const { report_url, filename } = response.data;
      
      // Fetch PDF as blob to avoid CORS/ad-blocker issues with Supabase URLs
      try {
        const pdfResponse = await fetch(report_url);
        const blob = await pdfResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        setPreviewUrl(blobUrl);
      } catch (fetchError) {
        console.error('Error fetching PDF for preview, using direct URL:', fetchError);
        setPreviewUrl(report_url);
      }
      
      setPreviewFilename(filename);
      
      toast({
        title: "Preview Ready",
        description: "Report generated. You can now preview or download it.",
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF preview.",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownloadFromPreview = async () => {
    if (!previewUrl || !previewFilename) return;
    
    try {
      const pdfResponse = await fetch(previewUrl);
      const blob = await pdfResponse.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = previewFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Success",
        description: "PDF downloaded successfully!",
      });
    } catch (fetchError) {
      console.error('Error downloading PDF:', fetchError);
      window.open(previewUrl, '_blank');
    }
  };

  const handleClosePreview = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
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

      // Get athlete UUID if available
      const athleteId = athleteIdByKey[selectedAthlete];

      const response = await supabase.functions.invoke('generate-force-plate-report', {
        body: {
          athlete_id: athleteId || null,
          athlete_name: selectedAthleteData.name,
          team_name: selectedAthleteData.team,
          test_data: selectedAthleteData.tests,
        }
      });

      if (response.error) {
        console.error('Error generating report:', response.error);
        toast({
          title: "Error",
          description: "Failed to generate PDF report.",
          variant: "destructive",
        });
        return;
      }

      const { report_url, filename, test_count, tests } = response.data;
      console.log('Report generated:', report_url);

      // Fetch as blob to avoid ad-blocker blocking Supabase URLs
      try {
        const pdfResponse = await fetch(report_url);
        const blob = await pdfResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        window.URL.revokeObjectURL(blobUrl);
      } catch (fetchError) {
        console.error('Error downloading PDF, falling back to direct link:', fetchError);
        // Fallback: open in new tab
        window.open(report_url, '_blank');
      }

      toast({
        title: "Success",
        description: `PDF generated with ${test_count} test pages: ${tests.join(', ')}`,
        duration: 8000,
      });
    } catch (error) {
      console.error('Error generating report:', error);
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

      // First generate the PDF
      const reportResponse = await supabase.functions.invoke('generate-force-plate-report', {
        body: {
          athlete_id: athleteId || null,
          athlete_name: selectedAthleteData.name,
          team_name: selectedAthleteData.team,
          test_data: selectedAthleteData.tests,
        }
      });

      if (reportResponse.error) {
        throw new Error('Failed to generate report');
      }

      const { report_url } = reportResponse.data;

      // Then send via email
      if (!athleteId) {
        toast({
          title: "Warning",
          description: "No athlete email found. PDF generated but not sent.",
          variant: "destructive",
        });
        return;
      }

      const emailResponse = await supabase.functions.invoke('send-report-via-notifications-api', {
        body: {
          athlete_id: athleteId,
          pdf_path: report_url,
        }
      });

      if (emailResponse.error) {
        throw new Error('Failed to send email');
      }

      toast({
        title: "Success",
        description: `Report sent to ${selectedAthleteData.name} via email!`,
      });

      // Reset and close
      setSelectedAthlete("");
      setSelectedTeams([]);
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending report:', error);
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

  // If preview is active, show the preview modal
  if (previewUrl) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col">
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
          
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted/30">
            <iframe 
              src={previewUrl} 
              className="w-full h-full"
              title="PDF Preview"
            />
          </div>
          
          <div className="flex gap-3 pt-4 flex-shrink-0">
            <Button
              onClick={handleDownloadFromPreview}
              className="flex-1"
              variant="default"
            >
              <Download className="h-4 w-4 mr-2" />
              Save as PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleClosePreview}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
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
      <DialogContent className="sm:max-w-lg">
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
          {/* Team Filter */}
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
          
          {/* Athlete Selector - Single Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Athlete *</label>
            <Select
              value={selectedAthlete}
              onValueChange={(val) => { setSelectedAthlete(val); setExcludedTests([]); }}
              disabled={dataLoading || mappingLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  dataLoading || mappingLoading
                    ? "Loading athletes..."
                    : filteredAthletes.length === 0
                      ? "No athletes available"
                      : "Select an athlete..."
                } />
              </SelectTrigger>
              <SelectContent>
                {filteredAthletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {athlete.name}
                      <span className="text-muted-foreground text-xs">({athlete.team})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Athlete Info */}
          {selectedAthleteData && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedAthleteData.name}</span>
                <span className="text-sm text-muted-foreground">{selectedAthleteData.team}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{selectedAthleteData.testCount} test records included</p>
                <div className="mt-2">
                  <strong className="text-xs">Tests included:</strong>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedAthleteData.allTestNames.map((testName) => {
                      const isExcluded = excludedTests.includes(testName);
                      return (
                        <span
                          key={testName}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-opacity ${
                            isExcluded
                              ? 'opacity-40 line-through bg-muted text-muted-foreground'
                              : 'bg-primary/10 text-primary border-primary/20'
                          }`}
                        >
                          {testName}
                          <button
                            type="button"
                            onClick={() =>
                              setExcludedTests((prev) =>
                                isExcluded
                                  ? prev.filter((t) => t !== testName)
                                  : [...prev, testName]
                              )
                            }
                            className="ml-0.5 hover:text-destructive transition-colors"
                            aria-label={isExcluded ? `Re-include ${testName}` : `Exclude ${testName}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                PDF will contain 1 page per test with historical trends, limb comparisons, and AI insights.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handlePreviewReport}
              disabled={isLoading || !selectedAthlete}
              className="w-full"
              variant="default"
            >
              {isPreviewing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
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
