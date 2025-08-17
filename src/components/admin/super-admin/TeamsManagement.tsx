import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Building2 } from 'lucide-react';
import { useSupabaseData } from '@/hooks/useSupabaseData';

export const TeamsManagement = () => {
  const { data: ccData, isLoading, error } = useSupabaseData();

  // Extract unique teams from CC Athletics data
  const teams = React.useMemo(() => {
    if (!ccData) return [];
    
    const teamMap = new Map();
    
    ccData.forEach(record => {
      if (record.team_name && !teamMap.has(record.team_name)) {
        teamMap.set(record.team_name, {
          name: record.team_name,
          athlete_count: 0,
          latest_test: null as Date | null
        });
      }
    });

    // Count athletes and find latest test for each team
    ccData.forEach(record => {
      if (record.team_name && teamMap.has(record.team_name)) {
        const team = teamMap.get(record.team_name);
        team.athlete_count++;
        
        const testDate = new Date(record.test_date);
        if (!team.latest_test || testDate > team.latest_test) {
          team.latest_test = testDate;
        }
      }
    });

    return Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ccData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Teams Management</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Teams Management</h1>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">Error loading CC Athletics team data</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams Management</h1>
        <Badge variant="secondary">{teams.length} CC Athletics Teams</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            CC Athletics Teams
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Teams extracted from clinic API keys in the CC Athletics system
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {teams.map((team, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{team.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {team.athlete_count} athletes
                      </div>
                      {team.latest_test && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Latest test: {team.latest_test.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
            ))}
          </div>

          {teams.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No CC Athletics teams found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Teams will appear here once clinic API keys are configured and data is synced
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};