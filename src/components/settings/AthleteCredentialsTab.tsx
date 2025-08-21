import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Edit, Save, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  user_id?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  created_at: string;
  updated_at: string;
  status: string;
  tier_id?: string;
}

export const AthleteCredentialsTab = () => {
  const [clients, setClients] = useState<Client[]>([]);
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
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Get current user's team to filter clients by team
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('team_id, role')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile?.team_id) {
        setClients([]);
        return;
      }

      // Fetch clients and their profiles
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name,
            avatar_url,
            role
          )
        `)
        .eq('team_id', currentProfile.team_id)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Format data to include profile info
      const formattedClients = clientsData?.map(client => ({
        ...client,
        email: (client.profiles as any)?.email,
        full_name: (client.profiles as any)?.full_name,
        avatar_url: (client.profiles as any)?.avatar_url,
        role: (client.profiles as any)?.role
      })) || [];

      setClients(formattedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error("Failed to load athlete/patient data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setEditForm({
      email: client.email || '',
      password: '',
      full_name: client.full_name || '',
      avatar_url: client.avatar_url || ''
    });
  };

  const handleSave = async () => {
    if (!editForm.email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!editForm.password.trim() && !editingId) {
      toast.error("Password is required for new clients");
      return;
    }

    try {
      // Get current user's profile to get team info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('team_id, role, full_name')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile?.team_id || !['organisation', 'practitioner'].includes(currentProfile.role)) {
        toast.error("You don't have permission to manage clients");
        return;
      }

      if (editingId) {
        // Update existing client profile
        const client = clients.find(c => c.id === editingId);
        if (client?.user_id) {
          const { error } = await supabase
            .from('profiles')
            .update({
              full_name: editForm.full_name,
              avatar_url: editForm.avatar_url
            })
            .eq('user_id', client.user_id);

          if (error) throw error;
        }
        toast.success("Client updated successfully");
      } else {
        // Create new client via edge function
        const { data, error } = await supabase.functions.invoke('invite-team-member', {
          body: {
            email: editForm.email,
            full_name: editForm.full_name,
            role: 'client',
            team_id: currentProfile.team_id,
            inviter_name: currentProfile.full_name || 'Team Admin'
          }
        });

        if (error) throw error;

        // Create client record
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            user_id: data.user_id,
            team_id: currentProfile.team_id,
            status: 'active'
          });

        if (clientError) throw clientError;

        toast.success(`Client invited! Temporary password: ${data.temporary_password}`);
      }

      setEditingId(null);
      setIsAdding(false);
      setEditForm({ email: '', password: '', full_name: '', avatar_url: '' });
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error("Failed to save client");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Client deleted successfully");
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error("Failed to delete client");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({ email: '', password: '', full_name: '', avatar_url: '' });
  };

  if (loading) {
    return <div className="p-4">Loading athlete/patient credentials...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-6 h-6" />
            Athlete/Patient Credentials Management
          </CardTitle>
          <Button onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
            <Plus className="w-4 h-4 mr-2" />
            Add Athlete/Patient
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-orange-800 text-sm">
              <strong>Note:</strong> This section manages athlete and patient accounts. 
              Team administrators can invite and manage access for individuals receiving care or training.
            </p>
          </div>

          {isAdding && (
            <Card className="p-4 border-2 border-orange-200">
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
                <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
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
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No athletes/patients found. Add new members to get started.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={client.avatar_url} />
                        <AvatarFallback>
                          {client.full_name?.substring(0, 2)?.toUpperCase() || 
                           client.email?.substring(0, 2).toUpperCase() || 'AT'}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>{client.email || 'Not set'}</TableCell>
                    <TableCell>{client.full_name || 'Not set'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        client.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleEdit(client)} 
                          size="sm" 
                          variant="outline"
                          disabled={isAdding || editingId !== null}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDelete(client.id)} 
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