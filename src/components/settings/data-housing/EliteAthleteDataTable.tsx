import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EliteAthleteData {
  id: string;
  "Team Name": string;
  "Athlete Name": string;
  "Sex": string;
  "Sport": string;
  "Age Group": number;
  "Weight Category (kg)": string;
  "CMJ Jump Height (cm)": number | null;
  "CMJ Peak Power (W)": number | null;
  "CMJ Relative Peak Power (W/kg)": number | null;
  "CMJ Reactive Strength Index": string | null;
  "IMTP Peak Force (N)": number | null;
  "IMTP Relative Peak Force (N/kg)": number | null;
  created_at: string;
}

export const EliteAthleteDataTable = () => {
  const [eliteData, setEliteData] = useState<EliteAthleteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<Partial<EliteAthleteData>>({});

  useEffect(() => {
    fetchEliteData();
  }, []);

  const fetchEliteData = async () => {
    try {
      const { data, error } = await supabase
        .from('Elite Athlete Data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEliteData(data || []);
    } catch (error) {
      console.error('Error fetching elite athlete data:', error);
      toast.error("Failed to load elite athlete data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (athlete: EliteAthleteData) => {
    setEditingId(athlete.id);
    setEditForm(athlete);
  };

  const handleSave = async () => {
    if (!editForm["Team Name"]?.trim() || !editForm["Athlete Name"]?.trim()) {
      toast.error("Team Name and Athlete Name are required");
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('Elite Athlete Data')
          .update({
            "Team Name": editForm["Team Name"],
            "Athlete Name": editForm["Athlete Name"],
            "Sex": editForm["Sex"],
            "Sport": editForm["Sport"],
            "Age Group": editForm["Age Group"] ? Number(editForm["Age Group"]) : null,
            "Weight Category (kg)": editForm["Weight Category (kg)"],
            "CMJ Jump Height (cm)": editForm["CMJ Jump Height (cm)"] ? Number(editForm["CMJ Jump Height (cm)"]) : null,
            "CMJ Peak Power (W)": editForm["CMJ Peak Power (W)"] ? Number(editForm["CMJ Peak Power (W)"]) : null,
            "CMJ Relative Peak Power (W/kg)": editForm["CMJ Relative Peak Power (W/kg)"] ? Number(editForm["CMJ Relative Peak Power (W/kg)"]) : null,
            "CMJ Reactive Strength Index": editForm["CMJ Reactive Strength Index"],
            "IMTP Peak Force (N)": editForm["IMTP Peak Force (N)"] ? Number(editForm["IMTP Peak Force (N)"]) : null,
            "IMTP Relative Peak Force (N/kg)": editForm["IMTP Relative Peak Force (N/kg)"] ? Number(editForm["IMTP Relative Peak Force (N/kg)"]) : null
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Elite athlete data updated successfully");
      } else {
        // Add new
        const { error } = await supabase
          .from('Elite Athlete Data')
          .insert({
            "Team Name": editForm["Team Name"],
            "Athlete Name": editForm["Athlete Name"],
            "Sex": editForm["Sex"] || '',
            "Sport": editForm["Sport"] || '',
            "Age Group": editForm["Age Group"] ? Number(editForm["Age Group"]) : 0,
            "Weight Category (kg)": editForm["Weight Category (kg)"] || '',
            "CMJ Jump Height (cm)": editForm["CMJ Jump Height (cm)"] ? Number(editForm["CMJ Jump Height (cm)"]) : null,
            "CMJ Peak Power (W)": editForm["CMJ Peak Power (W)"] ? Number(editForm["CMJ Peak Power (W)"]) : null,
            "CMJ Relative Peak Power (W/kg)": editForm["CMJ Relative Peak Power (W/kg)"] ? Number(editForm["CMJ Relative Peak Power (W/kg)"]) : null,
            "CMJ Reactive Strength Index": editForm["CMJ Reactive Strength Index"],
            "IMTP Peak Force (N)": editForm["IMTP Peak Force (N)"] ? Number(editForm["IMTP Peak Force (N)"]) : null,
            "IMTP Relative Peak Force (N/kg)": editForm["IMTP Relative Peak Force (N/kg)"] ? Number(editForm["IMTP Relative Peak Force (N/kg)"]) : null
          });

        if (error) throw error;
        toast.success("Elite athlete data added successfully");
      }

      setEditingId(null);
      setIsAdding(false);
      setEditForm({});
      fetchEliteData();
    } catch (error) {
      console.error('Error saving elite athlete data:', error);
      toast.error("Failed to save elite athlete data");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this elite athlete data?")) return;

    try {
      const { error } = await supabase
        .from('Elite Athlete Data')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Elite athlete data deleted successfully");
      fetchEliteData();
    } catch (error) {
      console.error('Error deleting elite athlete data:', error);
      toast.error("Failed to delete elite athlete data");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({});
  };

  if (loading) {
    return <div className="p-4">Loading elite athlete data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Elite Athlete Data</h3>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
          <Plus className="w-4 h-4 mr-2" />
          Add Elite Athlete
        </Button>
      </div>

      {isAdding && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Team Name *"
              value={editForm["Team Name"] || ''}
              onChange={(e) => setEditForm({ ...editForm, "Team Name": e.target.value })}
            />
            <Input
              placeholder="Athlete Name *"
              value={editForm["Athlete Name"] || ''}
              onChange={(e) => setEditForm({ ...editForm, "Athlete Name": e.target.value })}
            />
            <Input
              placeholder="Sex"
              value={editForm["Sex"] || ''}
              onChange={(e) => setEditForm({ ...editForm, "Sex": e.target.value })}
            />
            <Input
              placeholder="Sport"
              value={editForm["Sport"] || ''}
              onChange={(e) => setEditForm({ ...editForm, "Sport": e.target.value })}
            />
            <Input
              type="number"
              placeholder="Age Group"
              value={editForm["Age Group"] || ''}
              onChange={(e) => setEditForm({ ...editForm, "Age Group": Number(e.target.value) || undefined })}
            />
            <Input
              placeholder="Weight Category (kg)"
              value={editForm["Weight Category (kg)"] || ''}
              onChange={(e) => setEditForm({ ...editForm, "Weight Category (kg)": e.target.value })}
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

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Name</TableHead>
              <TableHead>Athlete Name</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Sport</TableHead>
              <TableHead>Age Group</TableHead>
              <TableHead>Weight Category</TableHead>
              <TableHead>CMJ Height (cm)</TableHead>
              <TableHead>CMJ Power (W)</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eliteData.map((athlete) => (
              <TableRow key={athlete.id}>
                {editingId === athlete.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={editForm["Team Name"] || ''}
                        onChange={(e) => setEditForm({ ...editForm, "Team Name": e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editForm["Athlete Name"] || ''}
                        onChange={(e) => setEditForm({ ...editForm, "Athlete Name": e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editForm["Sex"] || ''}
                        onChange={(e) => setEditForm({ ...editForm, "Sex": e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editForm["Sport"] || ''}
                        onChange={(e) => setEditForm({ ...editForm, "Sport": e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editForm["Age Group"] || ''}
                        onChange={(e) => setEditForm({ ...editForm, "Age Group": Number(e.target.value) || undefined })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editForm["Weight Category (kg)"] || ''}
                        onChange={(e) => setEditForm({ ...editForm, "Weight Category (kg)": e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editForm["CMJ Jump Height (cm)"] || ''}
                        onChange={(e) => setEditForm({ ...editForm, "CMJ Jump Height (cm)": Number(e.target.value) || undefined })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editForm["CMJ Peak Power (W)"] || ''}
                        onChange={(e) => setEditForm({ ...editForm, "CMJ Peak Power (W)": Number(e.target.value) || undefined })}
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
                    <TableCell className="font-medium">{athlete["Team Name"]}</TableCell>
                    <TableCell>{athlete["Athlete Name"]}</TableCell>
                    <TableCell>{athlete["Sex"]}</TableCell>
                    <TableCell>{athlete["Sport"]}</TableCell>
                    <TableCell>{athlete["Age Group"]}</TableCell>
                    <TableCell>{athlete["Weight Category (kg)"]}</TableCell>
                    <TableCell>{athlete["CMJ Jump Height (cm)"] || 'N/A'}</TableCell>
                    <TableCell>{athlete["CMJ Peak Power (W)"] || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleEdit(athlete)} 
                          size="sm" 
                          variant="outline"
                          disabled={isAdding || editingId !== null}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDelete(athlete.id)} 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          disabled={isAdding || editingId !== null}
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
      </div>

      {eliteData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No elite athlete data found. Click "Add Elite Athlete" to create one.
        </div>
      )}
    </div>
  );
};