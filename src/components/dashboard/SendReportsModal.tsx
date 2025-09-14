import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { useAthletes } from "@/hooks/useAthletes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

export const SendReportsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: athletes = [], isLoading: athletesLoading } = useAthletes();

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
      for (const athleteId of selectedAthletes) {
        try {
          console.log(`Generating report for athlete: ${athleteId}`);
          
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
          console.error(`Error processing athlete ${athleteId}:`, error);
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
              placeholder={athletesLoading ? "Loading teams..." : "Select teams..."}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Athlete Name</label>
            <MultiSelectDropdown
              options={athleteOptions}
              value={selectedAthletes}
              onChange={setSelectedAthletes}
              placeholder={
                athletesLoading 
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
              disabled={isLoading || selectedAthletes.length === 0}
            >
              {isLoading ? "Sending..." : "Send Reports"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};