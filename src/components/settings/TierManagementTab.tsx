import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Plus, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAsWriteGuard } from "@/lib/impersonation/useViewAsWriteGuard";
import { useToast } from "@/hooks/use-toast";

interface Tier {
  id: string;
  name: string;
  price_monthly: number;
  can_view_analytics: boolean;
  can_edit_programming: boolean;
  can_export_reports: boolean;
  can_adjust_sets_reps: boolean;
  max_bookings_per_month: number;
}

export const TierManagementTab = () => {
  const { profile, isRole } = useAuth();
  const { teamId: effectiveTeamId } = useEffectiveTeamId();
  const guardWrite = useViewAsWriteGuard();
  const { toast } = useToast();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    price_monthly: 0,
    can_view_analytics: false,
    can_edit_programming: false,
    can_export_reports: false,
    can_adjust_sets_reps: false,
    max_bookings_per_month: 0
  });

  useEffect(() => {
    if (effectiveTeamId && profile && (isRole('organisation') || isRole('clinician') || isRole('super_admin'))) {
      fetchTiers();
    }
  }, [profile, effectiveTeamId]);

  const fetchTiers = async () => {
    if (!effectiveTeamId) return;
    try {
      const { data, error } = await supabase
        .from('tiers')
        .select('*')
        .eq('team_id', effectiveTeamId)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error fetching tiers:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load pricing tiers" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tier: Tier) => {
    setEditingTier(tier);
    setEditForm({
      name: tier.name,
      price_monthly: tier.price_monthly,
      can_view_analytics: tier.can_view_analytics,
      can_edit_programming: tier.can_edit_programming,
      can_export_reports: tier.can_export_reports,
      can_adjust_sets_reps: tier.can_adjust_sets_reps,
      max_bookings_per_month: tier.max_bookings_per_month
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    if (guardWrite('Saving tier')) return;
    if (!editingTier) return;

    try {
      const { error } = await supabase
        .from('tiers')
        .update(editForm)
        .eq('id', editingTier.id);

      if (error) throw error;

      toast({ title: "Success", description: "Tier updated successfully" });
      setIsEditModalOpen(false);
      setEditingTier(null);
      fetchTiers();
    } catch (error) {
      console.error('Error updating tier:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update tier" });
    }
  };

  if (!profile || (!isRole('organisation') && !isRole('clinician') && !isRole('super_admin'))) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            This section is only available to practitioners and super admins.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center">Loading pricing tiers...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Tier Management
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure pricing tiers and feature access for your clients
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier Name</TableHead>
                <TableHead>Monthly Price</TableHead>
                <TableHead>Analytics</TableHead>
                <TableHead>Programming</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Adjust Sets/Reps</TableHead>
                <TableHead>Max Bookings</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">{tier.name}</TableCell>
                  <TableCell>${tier.price_monthly}</TableCell>
                  <TableCell>{tier.can_view_analytics ? '✓' : '✗'}</TableCell>
                  <TableCell>{tier.can_edit_programming ? '✓' : '✗'}</TableCell>
                  <TableCell>{tier.can_export_reports ? '✓' : '✗'}</TableCell>
                  <TableCell>{tier.can_adjust_sets_reps ? '✓' : '✗'}</TableCell>
                  <TableCell>{tier.max_bookings_per_month}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tier)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Tier: {editingTier?.name}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tier-name">Tier Name</Label>
                <Input
                  id="tier-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tier-price">Monthly Price ($)</Label>
                <Input
                  id="tier-price"
                  type="number"
                  step="0.01"
                  value={editForm.price_monthly}
                  onChange={(e) => setEditForm(prev => ({ ...prev, price_monthly: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-bookings">Max Bookings per Month</Label>
                <Input
                  id="max-bookings"
                  type="number"
                  value={editForm.max_bookings_per_month}
                  onChange={(e) => setEditForm(prev => ({ ...prev, max_bookings_per_month: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="col-span-2 space-y-4">
                <h4 className="font-medium">Feature Access</h4>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="analytics"
                    checked={editForm.can_view_analytics}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, can_view_analytics: checked }))}
                  />
                  <Label htmlFor="analytics">Can View Analytics</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="programming"
                    checked={editForm.can_edit_programming}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, can_edit_programming: checked }))}
                  />
                  <Label htmlFor="programming">Can Edit Programming</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="reports"
                    checked={editForm.can_export_reports}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, can_export_reports: checked }))}
                  />
                  <Label htmlFor="reports">Can Export Reports</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="adjust-sets"
                    checked={editForm.can_adjust_sets_reps}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, can_adjust_sets_reps: checked }))}
                  />
                  <Label htmlFor="adjust-sets">Can Adjust Sets/Reps</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};