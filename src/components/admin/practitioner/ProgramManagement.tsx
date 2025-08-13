import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ProgramManagement = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Program Management</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Exercise Programs & CC Athletics Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Exercise program creation and CC Athletics API integration will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};