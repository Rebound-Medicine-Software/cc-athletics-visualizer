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
import { FileText, Download, Mail, Loader2, User } from "lucide-react";

export const SendReportsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
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
    return {
      name,
      team,
      tests: athleteTests,
      testNames: Array.from(new Set(athleteTests.map(t => t.test_name))),
      testCount: athleteTests.length,
    };
  }, [selectedAthlete, testData]);

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

      // Download the PDF
      const link = document.createElement('a');
      link.href = report_url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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

  const isLoading = isGenerating || isSending;

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
              }}
              placeholder={dataLoading ? "Loading teams..." : "Select teams to filter..."}
            />
          </div>
          
          {/* Athlete Selector - Single Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Athlete *</label>
            <Select
              value={selectedAthlete}
              onValueChange={setSelectedAthlete}
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
                <p>{selectedAthleteData.testCount} test records found</p>
                <p className="mt-1">
                  <strong>Tests included:</strong>{' '}
                  {selectedAthleteData.testNames.length > 0 
                    ? selectedAthleteData.testNames.join(', ')
                    : 'No tests found'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                PDF will contain 1 page per test with historical trends, limb comparisons, and AI insights.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleGenerateAndDownload}
              disabled={isLoading || !selectedAthlete}
              className="w-full"
              variant="default"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate & Download PDF
                </>
              )}
            </Button>

            <Button
              onClick={handleSendViaEmail}
              disabled={isLoading || !selectedAthlete}
              className="w-full"
              variant="secondary"
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
              variant="outline"
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
