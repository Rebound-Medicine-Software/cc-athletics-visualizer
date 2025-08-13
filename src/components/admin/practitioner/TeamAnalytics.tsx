import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TeamAnalytics = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Team Analytics</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Full analytics dashboard will be implemented here with charts and metrics.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};