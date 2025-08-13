import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ReportManagement = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Report Management</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Custom Reports & Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Report creation and management interface will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};