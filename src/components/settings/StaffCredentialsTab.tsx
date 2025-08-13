import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Edit, Save, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StaffUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  created_at: string;
  last_sign_in_at?: string;
}

export const StaffCredentialsTab = () => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    password: '',
    full_name: '',
    avatar_url: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Note: This would typically require admin privileges
      // For now, we'll show a placeholder message
      setUsers([]);
      toast.info("Staff credentials management requires admin privileges");
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
      full_name: user.user_metadata.full_name || '',
      avatar_url: user.user_metadata.avatar_url || ''
    });
  };

  const handleSave = async () => {
    if (!editForm.email.trim()) {
      toast.error("Email is required");
      return;
    }

    try {
      if (editingId) {
        // Update existing user
        toast.info("User update functionality requires admin implementation");
      } else {
        // Create new user
        const { data, error } = await supabase.auth.admin.createUser({
          email: editForm.email,
          password: editForm.password,
          user_metadata: {
            full_name: editForm.full_name,
            avatar_url: editForm.avatar_url
          }
        });

        if (error) throw error;
        toast.success("Staff user created successfully");
      }

      setEditingId(null);
      setIsAdding(false);
      setEditForm({ email: '', password: '', full_name: '', avatar_url: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error("Failed to save staff user");
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
    setEditForm({ email: '', password: '', full_name: '', avatar_url: '' });
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
                  <Label htmlFor="add-avatar">Avatar URL</Label>
                  <Input
                    id="add-avatar"
                    value={editForm.avatar_url}
                    onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                    placeholder="Enter avatar image URL"
                  />
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
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No staff users found. Admin privileges required to view user accounts.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={user.user_metadata.avatar_url} />
                        <AvatarFallback>
                          {user.user_metadata.full_name?.substring(0, 2)?.toUpperCase() || 
                           user.email.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.user_metadata.full_name || 'Not set'}</TableCell>
                    <TableCell>
                      {user.last_sign_in_at ? 
                        new Date(user.last_sign_in_at).toLocaleDateString() : 
                        'Never'
                      }
                    </TableCell>
                    <TableCell>
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