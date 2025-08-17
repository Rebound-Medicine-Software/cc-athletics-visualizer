import React from 'react';
import { DashboardCharts } from './DashboardCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export const AnalyticsManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Platform Analytics Dashboard
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comprehensive analytics and reporting for platform engagement and usage
          </p>
        </CardHeader>
        <CardContent>
          <DashboardCharts />
        </CardContent>
      </Card>
    </div>
  );
};