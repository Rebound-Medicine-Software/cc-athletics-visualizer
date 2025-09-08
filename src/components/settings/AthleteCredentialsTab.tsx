import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserCheck, Edit, Save, X, Search, Upload, RefreshCw, Eye, EyeOff, Mail, MailX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Athlete {
  id: string;
  name: string;
  cc_athlete_id: string;
  team_id?: string;
  age?: number;
  gender?: string;
  weight_kg?: number;
  height_cm?: number;
  avatar_url?: string;
  email?: string;
  password_hash?: string;
  created_at: string;
  team_name?: string;
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
    email: ''
  });
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState("");
  const [viewingPasswordId, setViewingPasswordId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [showVerificationPassword, setShowVerificationPassword] = useState(false);
  const [sendSignupEmails, setSendSignupEmails] = useState(true);
  
  const canEditAvatar = profile?.role === 'organisation' || profile?.role === 'super_admin';

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
      
      // Map the athletes data to include team_name from CC Athletics
      const athletesWithTeamNames = data?.map(athlete => {
        const ccAthlete = ccAthletes.find(cc => cc.athlete_id === athlete.cc_athlete_id);
        return {
          ...athlete,
          team_name: ccAthlete?.team_name || 'No Team'
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
      email: athlete.email || ''
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

  const createAthleteAccount = async (athlete: Athlete, email: string, password: string) => {
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
          athleteType: 'Athlete'
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
      setEditForm({ avatar_url: '', password: '', email: '' });
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
    setEditForm({ avatar_url: '', password: '', email: '' });
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
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search athletes by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Button
              variant={sendSignupEmails ? "default" : "outline"}
              size="sm"
              onClick={() => setSendSignupEmails(!sendSignupEmails)}
              className="ml-auto flex items-center gap-2"
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
                <TableHead>Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Team Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Height (cm)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAthletes.map((athlete) => (
                <TableRow key={athlete.id}>
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
                      <Avatar>
                        <AvatarImage src={athlete.avatar_url} />
                        <AvatarFallback>
                          {athlete.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{athlete.name}</TableCell>
                  <TableCell>{athlete.team_name || 'No Team'}</TableCell>
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
    </Card>
  );
};