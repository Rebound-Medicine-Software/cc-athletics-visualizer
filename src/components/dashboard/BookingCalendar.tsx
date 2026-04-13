import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Cal, { getCalApi } from "@calcom/embed-react";
import {
  Calendar, ExternalLink, Settings, Link2, CheckCircle2,
  LogIn, UserPlus, ArrowRight, RefreshCw, Unlink
} from "lucide-react";
import { useEffect as useEffectOnce } from "react";

export const BookingCalendar = () => {
  const { profile } = useAuth();
  const [calUsername, setCalUsername] = useState("");
  const [calLink, setCalLink] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputUsername, setInputUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("booking");

  // Load Cal.com settings from team setup_data
  useEffect(() => {
    const loadCalSettings = async () => {
      if (!profile?.team_id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: team } = await supabase
          .from("teams")
          .select("setup_data")
          .eq("id", profile.team_id)
          .single();

        if (team?.setup_data && typeof team.setup_data === 'object') {
          const setupData = team.setup_data as Record<string, any>;
          if (setupData.cal_username) {
            setCalUsername(setupData.cal_username);
            setCalLink(setupData.cal_link || "");
            setIsConnected(true);
          }
        }
      } catch (err) {
        console.error("Error loading Cal.com settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCalSettings();
  }, [profile?.team_id]);

  // Initialize Cal.com embed API
  useEffect(() => {
    if (isConnected && calUsername) {
      (async () => {
        const cal = await getCalApi();
        cal("ui", {
          theme: "light",
          styles: { branding: { brandColor: "#3B82F6" } },
          hideEventTypeDetails: false,
        });
      })();
    }
  }, [isConnected, calUsername]);

  const handleConnect = async () => {
    if (!inputUsername.trim()) {
      toast.error("Please enter your Cal.com username");
      return;
    }

    const username = inputUsername.trim().replace(/^@/, "").replace(/^https?:\/\/cal\.com\//, "");

    if (!profile?.team_id) {
      toast.error("No team found. Please contact support.");
      return;
    }

    try {
      // Get existing setup_data
      const { data: team } = await supabase
        .from("teams")
        .select("setup_data")
        .eq("id", profile.team_id)
        .single();

      const existingData = (team?.setup_data && typeof team.setup_data === 'object')
        ? team.setup_data as Record<string, any>
        : {};

      const { error } = await supabase
        .from("teams")
        .update({
          setup_data: {
            ...existingData,
            cal_username: username,
            cal_link: `https://cal.com/${username}`,
          },
        })
        .eq("id", profile.team_id);

      if (error) throw error;

      setCalUsername(username);
      setCalLink(`https://cal.com/${username}`);
      setIsConnected(true);
      setIsSettingsOpen(false);
      toast.success("Cal.com account connected successfully!");
    } catch (err) {
      console.error("Error saving Cal.com settings:", err);
      toast.error("Failed to save Cal.com settings");
    }
  };

  const handleDisconnect = async () => {
    if (!profile?.team_id) return;

    try {
      const { data: team } = await supabase
        .from("teams")
        .select("setup_data")
        .eq("id", profile.team_id)
        .single();

      const existingData = (team?.setup_data && typeof team.setup_data === 'object')
        ? team.setup_data as Record<string, any>
        : {};

      const { cal_username, cal_link, ...rest } = existingData;

      const { error } = await supabase
        .from("teams")
        .update({ setup_data: rest })
        .eq("id", profile.team_id);

      if (error) throw error;

      setCalUsername("");
      setCalLink("");
      setIsConnected(false);
      setInputUsername("");
      toast.success("Cal.com account disconnected");
    } catch (err) {
      toast.error("Failed to disconnect Cal.com");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not connected — show setup screen
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
            <p className="text-muted-foreground">Powered by Cal.com — free, open-source scheduling</p>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto mt-8">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Connect Cal.com</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Integrate your free Cal.com account to enable booking, scheduling, and calendar management directly in your dashboard.
                </p>
              </div>

              <div className="grid gap-4 text-left max-w-sm mx-auto">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Free scheduling with unlimited event types</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Google Calendar, Outlook & Zoom integrations</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Automated reminders & confirmations</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Athlete self-booking with time zone support</span>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div className="flex gap-3">
                  <a
                    href="https://cal.com/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full gap-2">
                      <UserPlus className="w-4 h-4" />
                      Create Free Account
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </a>
                  <a
                    href="https://app.cal.com/auth/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full gap-2">
                      <LogIn className="w-4 h-4" />
                      Login to Cal.com
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </a>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">then connect below</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="cal-username" className="text-sm font-medium">
                    Your Cal.com Username
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-muted px-3 rounded-l-md border border-r-0 text-sm text-muted-foreground">
                      cal.com/
                    </div>
                    <Input
                      id="cal-username"
                      placeholder="your-username"
                      value={inputUsername}
                      onChange={(e) => setInputUsername(e.target.value)}
                      className="rounded-l-none flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    />
                  </div>
                  <Button onClick={handleConnect} className="w-full gap-2">
                    <Link2 className="w-4 h-4" />
                    Connect Cal.com Account
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected — show embedded Cal.com
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">
            Powered by Cal.com —{" "}
            <a
              href={`https://cal.com/${calUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              cal.com/{calUsername}
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-green-700 border-green-300 bg-green-50">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Connected
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setInputUsername(calUsername);
              setIsSettingsOpen(true);
            }}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="booking" className="gap-2">
            <Calendar className="w-4 h-4" />
            Book Appointment
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <Settings className="w-4 h-4" />
            Manage Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="booking" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <Cal
                calLink={calUsername}
                style={{ width: "100%", height: "700px", overflow: "auto" }}
                config={{
                  layout: "month_view",
                  theme: "light",
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <iframe
                src={`https://app.cal.com/event-types`}
                style={{ width: "100%", height: "700px", border: "none" }}
                title="Cal.com Dashboard"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cal.com Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cal.com Username</Label>
              <div className="flex gap-2">
                <div className="flex items-center bg-muted px-3 rounded-l-md border border-r-0 text-sm text-muted-foreground">
                  cal.com/
                </div>
                <Input
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  className="rounded-l-none flex-1"
                />
              </div>
            </div>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <a
                href="https://app.cal.com/settings/my-account/profile"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Manage Cal.com account settings
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" size="sm" onClick={handleDisconnect} className="gap-1.5">
              <Unlink className="w-3.5 h-3.5" />
              Disconnect
            </Button>
            <Button onClick={handleConnect} className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
