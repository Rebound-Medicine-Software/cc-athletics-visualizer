import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RegionTesting {
  id?: string;
  "Team Name": string;
  country: string;
  region?: string;
  address?: string;
  logo?: string;
}

export const RegionTestingTable = () => {
  const [regions, setRegions] = useState<RegionTesting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<Partial<RegionTesting>>({});

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('Region Testing')
        .select('*')
        .order('Team Name', { ascending: true });

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
      toast.error("Failed to load region testing data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (region: RegionTesting) => {
    setEditingId(region.id || '');
    setEditForm(region);
  };

  const handleSave = async () => {
    if (!editForm["Team Name"]?.trim() || !editForm.country?.trim()) {
      toast.error("Team Name and Country are required");
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('Region Testing')
          .update({
            "Team Name": editForm["Team Name"],
            country: editForm.country,
            region: editForm.region,
            address: editForm.address,
            logo: editForm.logo
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Region testing data updated successfully");
      } else {
        // Add new
        const { error } = await supabase
          .from('Region Testing')
          .insert({
            "Team Name": editForm["Team Name"],
            country: editForm.country,
            region: editForm.region,
            address: editForm.address,
            logo: editForm.logo
          });

        if (error) throw error;
        toast.success("Region testing data added successfully");
      }

      setEditingId(null);
      setIsAdding(false);
      setEditForm({});
      fetchRegions();
    } catch (error) {
      console.error('Error saving region:', error);
      toast.error("Failed to save region testing data");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this region testing data?")) return;

    try {
      const { error } = await supabase
        .from('Region Testing')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Region testing data deleted successfully");
      fetchRegions();
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error("Failed to delete region testing data");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({});
  };

  if (loading) {
    return <div className="p-4">Loading region testing data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Region Testing Data</h3>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
          <Plus className="w-4 h-4 mr-2" />
          Add Region
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
              placeholder="Country *"
              value={editForm.country || ''}
              onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
            />
            <Input
              placeholder="Region"
              value={editForm.region || ''}
              onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
            />
            <Input
              placeholder="Address"
              value={editForm.address || ''}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="md:col-span-2"
            />
            <Input
              placeholder="Logo URL"
              value={editForm.logo || ''}
              onChange={(e) => setEditForm({ ...editForm, logo: e.target.value })}
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
            <TableHead>Team Name</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Logo URL</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {regions.map((region) => (
            <TableRow key={region.id}>
              {editingId === region.id ? (
                <>
                  <TableCell>
                    <Input
                      value={editForm["Team Name"] || ''}
                      onChange={(e) => setEditForm({ ...editForm, "Team Name": e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editForm.country || ''}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editForm.region || ''}
                      onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editForm.address || ''}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editForm.logo || ''}
                      onChange={(e) => setEditForm({ ...editForm, logo: e.target.value })}
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
                  <TableCell className="font-medium">{region["Team Name"]}</TableCell>
                  <TableCell>{region.country}</TableCell>
                  <TableCell>{region.region || 'N/A'}</TableCell>
                  <TableCell>{region.address || 'N/A'}</TableCell>
                  <TableCell>
                    {region.logo ? (
                      <a href={region.logo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View Logo
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleEdit(region)} 
                        size="sm" 
                        variant="outline"
                        disabled={isAdding || editingId !== null}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={() => handleDelete(region.id!)} 
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

      {regions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No region testing data found. Click "Add Region" to create one.
        </div>
      )}
    </div>
  );
};