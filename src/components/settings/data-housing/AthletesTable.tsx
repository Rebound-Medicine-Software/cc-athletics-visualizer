import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
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

export const AthletesTable = () => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Athlete>>({});

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

  const handleEdit = (athlete: Athlete) => {
    setEditingId(athlete.id);
    setEditForm(athlete);
  };

  const handleSave = async () => {
    if (!editForm.name?.trim() || !editForm.cc_athlete_id?.trim()) {
      toast.error("Name and Athlete ID are required");
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('athletes')
          .update({
            name: editForm.name,
            cc_athlete_id: editForm.cc_athlete_id,
            age: editForm.age ? Number(editForm.age) : null,
            gender: editForm.gender,
            weight_kg: editForm.weight_kg ? Number(editForm.weight_kg) : null,
            height_cm: editForm.height_cm ? Number(editForm.height_cm) : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Athlete updated successfully");
      } else {
        // Add new
        const { error } = await supabase
          .from('athletes')
          .insert({
            name: editForm.name,
            cc_athlete_id: editForm.cc_athlete_id,
            age: editForm.age ? Number(editForm.age) : null,
            gender: editForm.gender,
            weight_kg: editForm.weight_kg ? Number(editForm.weight_kg) : null,
            height_cm: editForm.height_cm ? Number(editForm.height_cm) : null
          });

        if (error) throw error;
        toast.success("Athlete added successfully");
      }

      setEditingId(null);
      setIsAdding(false);
      setEditForm({});
      fetchAthletes();
    } catch (error) {
      console.error('Error saving athlete:', error);
      toast.error("Failed to save athlete");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this athlete?")) return;

    try {
      const { error } = await supabase
        .from('athletes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Athlete deleted successfully");
      fetchAthletes();
    } catch (error) {
      console.error('Error deleting athlete:', error);
      toast.error("Failed to delete athlete");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({});
  };

  if (loading) {
    return <div className="p-4">Loading athletes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Athletes Data</h3>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
          <Plus className="w-4 h-4 mr-2" />
          Add Athlete
        </Button>
      </div>

      {isAdding && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              placeholder="Name *"
              value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <Input
              placeholder="Athlete ID *"
              value={editForm.cc_athlete_id || ''}
              onChange={(e) => setEditForm({ ...editForm, cc_athlete_id: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Age"
              value={editForm.age || ''}
              onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) || undefined })}
            />
            <Input
              placeholder="Gender"
              value={editForm.gender || ''}
              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Weight (kg)"
              value={editForm.weight_kg || ''}
              onChange={(e) => setEditForm({ ...editForm, weight_kg: Number(e.target.value) || undefined })}
            />
            <Input
              type="number"
              placeholder="Height (cm)"
              value={editForm.height_cm || ''}
              onChange={(e) => setEditForm({ ...editForm, height_cm: Number(e.target.value) || undefined })}
            />
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
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
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
          {athletes.map((athlete) => (
            <TableRow key={athlete.id}>
              {editingId === athlete.id ? (
                <>
                  <TableCell>
                    <Input
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editForm.cc_athlete_id || ''}
                      onChange={(e) => setEditForm({ ...editForm, cc_athlete_id: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editForm.age || ''}
                      onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) || undefined })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editForm.gender || ''}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editForm.weight_kg || ''}
                      onChange={(e) => setEditForm({ ...editForm, weight_kg: Number(e.target.value) || undefined })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editForm.height_cm || ''}
                      onChange={(e) => setEditForm({ ...editForm, height_cm: Number(e.target.value) || undefined })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button onClick={handleCancel} size="sm" variant="outline">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{athlete.name}</TableCell>
                  <TableCell>{athlete.cc_athlete_id}</TableCell>
                  <TableCell>{athlete.age || 'N/A'}</TableCell>
                  <TableCell>{athlete.gender || 'N/A'}</TableCell>
                  <TableCell>{athlete.weight_kg || 'N/A'}</TableCell>
                  <TableCell>{athlete.height_cm || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleEdit(athlete)} 
                        size="sm" 
                        variant="outline"
                        disabled={isAdding || !!editingId}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={() => handleDelete(athlete.id)} 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        disabled={isAdding || !!editingId}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {athletes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No athletes found. Click "Add Athlete" to create one.
        </div>
      )}
    </div>
  );
};