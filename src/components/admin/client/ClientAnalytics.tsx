import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ClientAnalytics = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">My Analytics</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Your personal performance analytics will be displayed here based on your tier permissions.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};