import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

export const SendReportsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: testData = [], isLoading: dataLoading } = useSupabaseData();

  // Normalization helper
  const normalize = (s: string) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

  // Map composite key "name-team" to UUID from athletes_new
  const [athleteIdByKey, setAthleteIdByKey] = useState<Record<string, string>>({});
  const [athletesByName, setAthletesByName] = useState<Record<string, { id: string; name: string; team: string }[]>>({});
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
        const byName: Record<string, { id: string; name: string; team: string }[]> = {};
        (data || []).forEach((a: any) => {
          if (a?.name && a?.team && a?.id) {
            const rawKey = `${a.name}-${a.team}`;
            const normKey = `${normalize(a.name)}-${normalize(a.team)}`;
            byKey[rawKey] = a.id;
            byKey[normKey] = a.id;
            const nameKey = normalize(a.name);
            if (!byName[nameKey]) byName[nameKey] = [];
            byName[nameKey].push({ id: a.id, name: a.name, team: a.team });
          }
        });
        setAthleteIdByKey(byKey);
        setAthletesByName(byName);
      } catch (err) {
        console.error('Unexpected error fetching athletes_new:', err);
      } finally {
        setMappingLoading(false);
      }
    };
    fetchAthleteIds();
  }, []);

  // Extract unique athletes from test data (for dropdowns)
  const athletes = Array.from(
    new Map(
      testData.map(record => [
        `${record.athlete_name}-${record.team_name}`,
        {
          id: `${record.athlete_name}-${record.team_name}`,
          name: record.athlete_name,
          team: record.team_name
        }
      ])
    ).values()
  );

  // Get unique team names
  const teamOptions = Array.from(new Set(athletes.map(a => a.team)))
    .map(team => ({ value: team, label: team }));

  // Filter athletes based on selected teams
  const filteredAthletes = selectedTeams.length === 0 
    ? athletes 
    : athletes.filter(a => selectedTeams.includes(a.team));
    
  const athleteOptions = filteredAthletes.map(athlete => ({
    value: athlete.id,
    label: athlete.name
  }));

  const handleTestInteractiveReport = async () => {
    setIsLoading(true);
    try {
      console.log('Generating interactive PDF report...');
      const response = await supabase.functions.invoke('generate-interactive-pdf-report');
      
      if (response.error) {
        console.error('Error generating interactive PDF:', response.error);
        toast({
          title: "Error",
          description: "Failed to generate interactive PDF.",
          variant: "destructive",
        });
        return;
      }

      const { report_url, filename } = response.data;
      console.log('Interactive PDF generated:', report_url);
      
      // Try both approaches - download and opening in new tab
      try {
        // Create a download link
        const link = document.createElement('a');
        link.href = report_url;
        link.download = filename || 'interactive-report.pdf';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Also try opening in new tab as fallback
        setTimeout(() => {
          window.open(report_url, '_blank', 'noopener,noreferrer');
        }, 500);
        
      } catch (downloadError) {
        console.error('Download failed, opening in new tab:', downloadError);
        window.open(report_url, '_blank', 'noopener,noreferrer');
      }
      
      toast({
        title: "Success",
        description: `Interactive PDF generated! Direct link: ${report_url}`,
        duration: 10000,
      });
    } catch (error) {
      console.error('Error generating interactive PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate interactive PDF.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReports = async () => {
    if (selectedAthletes.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one athlete.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const athleteKey of selectedAthletes) {
        try {
          console.log(`Generating interactive PDF for athlete: ${athleteKey}`);
          
          // Generate interactive PDF for each selected athlete
          const reportResponse = await supabase.functions.invoke('generate-interactive-pdf-report');
          
          if (reportResponse.error) {
            console.error('Error generating interactive PDF:', reportResponse.error);
            errorCount++;
            continue;
          }

          const { report_url, filename } = reportResponse.data;
          console.log(`Interactive PDF generated: ${report_url}`);
          
          // Create download link for each athlete's PDF
          const link = document.createElement('a');
          link.href = report_url;
          link.download = filename || `interactive-report-${athleteKey}.pdf`;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          console.log(`Interactive PDF sent successfully for athlete: ${athleteKey}`);
          successCount++;
        } catch (error) {
          console.error(`Error processing athlete key ${athleteKey}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} interactive PDFs generated successfully!`,
        });
      }

      if (errorCount > 0) {
        toast({
          title: "Warning",
          description: `${errorCount} reports failed to generate. Check console for details.`,
          variant: "destructive",
        });
      }

      // Reset and close modal
      setSelectedTeams([]);
      setSelectedAthletes([]);
      setIsOpen(false);
    } catch (error) {
      console.error('Error in send reports process:', error);
      toast({
        title: "Error",
        description: "Failed to generate reports. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Send Report(s)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Athlete Reports</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Team Name</label>
            <MultiSelectDropdown
              options={teamOptions}
              value={selectedTeams}
              onChange={setSelectedTeams}
              placeholder={dataLoading ? "Loading teams..." : "Select teams..."}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Athlete Name</label>
            <MultiSelectDropdown
              options={athleteOptions}
              value={selectedAthletes}
              onChange={setSelectedAthletes}
              placeholder={
                dataLoading || mappingLoading
                  ? "Loading athletes..."
                  : filteredAthletes.length === 0 
                    ? "No athletes available" 
                    : "Select athletes..."
              }
            />
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              variant="secondary"
              onClick={handleTestInteractiveReport}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Generating..." : "📄 Test Interactive PDF (Sample Data)"}
            </Button>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendReports}
                disabled={isLoading || mappingLoading || selectedAthletes.length === 0}
              >
                {isLoading ? "Sending..." : "Send Reports"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};