import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Image } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Clinic {
  id: string;
  name: string;
  logo_url?: string;
  admin_id: string;
  created_at: string;
  practitioner_count?: number;
}

export const ClinicsManagement = () => {
  const { data: clinics, isLoading } = useQuery({
    queryKey: ['clinics-management'],
    queryFn: async (): Promise<Clinic[]> => {
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          logo_url,
          admin_id,
          created_at
        `);

      if (error) throw error;

      // Get practitioner count for each clinic
      const clinicsWithCounts = await Promise.all(
        (teams || []).map(async (team) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)
            .eq('role', 'practitioner');

          return {
            ...team,
            practitioner_count: count || 0
          };
        })
      );

      return clinicsWithCounts;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clinics Management</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clinics Management</h1>
        <Badge variant="secondary">{clinics?.length || 0} Total Clinics</Badge>
      </div>

      <div className="grid gap-6">
        {clinics?.map((clinic) => (
          <Card key={clinic.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    {clinic.logo_url ? (
                      <img 
                        src={clinic.logo_url} 
                        alt={`${clinic.name} logo`}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{clinic.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(clinic.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {clinic.practitioner_count} Practitioners
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Organisation Name:</span>
                  <span className="text-sm">{clinic.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Logo:</span>
                  <span className="text-sm">
                    {clinic.logo_url ? 'Configured' : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Practitioners:</span>
                  <span className="text-sm">{clinic.practitioner_count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!clinics || clinics.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No clinics found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};