import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ClientReports = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">My Reports</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Progress Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Your progress reports and performance summaries will be available here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};