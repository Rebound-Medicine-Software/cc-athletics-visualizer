import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, Edit, Save, X, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Athlete {
  id: string;
  name: string;
  cc_athlete_id: string;
  team_id?: string;
  age?: number;
  gender?: string;
  weight_kg?: number;
  height_cm?: number;
  created_at: string;
}

export const AthleteCredentialsTab = () => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    avatar_url: '',
    password: ''
  });

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
      // In a real implementation, this would update athlete credentials
      // For now, we'll show a placeholder message
      toast.info("Athlete credential updates require additional authentication setup");
      
      setEditingId(null);
      setEditForm({ avatar_url: '', password: '' });
    } catch (error) {
      console.error('Error updating athlete:', error);
      toast.error("Failed to update athlete credentials");
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
                        <Input
                          placeholder="Avatar URL"
                          value={editForm.avatar_url}
                          onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                          className="text-xs"
                        />
                      </div>
                    ) : (
                      <Avatar>
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