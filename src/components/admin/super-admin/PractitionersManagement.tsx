import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCheck, Mail, Award, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Practitioner {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  team_name?: string;
  created_at: string;
}

export const PractitionersManagement = () => {
  const { data: practitioners, isLoading } = useQuery({
    queryKey: ['practitioners-management'],
    queryFn: async (): Promise<Practitioner[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          role,
          created_at,
          teams (
            name
          )
        `)
        .eq('role', 'practitioner');

      if (error) throw error;

      return (data || []).map(profile => ({
        ...profile,
        team_name: profile.teams?.name
      }));
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Practitioners Management</h1>
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
        <h1 className="text-2xl font-bold">Practitioners Management</h1>
        <Badge variant="secondary">{practitioners?.length || 0} Total Practitioners</Badge>
      </div>

      <div className="grid gap-4">
        {practitioners?.map((practitioner) => (
          <Card key={practitioner.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={practitioner.avatar_url} />
                    <AvatarFallback>
                      {practitioner.full_name?.split(' ').map(n => n[0]).join('') || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{practitioner.full_name || 'Unnamed Practitioner'}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {practitioner.email}
                    </div>
                    {practitioner.team_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        {practitioner.team_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Badge variant="outline" className="capitalize">
                    {practitioner.role}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(practitioner.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Name:</span>
                  <span className="text-sm">{practitioner.full_name || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Role:</span>
                  <span className="text-sm capitalize">{practitioner.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{practitioner.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Qualifications:</span>
                  <span className="text-sm">Not specified</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!practitioners || practitioners.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No practitioners found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};