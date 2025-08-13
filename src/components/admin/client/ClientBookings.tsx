import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ClientBookings = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">My Bookings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Your scheduled sessions and booking interface will be displayed here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};