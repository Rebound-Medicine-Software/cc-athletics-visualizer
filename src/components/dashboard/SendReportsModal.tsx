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
          let athleteId = athleteIdByKey[athleteKey];
          if (!athleteId) {
            const selected = athletes.find(a => a.id === athleteKey);
            const normKey = selected ? `${normalize(selected.name)}-${normalize(selected.team)}` : undefined;
            if (normKey && athleteIdByKey[normKey]) {
              athleteId = athleteIdByKey[normKey];
            } else if (selected) {
              const candidates = athletesByName[normalize(selected.name)] || [];
              const match = candidates.find(c => normalize(c.team) === normalize(selected.team)) || candidates[0];
              if (match) athleteId = match.id;
            }
          }
          if (!athleteId) {
            console.warn(`No UUID found for selected athlete key: ${athleteKey}`);
            errorCount++;
            continue;
          }
          console.log(`Generating report for athlete (UUID): ${athleteId}`);
          
          // Call generateAthleteReport
          const reportResponse = await supabase.functions.invoke('generate-athlete-report', {
            body: { athlete_id: athleteId }
          });

          if (reportResponse.error) {
            console.error('Error generating report:', reportResponse.error);
            errorCount++;
            continue;
          }

          const { filePath } = reportResponse.data;
          console.log(`Report generated: ${filePath}`);

          // Call sendReportViaNotificationsAPI
          const emailResponse = await supabase.functions.invoke('send-report-via-notifications-api', {
            body: { 
              athlete_id: athleteId, 
              pdf_path: filePath 
            }
          });

          if (emailResponse.error) {
            console.error('Error sending email:', emailResponse.error);
            errorCount++;
            continue;
          }

          console.log(`Report sent successfully for athlete: ${athleteId}`);
          successCount++;
        } catch (error) {
          console.error(`Error processing athlete key ${athleteKey}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: "Reports sent successfully!",
        });
      }

      if (errorCount > 0) {
        toast({
          title: "Warning",
          description: `${errorCount} reports failed to send. Check console for details.`,
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
        description: "Failed to send reports. Please try again.",
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

          <div className="flex justify-end gap-2 pt-4">
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
      </DialogContent>
    </Dialog>
  );
};