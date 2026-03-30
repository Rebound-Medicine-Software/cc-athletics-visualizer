import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Save, X, Upload } from "lucide-react";
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
  const [pendingLogoFile, setPendingLogoFile] = useState<string | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    setPendingLogoFile(null);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPendingLogoFile(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (regionId: string): Promise<string | null> => {
    if (!pendingLogoFile || !pendingLogoFile.startsWith('data:')) return null;

    try {
      const response = await fetch(pendingLogoFile);
      const blob = await response.blob();
      const fileName = `region-${regionId}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('athlete-avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('athlete-avatars')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error("Failed to upload logo image");
      return null;
    }
  };

  const handleSave = async () => {
    if (!editForm["Team Name"]?.trim() || !editForm.country?.trim()) {
      toast.error("Team Name and Country are required");
      return;
    }

    try {
      let logoUrl = editForm.logo || null;

      if (editingId) {
        // Upload logo if pending
        if (pendingLogoFile) {
          const uploaded = await uploadLogo(editingId);
          if (uploaded) logoUrl = uploaded;
        }

        const { error } = await supabase
          .from('Region Testing')
          .update({
            "Team Name": editForm["Team Name"],
            country: editForm.country,
            region: editForm.region,
            address: editForm.address,
            logo: logoUrl,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Region testing data updated successfully");
      } else {
        // For new entries, insert first to get an ID, then upload logo
        const { data: inserted, error } = await supabase
          .from('Region Testing')
          .insert({
            "Team Name": editForm["Team Name"],
            country: editForm.country,
            region: editForm.region,
            address: editForm.address,
            logo: null,
          })
          .select('id')
          .single();

        if (error) throw error;

        if (pendingLogoFile && inserted?.id) {
          const uploaded = await uploadLogo(inserted.id);
          if (uploaded) {
            await supabase
              .from('Region Testing')
              .update({ logo: uploaded })
              .eq('id', inserted.id);
          }
        }

        toast.success("Region testing data added successfully");
      }

      setEditingId(null);
      setIsAdding(false);
      setEditForm({});
      setPendingLogoFile(null);
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
    setPendingLogoFile(null);
  };

  const toggleSelectForDelete = (id: string) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForDelete.size === regions.length) {
      setSelectedForDelete(new Set());
    } else {
      setSelectedForDelete(new Set(regions.map(r => r.id!)));
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedForDelete);
    try {
      const { error } = await supabase.from('Region Testing').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} region(s) deleted successfully`);
      setSelectedForDelete(new Set());
      setShowDeleteConfirm(false);
      fetchRegions();
    } catch (error) {
      console.error('Error deleting regions:', error);
      toast.error("Failed to delete regions");
    }
  };

  const selectedRegionNames = regions
    .filter(r => selectedForDelete.has(r.id!))
    .map(r => r["Team Name"]);

  if (loading) {
    return <div className="p-4">Loading region testing data...</div>;
  }

  const logoPreview = pendingLogoFile || editForm.logo;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Region Testing Data</h3>
        <Button onClick={() => { setIsAdding(true); setPendingLogoFile(null); }} disabled={isAdding || !!editingId}>
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
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Logo</label>
              <div className="flex items-center gap-3">
                {logoPreview && (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={logoPreview} alt="Logo preview" />
                    <AvatarFallback>LG</AvatarFallback>
                  </Avatar>
                )}
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted transition-colors">
                  <Upload className="w-4 h-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                </label>
              </div>
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
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Logo</TableHead>
            <TableHead>Team Name</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {regions.map((region) => (
            <TableRow key={region.id}>
              {editingId === region.id ? (
                <>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={pendingLogoFile || editForm.logo || ''} alt="Logo" />
                        <AvatarFallback>{(editForm["Team Name"] || '').slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <label className="cursor-pointer">
                        <Upload className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </TableCell>
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
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={region.logo || ''} alt={region["Team Name"]} />
                      <AvatarFallback>{region["Team Name"].slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{region["Team Name"]}</TableCell>
                  <TableCell>{region.country}</TableCell>
                  <TableCell>{region.region || 'N/A'}</TableCell>
                  <TableCell>{region.address || 'N/A'}</TableCell>
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
        <div className="text-center py-8 text-muted-foreground">
          No region testing data found. Click "Add Region" to create one.
        </div>
      )}
    </div>
  );
};
