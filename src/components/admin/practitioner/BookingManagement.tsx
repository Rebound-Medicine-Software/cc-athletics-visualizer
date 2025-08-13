import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const BookingManagement = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Booking Management</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Cal.com Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Calendar integration and booking management will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};