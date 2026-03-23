import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Save, X, Settings, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";

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
  dynamic_metrics?: any;
  created_at: string;
}

interface ExerciseConfig {
  id: string;
  test_name: string;
  metrics: string[];
  created_at: string;
  updated_at: string;
}

// Metric mapping for each test type
const testMetricsMap: Record<string, string[]> = {
  "Countermovement Jump": [
    "Jump Height (cm)",
    "Power/Peak Power (W)",
    "Relative Peak Power (W/kg)",
    "Reactive Strength Index (RSI)"
  ],
  "Squat Jump": [
    "Jump Height (cm)",
    "Average Propulsive Power (W)",
    "Average Rate of Force Development (W)",
    "Take-off Velocity (m/s)"
  ],
  "Drop Jump": [
    "Jump Height (cm)",
    "Reactive Strength Index (RSI)",
    "Flight Time (ms)",
    "Contact Time (ms)"
  ],
  "Pogo Jump": [
    "Jump Height (cm)",
    "Power (W)",
    "Reactive Strength Index (RSI)",
    "Flight Time (ms)"
  ]
};

export const EliteAthleteDataTable = () => {
  const [eliteData, setEliteData] = useState<EliteAthleteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<Partial<EliteAthleteData>>({});
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [selectedTestName, setSelectedTestName] = useState<string>("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [exerciseConfigs, setExerciseConfigs] = useState<ExerciseConfig[]>([]);
  const [editingColumn, setEditingColumn] = useState<{ configId: string; metric: string } | null>(null);
  const [newColumnName, setNewColumnName] = useState<string>("");
  const [isEditDeleteDialogOpen, setIsEditDeleteDialogOpen] = useState(false);
  const [hiddenCMJColumns, setHiddenCMJColumns] = useState<string[]>(() => {
    const stored = localStorage.getItem('hiddenCMJColumns');
    return stored ? JSON.parse(stored) : [];
  });

  // Comparative filter state
  const [filterSport, setFilterSport] = useState<string>("");
  const [filterAgeGroup, setFilterAgeGroup] = useState<string>("");
  const [filterWeightCategory, setFilterWeightCategory] = useState<string>("");

  // Derive filter options from data
  const filterOptions = useMemo(() => {
    const sports = [...new Set(eliteData.map(d => d.Sport).filter(Boolean))].sort();

    const sportFiltered = filterSport
      ? eliteData.filter(d => d.Sport === filterSport)
      : eliteData;

    const ageGroups = [...new Set(
      sportFiltered
        .map(d => d["Age Group"])
        .filter(v => v != null && v !== 0)
    )].sort((a, b) => a - b);

    const ageFiltered = filterAgeGroup
      ? sportFiltered.filter(d => String(d["Age Group"]) === filterAgeGroup)
      : sportFiltered;

    const weightCategories = [...new Set(
      ageFiltered
        .map(d => d["Weight Category (kg)"])
        .filter(v => v != null && v.trim() !== "")
    )].sort();

    return { sports, ageGroups, weightCategories };
  }, [eliteData, filterSport, filterAgeGroup]);

  // Filtered data for display
  const filteredEliteData = useMemo(() => {
    let filtered = eliteData;
    if (filterSport) filtered = filtered.filter(d => d.Sport === filterSport);
    if (filterAgeGroup) filtered = filtered.filter(d => String(d["Age Group"]) === filterAgeGroup);
    if (filterWeightCategory) filtered = filtered.filter(d => d["Weight Category (kg)"] === filterWeightCategory);
    return filtered;
  }, [eliteData, filterSport, filterAgeGroup, filterWeightCategory]);

  const cmjColumns = [
    { id: 'cmj_height', label: 'CMJ Height (cm)', dbColumn: 'CMJ Jump Height (cm)' },
    { id: 'cmj_power', label: 'CMJ Power (W)', dbColumn: 'CMJ Peak Power (W)' }
  ].filter(col => !hiddenCMJColumns.includes(col.id));

  useEffect(() => {
    fetchEliteData();
    fetchExerciseConfigs();
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

  const fetchExerciseConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('elite_exercise_configs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setExerciseConfigs(data || []);
    } catch (error) {
      console.error('Error fetching exercise configs:', error);
      toast.error("Failed to load exercise configurations");
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
            "IMTP Relative Peak Force (N/kg)": editForm["IMTP Relative Peak Force (N/kg)"] ? Number(editForm["IMTP Relative Peak Force (N/kg)"]) : null,
            "dynamic_metrics": editForm.dynamic_metrics || {}
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
            "IMTP Relative Peak Force (N/kg)": editForm["IMTP Relative Peak Force (N/kg)"] ? Number(editForm["IMTP Relative Peak Force (N/kg)"]) : null,
            "dynamic_metrics": editForm.dynamic_metrics || {}
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

  const handleExerciseCancel = () => {
    setIsAddingExercise(false);
    setSelectedTestName("");
    setSelectedMetrics([]);
  };

  const handleExerciseSave = async () => {
    if (!selectedTestName) {
      toast.error("Please select a test name");
      return;
    }
    if (selectedMetrics.length === 0) {
      toast.error("Please select at least one metric");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('elite_exercise_configs')
        .insert({
          test_name: selectedTestName,
          metrics: selectedMetrics
        });

      if (error) throw error;
      toast.success(`Exercise configuration saved: ${selectedTestName}`);
      fetchExerciseConfigs();
      handleExerciseCancel();
    } catch (error) {
      console.error('Error saving exercise config:', error);
      toast.error("Failed to save exercise configuration");
    }
  };

  const handleDeleteColumn = async (configId: string, metric: string, isCMJ: boolean = false) => {
    if (!confirm(`Are you sure you want to delete the column "${metric}"?`)) return;

    try {
      if (isCMJ) {
        // For CMJ columns, just hide them from view
        const updatedHidden = [...hiddenCMJColumns, configId];
        setHiddenCMJColumns(updatedHidden);
        localStorage.setItem('hiddenCMJColumns', JSON.stringify(updatedHidden));
        
        // Dispatch custom event for same-tab updates
        window.dispatchEvent(new Event('hiddenColumnsUpdated'));
        
        toast.success("Column hidden successfully");
        return;
      }

      const config = exerciseConfigs.find(c => c.id === configId);
      if (!config) return;

      const updatedMetrics = config.metrics.filter(m => m !== metric);

      if (updatedMetrics.length === 0) {
        // Delete entire config if no metrics left
        const { error } = await supabase
          .from('elite_exercise_configs')
          .delete()
          .eq('id', configId);

        if (error) throw error;
        toast.success("Exercise configuration deleted");
      } else {
        // Update config with remaining metrics
        const { error } = await supabase
          .from('elite_exercise_configs')
          .update({ metrics: updatedMetrics })
          .eq('id', configId);

        if (error) throw error;
        toast.success("Column deleted successfully");
      }

      fetchExerciseConfigs();
      fetchEliteData();
    } catch (error) {
      console.error('Error deleting column:', error);
      toast.error("Failed to delete column");
    }
  };

  const handleEditColumn = async (configId: string, oldMetric: string, isCMJ: boolean = false) => {
    if (!newColumnName.trim() || newColumnName === oldMetric) {
      setEditingColumn(null);
      setNewColumnName("");
      return;
    }

    if (isCMJ) {
      toast.error("CMJ column names are fixed and cannot be edited");
      setEditingColumn(null);
      setNewColumnName("");
      return;
    }

    try {
      const config = exerciseConfigs.find(c => c.id === configId);
      if (!config) return;

      const updatedMetrics = config.metrics.map(m => m === oldMetric ? newColumnName : m);

      const { error } = await supabase
        .from('elite_exercise_configs')
        .update({ metrics: updatedMetrics })
        .eq('id', configId);

      if (error) throw error;
      toast.success("Column name updated successfully");
      
      setEditingColumn(null);
      setNewColumnName("");
      fetchExerciseConfigs();
    } catch (error) {
      console.error('Error updating column name:', error);
      toast.error("Failed to update column name");
    }
  };

  if (loading) {
    return <div className="p-4">Loading elite athlete data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Elite Athlete Data</h3>
        <div className="flex gap-2">

      {/* Comparative Data Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border bg-muted/50">
        <div className="flex items-center gap-2 mr-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Comparative Filters</span>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Sport</label>
          <Select value={filterSport} onValueChange={(v) => { setFilterSport(v); setFilterAgeGroup(""); setFilterWeightCategory(""); }}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.sports.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Age Group</label>
          <Select value={filterAgeGroup} onValueChange={(v) => { setFilterAgeGroup(v); setFilterWeightCategory(""); }} disabled={filterOptions.ageGroups.length === 0}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All Ages" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.ageGroups.map(a => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Weight Category</label>
          <Select value={filterWeightCategory} onValueChange={setFilterWeightCategory} disabled={filterOptions.weightCategories.length === 0}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All Weights" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.weightCategories.map(w => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(filterSport || filterAgeGroup || filterWeightCategory) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterSport(""); setFilterAgeGroup(""); setFilterWeightCategory(""); }}>
            Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filteredEliteData.length} of {eliteData.length} athletes</span>
      </div>
          <Button onClick={() => setIsAddingExercise(true)} disabled={isAddingExercise || isAdding || !!editingId} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add New Exercise
          </Button>
          <Dialog open={isEditDeleteDialogOpen} onOpenChange={setIsEditDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={isAdding || !!editingId || isAddingExercise}>
                <Settings className="w-4 h-4 mr-2" />
                Edit/Delete Columns
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit or Delete Columns</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 mt-4">
                {/* CMJ Columns */}
                {cmjColumns.map((column) => {
                  const isEditing = editingColumn?.configId === column.id;
                  return (
                    <div key={column.id} className="flex items-center gap-2 bg-muted p-3 rounded border">
                      {isEditing ? (
                        <>
                          <Input
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            placeholder="New column name"
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleEditColumn(column.id, column.label, true)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingColumn(null);
                              setNewColumnName("");
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">{column.label}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingColumn({ configId: column.id, metric: column.label });
                              setNewColumnName(column.label);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteColumn(column.id, column.label, true)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Exercise Config Columns */}
                {exerciseConfigs.map((config) =>
                  config.metrics.map((metric) => {
                    const isEditing = editingColumn?.configId === config.id && editingColumn?.metric === metric;
                    return (
                      <div key={`${config.id}-${metric}`} className="flex items-center gap-2 bg-muted p-3 rounded border">
                        {isEditing ? (
                          <>
                            <Input
                              value={newColumnName}
                              onChange={(e) => setNewColumnName(e.target.value)}
                              placeholder="New column name"
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleEditColumn(config.id, metric, false)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingColumn(null);
                                setNewColumnName("");
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 font-medium">{config.test_name} - {metric}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingColumn({ configId: config.id, metric });
                                setNewColumnName(metric);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteColumn(config.id, metric, false)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId || isAddingExercise}>
            <Plus className="w-4 h-4 mr-2" />
            Add Elite Athlete
          </Button>
        </div>
      </div>


      {isAddingExercise && (
        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
          <h4 className="text-md font-semibold mb-4">Configure New Exercise</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Test Name</label>
              <Select
                value={selectedTestName}
                onValueChange={(value) => {
                  setSelectedTestName(value);
                  setSelectedMetrics([]); // Reset metrics when test changes
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Choose test type..." />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {Object.keys(testMetricsMap).map((testName) => (
                    <SelectItem key={testName} value={testName}>
                      {testName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Select Metrics</label>
              <MultiSelectDropdown
                options={selectedTestName ? testMetricsMap[selectedTestName].map(m => ({ value: m, label: m })) : []}
                value={selectedMetrics}
                onChange={setSelectedMetrics}
                placeholder={selectedTestName ? "Choose metrics..." : "Select test name first"}
                disabled={!selectedTestName}
              />
            </div>
          </div>
          {selectedMetrics.length > 0 && (
            <div className="mt-3 p-3 bg-white rounded border">
              <p className="text-sm font-medium mb-2">Selected Metrics:</p>
              <div className="flex flex-wrap gap-2">
                {selectedMetrics.map((metric) => (
                  <span key={metric} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button onClick={handleExerciseSave} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              Save Exercise
            </Button>
            <Button onClick={handleExerciseCancel} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

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
            <Select
              value={editForm["Sex"] || ''}
              onValueChange={(value) => setEditForm({ ...editForm, "Sex": value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
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
              {!hiddenCMJColumns.includes('cmj_height') && <TableHead>CMJ Height (cm)</TableHead>}
              {!hiddenCMJColumns.includes('cmj_power') && <TableHead>CMJ Power (W)</TableHead>}
              {exerciseConfigs.map((config) => 
                config.metrics.map((metric) => (
                  <TableHead key={`${config.test_name}-${metric}`}>
                    {config.test_name} {metric}
                  </TableHead>
                ))
              )}
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
                      <Select
                        value={editForm["Sex"] || ''}
                        onValueChange={(value) => setEditForm({ ...editForm, "Sex": value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sex" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
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
                    {!hiddenCMJColumns.includes('cmj_height') && (
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm["CMJ Jump Height (cm)"] || ''}
                          onChange={(e) => setEditForm({ ...editForm, "CMJ Jump Height (cm)": Number(e.target.value) || undefined })}
                        />
                      </TableCell>
                    )}
                    {!hiddenCMJColumns.includes('cmj_power') && (
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm["CMJ Peak Power (W)"] || ''}
                          onChange={(e) => setEditForm({ ...editForm, "CMJ Peak Power (W)": Number(e.target.value) || undefined })}
                        />
                      </TableCell>
                    )}
                    {exerciseConfigs.map((config) => 
                      config.metrics.map((metric) => (
                        <TableCell key={`edit-${config.test_name}-${metric}`}>
                          <Input
                            type="number"
                            value={editForm.dynamic_metrics?.[`${config.test_name}-${metric}`] || ''}
                            onChange={(e) => setEditForm({ 
                              ...editForm, 
                              dynamic_metrics: {
                                ...editForm.dynamic_metrics,
                                [`${config.test_name}-${metric}`]: e.target.value ? Number(e.target.value) : null
                              }
                            })}
                          />
                        </TableCell>
                      ))
                    )}
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
                    {!hiddenCMJColumns.includes('cmj_height') && <TableCell>{athlete["CMJ Jump Height (cm)"] || 'N/A'}</TableCell>}
                    {!hiddenCMJColumns.includes('cmj_power') && <TableCell>{athlete["CMJ Peak Power (W)"] || 'N/A'}</TableCell>}
                    {exerciseConfigs.map((config) => 
                      config.metrics.map((metric) => (
                        <TableCell key={`view-${athlete.id}-${config.test_name}-${metric}`}>
                          {athlete.dynamic_metrics?.[`${config.test_name}-${metric}`] || 'N/A'}
                        </TableCell>
                      ))
                    )}
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