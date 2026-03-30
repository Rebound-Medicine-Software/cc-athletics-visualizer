import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, RefreshCw, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CCAthlete {
  athlete_id: string;
  name: string;
  team_name: string;
  gender?: string;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
}

interface AddAthleteFromApiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingAthleteIds: string[];
  onAthletesAdded: () => void;
}

export const AddAthleteFromApiDialog = ({
  open,
  onOpenChange,
  existingAthleteIds,
  onAthletesAdded,
}: AddAthleteFromApiDialogProps) => {
  const [ccAthletes, setCcAthletes] = useState<CCAthlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [sexFilter, setSexFilter] = useState<string>("all");
  const [nameFilter, setNameFilter] = useState<string>("all");

  const fetchCCAthletes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-cc-data", {
        method: "GET",
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const map = new Map<string, CCAthlete>();
      const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : undefined;
      data.data?.forEach((record: any) => {
        const id = record.athlete_id;
        if (!map.has(id)) {
          map.set(id, {
            athlete_id: id,
            name: record.athlete_name,
            team_name: record.team_name,
            gender: capitalize(record.gender),
            age: record.age ?? undefined,
            height_cm: record.height_cm ?? undefined,
            weight_kg: record.weight_kg ?? undefined,
          });
        } else {
          // Update demographics if missing from earlier record
          const existing = map.get(id)!;
          if (!existing.age && record.age) existing.age = record.age;
          if (!existing.height_cm && record.height_cm) existing.height_cm = record.height_cm;
          if (!existing.weight_kg && record.weight_kg) existing.weight_kg = record.weight_kg;
        }
      });
      setCcAthletes(Array.from(map.values()));
    } catch (err: any) {
      console.error("Error fetching CC athletes:", err);
      toast.error("Failed to fetch athletes from API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCCAthletes();
      setSelectedIds(new Set());
      setTeamFilter("all");
      setSexFilter("all");
      setNameFilter("all");
    }
  }, [open]);

  // Available athletes (not already in system)
  const availableAthletes = useMemo(
    () => ccAthletes.filter((a) => !existingAthleteIds.includes(a.athlete_id)),
    [ccAthletes, existingAthleteIds]
  );

  // Unique teams
  const teams = useMemo(
    () => [...new Set(availableAthletes.map((a) => a.team_name))].sort(),
    [availableAthletes]
  );

  // Athletes filtered by team
  const teamFiltered = useMemo(
    () => teamFilter === "all" ? availableAthletes : availableAthletes.filter((a) => a.team_name === teamFilter),
    [availableAthletes, teamFilter]
  );

  // Unique sexes from team-filtered
  const sexes = useMemo(
    () => [...new Set(teamFiltered.map((a) => a.gender || "Unknown"))].sort(),
    [teamFiltered]
  );

  // Athletes filtered by team + sex
  const sexFiltered = useMemo(
    () => sexFilter === "all" ? teamFiltered : teamFiltered.filter((a) => (a.gender || "Unknown") === sexFilter),
    [teamFiltered, sexFilter]
  );

  // Unique names from team+sex filtered
  const names = useMemo(
    () => [...new Set(sexFiltered.map((a) => a.name))].sort(),
    [sexFiltered]
  );

  // Final filtered list
  const filteredAthletes = useMemo(
    () => nameFilter === "all" ? sexFiltered : sexFiltered.filter((a) => a.name === nameFilter),
    [sexFiltered, nameFilter]
  );

  // Reset downstream filters on change
  const handleTeamChange = (val: string) => {
    setTeamFilter(val);
    setSexFilter("all");
    setNameFilter("all");
    setSelectedIds(new Set());
  };

  const handleSexChange = (val: string) => {
    setSexFilter(val);
    setNameFilter("all");
    setSelectedIds(new Set());
  };

  const handleNameChange = (val: string) => {
    setNameFilter(val);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredAthletes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAthletes.map((a) => a.athlete_id)));
    }
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setAdding(true);
    try {
      const toInsert = filteredAthletes
        .filter((a) => selectedIds.has(a.athlete_id))
        .map((a) => ({
          cc_athlete_id: a.athlete_id,
          name: a.name,
          gender: a.gender || null,
        }));

      const { error } = await supabase.from("athletes").insert(toInsert);
      if (error) throw error;

      toast.success(`${toInsert.length} athlete(s) added successfully`);
      onAthletesAdded();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error adding athletes:", err);
      toast.error("Failed to add athletes: " + err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Athletes from CC Athletics API
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cascading Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Team Name</label>
              <Select value={teamFilter} onValueChange={handleTeamChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sex</label>
              <Select value={sexFilter} onValueChange={handleSexChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {sexes.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Select value={nameFilter} onValueChange={handleNameChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Athletes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Athletes</SelectItem>
                  {names.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Fetching athletes from API...
            </div>
          ) : filteredAthletes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {availableAthletes.length === 0
                ? "All API athletes are already in your system."
                : "No athletes match the current filters."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === filteredAthletes.length && filteredAthletes.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Sex</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAthletes.map((athlete) => (
                    <TableRow key={athlete.athlete_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(athlete.athlete_id)}
                          onCheckedChange={() => toggleSelect(athlete.athlete_id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{athlete.name}</TableCell>
                      <TableCell>{athlete.team_name}</TableCell>
                      <TableCell>{athlete.gender || "Unknown"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} of {filteredAthletes.length} selected
                </span>
                <Button onClick={handleAdd} disabled={selectedIds.size === 0 || adding}>
                  {adding ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" />Add {selectedIds.size} Athlete{selectedIds.size !== 1 ? "s" : ""}</>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
