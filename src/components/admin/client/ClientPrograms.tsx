import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ClientPrograms = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">My Programs</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Training Programs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Your assigned training programs and progress tracking will be displayed here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};