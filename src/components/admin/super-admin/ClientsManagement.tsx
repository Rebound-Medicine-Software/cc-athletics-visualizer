import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, User, Calendar, Building2 } from 'lucide-react';
import { useSupabaseData } from '@/hooks/useSupabaseData';

interface Athlete {
  name: string;
  sex?: string;
  team_name: string;
  test_count: number;
  latest_test?: Date;
}

export const ClientsManagement = () => {
  const { data: ccData, isLoading, error } = useSupabaseData();

  // Extract unique athletes from CC Athletics data
  const athletes = React.useMemo(() => {
    if (!ccData) return [];
    
    const athleteMap = new Map<string, Athlete>();
    
    ccData.forEach(record => {
      const key = `${record.athlete_name}-${record.team_name}`;
      
      if (!athleteMap.has(key)) {
        // Try to extract sex/gender from various possible locations in the data
        let sex = undefined;
        if (record.metrics && typeof record.metrics === 'object') {
          sex = (record.metrics as any)?.sex || (record.metrics as any)?.gender;
        }
        
        athleteMap.set(key, {
          name: record.athlete_name,
          sex: sex,
          team_name: record.team_name,
          test_count: 0,
          latest_test: undefined
        });
      }
      
      const athlete = athleteMap.get(key)!;
      athlete.test_count++;
      
      const testDate = new Date(record.test_date);
      if (!athlete.latest_test || testDate > athlete.latest_test) {
        athlete.latest_test = testDate;
      }
    });

    return Array.from(athleteMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ccData]);

  const maleCount = athletes.filter(a => a.sex?.toLowerCase() === 'male' || a.sex?.toLowerCase() === 'm').length;
  const femaleCount = athletes.filter(a => a.sex?.toLowerCase() === 'female' || a.sex?.toLowerCase() === 'f').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clients Management</h1>
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
        <h1 className="text-2xl font-bold">Clients Management</h1>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">Error loading CC Athletics athlete data</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients Management</h1>
        <div className="flex gap-2">
          <Badge variant="secondary">{athletes.length} Total Athletes</Badge>
          <Badge variant="outline">{maleCount} Male</Badge>
          <Badge variant="outline">{femaleCount} Female</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            CC Athletics Athletes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Athletes extracted from clinic API keys in the CC Athletics system
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {athletes.map((athlete, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {athlete.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{athlete.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className={`w-4 h-4 ${
                          athlete.sex?.toLowerCase() === 'male' || athlete.sex?.toLowerCase() === 'm' 
                            ? 'text-blue-500' 
                            : athlete.sex?.toLowerCase() === 'female' || athlete.sex?.toLowerCase() === 'f'
                            ? 'text-pink-500'
                            : 'text-muted-foreground'
                        }`} />
                        {athlete.sex || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {athlete.team_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {athlete.test_count} tests
                      </div>
                      {athlete.latest_test && (
                        <span>Latest: {athlete.latest_test.toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
            ))}
          </div>

          {athletes.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No CC Athletics athletes found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Athletes will appear here once clinic API keys are configured and data is synced
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};