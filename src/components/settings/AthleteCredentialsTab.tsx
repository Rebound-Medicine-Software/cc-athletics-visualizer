import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, Edit, Save, X, Search, Upload } from "lucide-react";
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
  created_at: string;
}

export const AthleteCredentialsTab = () => {
  const { profile } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    avatar_url: '',
    password: ''
  });
  
  const canEditAvatar = profile?.role === 'organisation' || profile?.role === 'super_admin';

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAthletes(data || []);
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
      password: ''
    });
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

      // Update athlete record with new avatar URL
      if (avatarUrl && avatarUrl !== athlete.avatar_url) {
        const { error: updateError } = await supabase
          .from('athletes')
          .update({ avatar_url: avatarUrl })
          .eq('id', editingId);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }

        // Update local state
        setAthletes(prev => prev.map(a => 
          a.id === editingId ? { ...a, avatar_url: avatarUrl } : a
        ));
      }

      // Note: Password updates would require additional authentication setup
      if (editForm.password) {
        toast.info("Password updates require additional authentication setup");
      } else {
        toast.success("Athlete avatar updated successfully");
      }
      
      setEditingId(null);
      setEditForm({ avatar_url: '', password: '' });
    } catch (error) {
      console.error('Error updating athlete:', error);
      toast.error("Failed to update athlete credentials");
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && canEditAvatar && editingId) {
      console.log('Avatar file selected:', file.name, 'for athlete ID:', editingId);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setEditForm(prev => ({ ...prev, avatar_url: dataUrl }));
        
        // Auto-save the avatar immediately
        try {
          const athlete = athletes.find(a => a.id === editingId);
          if (!athlete) {
            console.error('Athlete not found for ID:', editingId);
            toast.error("Athlete not found");
            return;
          }

          console.log('Uploading avatar for athlete:', athlete.name, athlete.cc_athlete_id);

          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          // Create a unique filename
          const fileName = `${athlete.id}-${Date.now()}.jpg`;
          console.log('Uploading to storage with filename:', fileName);
          
          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('athlete-avatars')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            toast.error("Failed to upload avatar image: " + uploadError.message);
            return;
          }

          console.log('Storage upload successful:', uploadData);

          // Get the public URL
          const { data: urlData } = supabase.storage
            .from('athlete-avatars')
            .getPublicUrl(fileName);
          
          const avatarUrl = urlData.publicUrl;
          console.log('Generated public URL:', avatarUrl);

          // Update athlete record with new avatar URL
          console.log('Updating athlete database record...');
          const { data: updateData, error: updateError } = await supabase
            .from('athletes')
            .update({ avatar_url: avatarUrl })
            .eq('id', editingId)
            .select();

          if (updateError) {
            console.error('Database update error:', updateError);
            toast.error("Failed to save avatar: " + updateError.message);
            return;
          }

          console.log('Database update successful:', updateData);

          // Update local state
          setAthletes(prev => prev.map(a => 
            a.id === editingId ? { ...a, avatar_url: avatarUrl } : a
          ));

          // Update form state with the permanent URL
          setEditForm(prev => ({ ...prev, avatar_url: avatarUrl }));

          toast.success("Avatar uploaded and saved successfully");
          
          // Auto-exit edit mode since save is complete
          setEditingId(null);
          setEditForm({ avatar_url: '', password: '' });
          
        } catch (uploadError) {
          console.error('Failed to upload avatar:', uploadError);
          toast.error("Failed to upload avatar image: " + (uploadError as Error).message);
        }
      };
      reader.readAsDataURL(file);
    } else {
      if (!canEditAvatar) {
        toast.error("You don't have permission to edit avatars");
      } else if (!editingId) {
        toast.error("Please click edit on an athlete first");
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ avatar_url: '', password: '' });
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
              <strong>Note:</strong> This section allows editing athlete photos and managing athlete login credentials. 
              Password management requires additional security measures.
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
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Athlete ID</TableHead>
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
                  <TableCell>{athlete.cc_athlete_id}</TableCell>
                  <TableCell>{athlete.age || 'N/A'}</TableCell>
                  <TableCell>{athlete.gender || 'N/A'}</TableCell>
                  <TableCell>{athlete.weight_kg || 'N/A'}</TableCell>
                  <TableCell>{athlete.height_cm || 'N/A'}</TableCell>
                  <TableCell>
                    {editingId === athlete.id ? (
                      <div className="space-y-2">
                        <Input
                          type="password"
                          placeholder="New password"
                          value={editForm.password}
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                          className="text-xs"
                        />
                        <div className="flex gap-1">
                          <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button onClick={handleCancel} size="sm" variant="outline">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => handleEdit(athlete)} 
                        size="sm" 
                        variant="outline"
                        disabled={editingId !== null}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAthletes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No athletes found matching your search.' : 'No athletes found.'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};