import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCheck, Edit, Save, X, Search, Upload, RefreshCw, Eye, EyeOff, Mail, MailX, Plus, Trash2, Shield, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AddAthleteFromApiDialog } from "./AddAthleteFromApiDialog";
import { useDirtyTracker } from "./UnsavedChangesContext";

interface Athlete {
  id: string;
  name: string;
  cc_athlete_id: string;
  cc_team_id?: string;
  team_id?: string;
  age?: number;
  gender?: string;
  weight_kg?: number;
  height_cm?: number;
  avatar_url?: string;
  email?: string;
  password_hash?: string;
  consent_status?: string;
  consent_token?: string;
  consent_signed_at?: string;
  created_at: string;
  team_name?: string;
  team_logo_url?: string;
}

export const AthleteCredentialsTab = () => {
  const { profile } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    avatar_url: '',
    password: '',
    email: '',
    team_logo_url: ''
  });
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState("");
  const [viewingPasswordId, setViewingPasswordId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [showVerificationPassword, setShowVerificationPassword] = useState(false);
  const [sendSignupEmails, setSendSignupEmails] = useState(() => {
    const saved = localStorage.getItem('sendSignupEmails');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const canEditAvatar = profile?.role === 'organisation' || profile?.role === 'super_admin';

  // Dirty whenever an inline edit form is open with any user input
  const isFormDirty = !!editingId && (
    !!editForm.avatar_url || !!editForm.password ||
    !!editForm.email || !!editForm.team_logo_url
  );
  useDirtyTracker("athlete-credentials", isFormDirty);

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      setLoading(true);
      
      // Fetch from CC Athletics API via Supabase Edge Function to get team_name
      const { data: ccData, error: ccError } = await supabase.functions.invoke('fetch-cc-data', {
        method: 'GET',
      });

      if (ccError) throw ccError;

      if (!ccData.success) {
        throw new Error(ccData.error);
      }

      // Get unique athletes from CC Athletics data with their team names
      const athletesMap = new Map();
      ccData.data?.forEach((record: any) => {
        if (!athletesMap.has(record.athlete_id)) {
          athletesMap.set(record.athlete_id, {
            athlete_id: record.athlete_id,
            name: record.athlete_name,
            team_name: record.team_name,
            gender: record.gender,
          });
        }
      });

      const ccAthletes = Array.from(athletesMap.values());

      // Now fetch athletes from our database
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch teams data to get logos
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('cc_team_id, logo_url');

      if (teamsError) throw teamsError;

      // Fetch Region Testing data for logo fallback matching
      const { data: regionTestingData, error: regionError } = await supabase
        .from('Region Testing')
        .select('*');

      if (regionError) console.error('Error fetching region testing data:', regionError);

      // Fuzzy match helper: checks if names roughly match (case-insensitive, partial match)
      const fuzzyMatch = (name1: string, name2: string): boolean => {
        const n1 = name1.toLowerCase().trim();
        const n2 = name2.toLowerCase().trim();
        if (n1 === n2) return true;
        if (n1.includes(n2) || n2.includes(n1)) return true;
        // Check word overlap: if >50% of words match
        const words1 = n1.split(/\s+/);
        const words2 = n2.split(/\s+/);
        const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
        return commonWords.length >= Math.min(words1.length, words2.length) * 0.5 && commonWords.length > 0;
      };
      
      // Map the athletes data to include team_name and team_logo_url
      const athletesWithTeamNames = data?.map(athlete => {
        const ccAthlete = ccAthletes.find(cc => cc.athlete_id === athlete.cc_athlete_id);
        const team = teamsData?.find(t => t.cc_team_id === athlete.cc_team_id);
        const teamName = ccAthlete?.team_name || 'No Team';
        
        // Priority: 1) teams table logo, 2) Region Testing fuzzy match logo
        let logoUrl = team?.logo_url || null;
        if (!logoUrl && teamName !== 'No Team' && regionTestingData) {
          const regionMatch = regionTestingData.find(r => fuzzyMatch(r["Team Name"], teamName));
          if (regionMatch?.logo) {
            logoUrl = regionMatch.logo;
          }
        }

        return {
          ...athlete,
          team_name: teamName,
          team_logo_url: logoUrl
        };
      }) || [];
      
      setAthletes(athletesWithTeamNames);
    } catch (error) {
      console.error('Error fetching athletes:', error);
      toast.error("Failed to load athletes");
    } finally {
      setLoading(false);
    }
  };

  const filteredAthletes = athletes.filter(athlete =>
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.cc_athlete_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (athlete: Athlete) => {
    setEditingId(athlete.id);
    setEditForm({
      avatar_url: '',
      password: '',
      email: athlete.email || '',
      team_logo_url: ''
    });
  };

  const generateSafePassword = () => {
    const adjectives = ["Swift", "Strong", "Bright", "Noble", "Quick", "Bold", "Smart", "Great"];
    const nouns = ["Tiger", "Eagle", "Lion", "Wolf", "Bear", "Hawk", "Fox", "Shark"];
    const numbers = Math.floor(Math.random() * 99) + 10;
    const symbols = ["!", "@", "#", "$", "%"];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    return `${adjective}${noun}${numbers}${symbol}`;
  };

  const createAthleteAccount = async (athlete: Athlete, email: string, password: string, suppressEmail = false) => {
    try {
      // Get current user's profile to identify the organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data: organizationProfile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!organizationProfile?.team_id) {
        throw new Error("Organization team not found");
      }

      // Get team information
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', organizationProfile.team_id)
        .single();

      // Send account creation request to edge function
      const { data, error } = await supabase.functions.invoke('send-client-credentials', {
        body: {
          email: email,
          firstName: athlete.name.split(' ')[0] || athlete.name,
          lastName: athlete.name.split(' ').slice(1).join(' ') || '',
          password: password,
          organisationName: team?.name || 'Your Organization',
          athleteType: 'Athlete',
          // Deterministic linking — guarantees athletes.user_id is set and
          // profile.role/team_id are correct so the client can reach
          // /Dashboard(Client) on first login.
          athleteId: athlete.id,
          teamId: athlete.team_id || organizationProfile.team_id,
          suppressEmail,
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error details:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating athlete account:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const athlete = athletes.find(a => a.id === editingId);
      if (!athlete) return;

      let avatarUrl = editForm.avatar_url;

      // If there's a new avatar file (data URL), upload it to storage
      if (editForm.avatar_url && editForm.avatar_url.startsWith('data:') && canEditAvatar) {
        try {
          // Convert data URL to blob
          const response = await fetch(editForm.avatar_url);
          const blob = await response.blob();
          
          // Create a unique filename
          const fileName = `${athlete.id}-${Date.now()}.jpg`;
          
          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('athlete-avatars')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }

          // Get the public URL
          const { data: urlData } = supabase.storage
            .from('athlete-avatars')
            .getPublicUrl(fileName);
          
          avatarUrl = urlData.publicUrl;
        } catch (uploadError) {
          console.error('Failed to upload avatar:', uploadError);
          toast.error("Failed to upload avatar image");
          return;
        }
      }

      // Handle team logo upload
      let teamLogoUrl = editForm.team_logo_url;
      if (editForm.team_logo_url && editForm.team_logo_url.startsWith('data:') && canEditAvatar) {
        try {
          // Determine the team to update: prefer direct team_id, fallback to cc_team_id lookup
          let teamIdToUpdate = athlete.team_id || null;
          
          console.log('Debug - athlete.team_id:', athlete.team_id);
          console.log('Debug - athlete.cc_team_id:', athlete.cc_team_id);
          
          if (!teamIdToUpdate && athlete.cc_team_id) {
            const { data: teamByCc, error: teamError } = await supabase
              .from('teams')
              .select('id, name')
              .eq('cc_team_id', athlete.cc_team_id)
              .maybeSingle();
            
            console.log('Debug - team lookup result:', { teamByCc, teamError });
            teamIdToUpdate = teamByCc?.id || null;
          }

          // If no team found, try to create one using the athlete's team info
          if (!teamIdToUpdate && athlete.cc_team_id && athlete.team_name) {
            console.log('Debug - Creating new team for athlete');

            const { data: authData, error: authErr } = await supabase.auth.getUser();
            if (authErr || !authData.user) {
              console.error('Auth error while creating team:', authErr);
              toast.error('You must be signed in to create a team.');
              return;
            }

            const { data: newTeam, error: createError } = await supabase
              .from('teams')
              .insert({
                cc_team_id: athlete.cc_team_id,
                name: athlete.team_name,
                country: 'UK', // default value
                admin_id: authData.user.id
              })
              .select('id')
              .single();

            if (createError) {
              console.error('Error creating team:', createError);
              toast.error("Failed to create team for athlete: " + createError.message);
              return;
            }

            teamIdToUpdate = newTeam?.id;
            console.log('Debug - Created new team with ID:', teamIdToUpdate);

            // Link this athlete to the newly created team for future operations
            if (teamIdToUpdate) {
              const { error: athleteUpdateErr } = await supabase
                .from('athletes')
                .update({ team_id: teamIdToUpdate })
                .eq('id', athlete.id);
              if (athleteUpdateErr) {
                console.warn('Warning: failed to link athlete to new team:', athleteUpdateErr);
              } else {
                setAthletes(prev => prev.map(a => a.id === athlete.id ? { ...a, team_id: teamIdToUpdate } : a));
              }
            }
          }

          if (!teamIdToUpdate) {
            console.error('Debug - No team ID found for athlete:', athlete);
            toast.error("Could not find or create team for this athlete. Athlete info: " + athlete.name + " (CC Team ID: " + athlete.cc_team_id + ")");
            return;
          }

          // Convert data URL to blob
          const response = await fetch(editForm.team_logo_url);
          const blob = await response.blob();
          
          // Create a unique filename
          const fileName = `team-${teamIdToUpdate}-${Date.now()}.jpg`;
          
          // Upload to Supabase storage (reuse the avatars bucket for simplicity)
          const { error: uploadError } = await supabase.storage
            .from('athlete-avatars')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.error('Team logo upload error:', uploadError);
            throw uploadError;
          }

          // Get the public URL
          const { data: urlData } = supabase.storage
            .from('athlete-avatars')
            .getPublicUrl(fileName);
          
          teamLogoUrl = urlData.publicUrl;

          // Update the team's logo in the teams table
          const { error: teamUpdateError } = await supabase
            .from('teams')
            .update({ logo_url: teamLogoUrl })
            .eq('id', teamIdToUpdate);

          if (teamUpdateError) {
            console.error('Team update error:', teamUpdateError);
            throw teamUpdateError;
          }

          // Update local athlete state with new team logo (by team_id or cc_team_id)
          setAthletes(prev => prev.map(a => {
            const sameTeam = (athlete.team_id && a.team_id === athlete.team_id) ||
                             (athlete.cc_team_id && a.cc_team_id === athlete.cc_team_id);
            return sameTeam ? { ...a, team_logo_url: teamLogoUrl } : a;
          }));

          toast.success("Team logo updated successfully");
        } catch (uploadError) {
          console.error('Failed to upload team logo:', uploadError);
          toast.error("Failed to upload team logo: " + uploadError.message);
          return;
        }
      }

      // Prepare update object
      const updateData: any = {};
      
      // Add avatar URL if changed
      if (avatarUrl && avatarUrl !== athlete.avatar_url) {
        updateData.avatar_url = avatarUrl;
      }
      
      // Add email if changed
      if (editForm.email !== athlete.email) {
        updateData.email = editForm.email;
      }

      // Handle password and account creation
      if (editForm.password && editForm.email && sendSignupEmails) {
        try {
          await createAthleteAccount(athlete, editForm.email, editForm.password);
          // Store password for future reference
          updateData.password_hash = editForm.password;
          toast.success(`Account created and credentials sent to ${editForm.email}`);
        } catch (accountError: any) {
          console.error('Error creating account:', accountError);
          toast.error("Failed to create athlete account: " + (accountError.message || "Unknown error"));
          return;
        }
      } else if (editForm.password && editForm.email && !sendSignupEmails) {
        // Store password and email without sending signup email
        updateData.password_hash = editForm.password;
        updateData.email = editForm.email;
        toast.success("Athlete credentials saved (no email sent)");
      } else if (editForm.password && !editForm.email) {
        // Just store password without creating account
        updateData.password_hash = editForm.password;
      }

      // Update athlete record if there are changes
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('athletes')
          .update(updateData)
          .eq('id', editingId);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }

        // Update local state
        setAthletes(prev => prev.map(a => 
          a.id === editingId ? { ...a, ...updateData } : a
        ));
        
        toast.success("Athlete information updated successfully");
      }
      
      setEditingId(null);
      setEditForm({ avatar_url: '', password: '', email: '', team_logo_url: '' });
    } catch (error) {
      console.error('Error updating athlete:', error);
      toast.error("Failed to update athlete credentials");
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && canEditAvatar) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setEditForm(prev => ({ ...prev, avatar_url: dataUrl }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTeamLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && canEditAvatar) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setEditForm(prev => ({ ...prev, team_logo_url: dataUrl }));
      };
      reader.readAsDataURL(file);
    }
  };

  const verifyPassword = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("User not authenticated");
        return false;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: verificationPassword
      });

      if (error) {
        toast.error("Invalid password");
        return false;
      }

      return true;
    } catch (error) {
      console.error('Password verification error:', error);
      toast.error("Password verification failed");
      return false;
    }
  };

  const handleViewPassword = async (athleteId: string) => {
    setViewingPasswordId(athleteId);
    setShowVerificationModal(true);
  };

  const handleVerificationSubmit = async () => {
    const isValid = await verifyPassword();
    if (isValid && viewingPasswordId) {
      const athlete = athletes.find(a => a.id === viewingPasswordId);
      if (athlete?.password_hash) {
        setRevealedPasswords(prev => ({
          ...prev,
          [viewingPasswordId]: athlete.password_hash || ''
        }));
      }
      setShowVerificationModal(false);
      setVerificationPassword("");
      setViewingPasswordId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ avatar_url: '', password: '', email: '', team_logo_url: '' });
  };

  const toggleDeleteSelect = (id: string) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllDelete = () => {
    if (selectedForDelete.size === filteredAthletes.length) {
      setSelectedForDelete(new Set());
    } else {
      setSelectedForDelete(new Set(filteredAthletes.map((a) => a.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedForDelete.size === 0) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedForDelete);
      const { error } = await supabase
        .from('athletes')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast.success(`${ids.length} athlete(s) deleted successfully`);
      setSelectedForDelete(new Set());
      setShowDeleteConfirm(false);
      fetchAthletes();
    } catch (error: any) {
      console.error('Error deleting athletes:', error);
      toast.error("Failed to delete athletes: " + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const sendConsentEmail = async (athlete: Athlete) => {
    if (!athlete.email) {
      toast.error("Athlete must have an email address before sending consent");
      return;
    }
    if (!athlete.consent_token) {
      toast.error("No consent token found for this athlete");
      return;
    }
    if (!athlete.password_hash) {
      toast.error("Athlete must have a password set before sending consent");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: orgProfile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      const { data: team } = await supabase
        .from('teams')
        .select('name, logo_url')
        .eq('id', orgProfile?.team_id || '')
        .single();

      const siteUrl = window.location.origin;
      const consentUrl = `${siteUrl}/consent?token=${athlete.consent_token}`;

      const { data, error } = await supabase.functions.invoke('send-pingram-email', {
        body: {
          templateId: 'send_consent_email',
          type: 'email_compose_preview',
          to: { email: athlete.email, id: athlete.email },
          parameters: {
            athlete_name: athlete.name,
            athlete_email: athlete.email,
            organisation_name: team?.name || 'Your Organisation',
            organisation_logo: team?.logo_url || `${siteUrl}/nexushub-logo.svg`,
            login_password: athlete.password_hash,
            consent_url: consentUrl,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Consent email sent to ${athlete.email}`);
    } catch (err: any) {
      console.error('Error sending consent email:', err);
      toast.error("Failed to send consent email: " + (err.message || "Unknown error"));
    }
  };

  if (loading) {
    return <div className="p-4">Loading athlete credentials...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="w-6 h-6" />
          Athlete Credentials Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Create Athlete Accounts:</strong> Add email and password to create a client account. 
              Athletes will receive login credentials via email and can access the patient portal at /auth → Athlete/Patient.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search athletes by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Button
              onClick={() => setShowAddDialog(true)}
              size="sm"
              className="ml-auto flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Athlete
            </Button>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              size="sm"
              variant="destructive"
              disabled={selectedForDelete.size === 0}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedForDelete.size})
            </Button>
            <Button
              variant={sendSignupEmails ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const newValue = !sendSignupEmails;
                setSendSignupEmails(newValue);
                localStorage.setItem('sendSignupEmails', JSON.stringify(newValue));
              }}
              className="flex items-center gap-2"
            >
              {sendSignupEmails ? (
                <>
                  <Mail className="w-4 h-4" />
                  Email On
                </>
              ) : (
                <>
                  <MailX className="w-4 h-4" />
                  Email Off
                </>
              )}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedForDelete.size === filteredAthletes.length && filteredAthletes.length > 0}
                    onCheckedChange={toggleAllDelete}
                  />
                </TableHead>
                <TableHead>Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Team Name</TableHead>
                <TableHead>Team Logo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Height (cm)</TableHead>
                <TableHead>Consent Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAthletes.map((athlete) => (
                <TableRow key={athlete.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedForDelete.has(athlete.id)}
                      onCheckedChange={() => toggleDeleteSelect(athlete.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {editingId === athlete.id ? (
                      <div className="space-y-2">
                        <Avatar>
                          <AvatarImage src={editForm.avatar_url} />
                          <AvatarFallback>
                            {athlete.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {canEditAvatar ? (
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarFileChange}
                              className="hidden"
                              id={`avatar-upload-${athlete.id}`}
                            />
                            <Label 
                              htmlFor={`avatar-upload-${athlete.id}`}
                              className="flex items-center justify-center gap-1 px-2 py-1 text-xs cursor-pointer bg-gray-100 hover:bg-gray-200 border rounded-md transition-colors"
                            >
                              <Upload className="w-3 h-3" />
                              Upload
                            </Label>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 text-center">
                            Permission required
                          </div>
                        )}
                      </div>
                    ) : (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Avatar className="cursor-pointer">
                            <AvatarImage src={athlete.avatar_url} />
                            <AvatarFallback>
                              {athlete.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-auto p-2">
                          {athlete.avatar_url ? (
                            <img 
                              src={athlete.avatar_url} 
                              alt={athlete.name}
                              className="w-32 h-32 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center text-2xl font-semibold">
                              {athlete.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{athlete.name}</TableCell>
                  <TableCell>{athlete.team_name || 'No Team'}</TableCell>
                  <TableCell>
                    {editingId === athlete.id ? (
                      <div className="space-y-2">
                        <Avatar>
                          <AvatarImage src={editForm.team_logo_url} />
                          <AvatarFallback>
                            {athlete.team_name?.substring(0, 2)?.toUpperCase() || 'TM'}
                          </AvatarFallback>
                        </Avatar>
                        {canEditAvatar ? (
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleTeamLogoFileChange}
                              className="hidden"
                              id={`team-logo-upload-${athlete.id}`}
                            />
                            <Label 
                              htmlFor={`team-logo-upload-${athlete.id}`}
                              className="flex items-center justify-center gap-1 px-2 py-1 text-xs cursor-pointer bg-gray-100 hover:bg-gray-200 border rounded-md transition-colors"
                            >
                              <Upload className="w-3 h-3" />
                              Upload
                            </Label>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 text-center">
                            Permission required
                          </div>
                        )}
                      </div>
                    ) : (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Avatar className="cursor-pointer">
                            <AvatarImage src={athlete.team_logo_url} />
                            <AvatarFallback>
                              {athlete.team_name?.substring(0, 2)?.toUpperCase() || 'TM'}
                            </AvatarFallback>
                          </Avatar>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-auto p-2">
                          {athlete.team_logo_url ? (
                            <img 
                              src={athlete.team_logo_url} 
                              alt={athlete.team_name || 'Team Logo'}
                              className="w-32 h-32 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center text-2xl font-semibold">
                              {athlete.team_name?.substring(0, 2)?.toUpperCase() || 'TM'}
                            </div>
                          )}
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === athlete.id ? (
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="text-xs"
                      />
                    ) : (
                      athlete.email || 'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {athlete.password_hash ? (
                      <div className="flex items-center gap-2">
                        {revealedPasswords[athlete.id] ? (
                          <span className="text-xs font-mono">{revealedPasswords[athlete.id]}</span>
                        ) : (
                          <span className="text-xs">••••••••</span>
                        )}
                        <Button
                          onClick={() => {
                            if (revealedPasswords[athlete.id]) {
                              // Hide password if already revealed
                              setRevealedPasswords(prev => {
                                const updated = { ...prev };
                                delete updated[athlete.id];
                                return updated;
                              });
                            } else {
                              // Show verification modal to reveal password
                              handleViewPassword(athlete.id);
                            }
                          }}
                          size="sm"
                          variant="ghost"
                          className="p-1 h-6 w-6"
                        >
                          {revealedPasswords[athlete.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">No password</span>
                    )}
                  </TableCell>
                  <TableCell>{athlete.age || 'N/A'}</TableCell>
                  <TableCell>{athlete.gender || 'N/A'}</TableCell>
                  <TableCell>{athlete.weight_kg || 'N/A'}</TableCell>
                  <TableCell>{athlete.height_cm || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {athlete.consent_status === 'confirmed' ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Confirmed
                        </Badge>
                      ) : athlete.consent_status === 'declined' ? (
                        <Badge variant="destructive">
                          Declined
                        </Badge>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                          {athlete.email && athlete.password_hash && (
                            <Button
                              onClick={() => sendConsentEmail(athlete)}
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs px-2"
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              Send Consent
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingId === athlete.id ? (
                       <div className="space-y-2">
                         <div className="flex gap-1">
                           <Input
                             type="password"
                             placeholder="Password"
                             value={editForm.password}
                             onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                             className="text-xs flex-1"
                           />
                           <Button
                             onClick={() => setEditForm({ ...editForm, password: generateSafePassword() })}
                             size="sm"
                             variant="outline"
                             className="px-2"
                           >
                             <RefreshCw className="w-3 h-3" />
                           </Button>
                         </div>
                         <div className="flex gap-1">
                           <Button onClick={handleSave} size="sm" className="flex-1">
                             <Save className="w-3 h-3 mr-1" />
                             Save
                           </Button>
                           <Button onClick={handleCancel} size="sm" variant="outline" className="flex-1">
                             <X className="w-3 h-3 mr-1" />
                             Cancel
                           </Button>
                         </div>
                       </div>
                    ) : (
                      <Button
                        onClick={() => handleEdit(athlete)}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAthletes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No athletes found. Try adjusting your search.
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Your Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please enter your password to view the athlete's password.
            </p>
            <div className="relative">
              <Input
                type={showVerificationPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={verificationPassword}
                onChange={(e) => setVerificationPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerificationSubmit();
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowVerificationPassword(!showVerificationPassword)}
              >
                {showVerificationPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationPassword("");
                  setViewingPasswordId(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleVerificationSubmit}>
                Verify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddAthleteFromApiDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingAthleteIds={athletes.map(a => a.cc_athlete_id)}
        onAthletesAdded={fetchAthletes}
      />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the following athlete{selectedForDelete.size !== 1 ? 's' : ''}? They will be deleted from the <strong>NEXUS HUB</strong> database but <strong>not</strong> from the CC Athletics API.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto space-y-1 py-2">
            {athletes
              .filter((a) => selectedForDelete.has(a.id))
              .map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded bg-muted">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">— {a.team_name || 'No Team'}</span>
                </div>
              ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={deleting}>
              {deleting ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" />Delete {selectedForDelete.size} Athlete{selectedForDelete.size !== 1 ? 's' : ''}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};