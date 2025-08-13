import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ProfileManagement = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Profile Management</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Team & Client Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Team member and client profile management will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};