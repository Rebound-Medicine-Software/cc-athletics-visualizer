import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Edit, Save, X, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StaffUser {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
  role_title?: string;
  qualifications?: string;
  created_at: string;
  updated_at: string;
}

export const StaffCredentialsTab = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role_title: '',
    qualifications: '',
    avatar_url: ''
  });
  
  const canEditAvatar = profile?.role === 'organisation' || profile?.role === 'super_admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Get current user's session to filter by team
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get current user's profile to find team_id
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('team_id, role')
        .eq('user_id', session.user.id)
        .single();

      if (!currentProfile) {
        console.log('No profile found for current user');
        setUsers([]);
        return;
      }

      // If no team_id, show empty list (new accounts might not have team setup yet)
      if (!currentProfile.team_id) {
        console.log('User has no team_id set');
        setUsers([]);
        return;
      }

      // Fetch staff users from the same team (including both practitioner and staff roles)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('team_id', currentProfile.team_id)
        .in('role', ['practitioner', 'staff', 'clinician'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to load staff users");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: StaffUser) => {
    setEditingId(user.id);
    setEditForm({
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      role_title: user.role_title || '',
      qualifications: user.qualifications || '',
      avatar_url: user.avatar_url || ''
    });
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

  const handleSave = async () => {
    if (!editForm.email.trim()) {
      toast.error("Email is required");
      return;
    }

    try {
      if (editingId) {
        // Update existing user
        const user = users.find(u => u.id === editingId);
        if (!user) return;

        let avatarUrl = editForm.avatar_url;

        // If there's a new avatar file (data URL), upload it to storage
        if (editForm.avatar_url && editForm.avatar_url.startsWith('data:') && canEditAvatar) {
          try {
            // Convert data URL to blob
            const response = await fetch(editForm.avatar_url);
            const blob = await response.blob();
            
            // Create a unique filename
            const fileName = `${user.id}-${Date.now()}.jpg`;
            
            // Upload to Supabase storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('staff-avatars')
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
              .from('staff-avatars')
              .getPublicUrl(fileName);
            
            avatarUrl = urlData.publicUrl;
          } catch (uploadError) {
            console.error('Failed to upload avatar:', uploadError);
            toast.error("Failed to upload avatar image");
            return;
          }
        }

        // Update staff member record with new avatar URL and other details
        const updateData: any = {
          full_name: editForm.full_name,
          role_title: editForm.role_title,
          qualifications: editForm.qualifications
        };

        if (avatarUrl && avatarUrl !== user.avatar_url) {
          updateData.avatar_url = avatarUrl;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingId);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }

        // Update local state
        setUsers(prev => prev.map(u => 
          u.id === editingId ? { ...u, ...updateData } : u
        ));

        toast.success("Staff member updated successfully");
      } else {
        // Create new user via edge function - existing logic remains the same
        const password = generateStrongPassword();
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session');

        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('user_id', session.user.id)
          .single();

        if (!currentProfile?.team_id) throw new Error('No team associated with account');

        const { data: teamData } = await supabase
          .from('teams')
          .select('name')
          .eq('id', currentProfile.team_id)
          .single();

        const { data: credentialsData, error: credentialsError } = await supabase.functions.invoke('send-clinician-credentials', {
          body: {
            email: editForm.email,
            full_name: editForm.full_name,
            role_title: editForm.role_title,
            qualifications: editForm.qualifications,
            password: password,
            team_name: teamData?.name || 'Your Team',
            team_id: currentProfile.team_id
          }
        });

        if (credentialsError) {
          console.error('Edge function error:', credentialsError);
          throw credentialsError;
        }

        if (credentialsData?.error) {
          console.error('Edge function returned error:', credentialsData.error);
          throw new Error(credentialsData.error);
        }
        toast.success("Clinician account created and credentials sent");
      }

      setEditingId(null);
      setIsAdding(false);
      setEditForm({ email: '', password: '', full_name: '', role_title: '', qualifications: '', avatar_url: '' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || "Failed to save staff user");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff user?")) return;

    try {
      toast.info("User deletion requires admin implementation");
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error("Failed to delete staff user");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({ email: '', password: '', full_name: '', role_title: '', qualifications: '', avatar_url: '' });
  };

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  if (loading) {
    return <div className="p-4">Loading staff credentials...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Staff Credentials Management
          </CardTitle>
          <Button onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> This section manages authentication credentials for coaches, staff, and therapists. 
              Admin privileges are required to view and modify user accounts.
            </p>
          </div>

          {isAdding && (
            <Card className="p-4 border-2 border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-email">Email *</Label>
                  <Input
                    id="add-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="add-password">Password *</Label>
                  <Input
                    id="add-password"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <Label htmlFor="add-name">Full Name</Label>
                  <Input
                    id="add-name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="add-role">Role</Label>
                  <Input
                    id="add-role"
                    value={editForm.role_title}
                    onChange={(e) => setEditForm({ ...editForm, role_title: e.target.value })}
                    placeholder="e.g., Sports Scientist, Physiotherapist"
                  />
                </div>
                <div>
                  <Label htmlFor="add-qualifications">Qualifications</Label>
                  <Input
                    id="add-qualifications"
                    value={editForm.qualifications}
                    onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                    placeholder="Enter qualifications and certifications"
                  />
                </div>
                <div>
                  <Label htmlFor="add-avatar">Avatar</Label>
                  {canEditAvatar ? (
                    <div className="space-y-2">
                      {editForm.avatar_url && (
                        <Avatar>
                          <AvatarImage src={editForm.avatar_url} />
                          <AvatarFallback>Preview</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                          id="add-avatar-upload"
                        />
                        <Label 
                          htmlFor="add-avatar-upload"
                          className="flex items-center justify-center gap-2 px-3 py-2 text-sm cursor-pointer bg-gray-100 hover:bg-gray-200 border rounded-md transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Avatar
                        </Label>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 border rounded-md p-3 bg-gray-50">
                      Permission required to upload avatars
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avatar</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Qualifications</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No staff users found. Add practitioners from the setup process or create them here.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {editingId === user.id ? (
                        <div className="space-y-2">
                          <Avatar>
                            <AvatarImage src={editForm.avatar_url} />
                            <AvatarFallback>
                              {user.full_name?.substring(0, 2)?.toUpperCase() || 
                               user.email.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {canEditAvatar ? (
                            <div className="relative">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarFileChange}
                                className="hidden"
                                id={`avatar-upload-${user.id}`}
                              />
                              <Label 
                                htmlFor={`avatar-upload-${user.id}`}
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
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.full_name?.substring(0, 2)?.toUpperCase() || 
                             user.email.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <Input
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="text-sm"
                        />
                      ) : (
                        user.email
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <Input
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          placeholder="Full name"
                          className="text-sm"
                        />
                      ) : (
                        user.full_name || 'Not set'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <Input
                          value={editForm.role_title}
                          onChange={(e) => setEditForm({ ...editForm, role_title: e.target.value })}
                          placeholder="Role title"
                          className="text-sm"
                        />
                      ) : (
                        user.role_title || 'Not set'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <Input
                          value={editForm.qualifications}
                          onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                          placeholder="Qualifications"
                          className="text-sm"
                        />
                      ) : (
                        user.qualifications || 'Not set'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <div className="flex gap-1">
                          <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button onClick={handleCancel} size="sm" variant="outline">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleEdit(user)} 
                            size="sm" 
                            variant="outline"
                            disabled={isAdding || editingId !== null}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => handleDelete(user.id)} 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            disabled={isAdding || editingId !== null}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};