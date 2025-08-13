import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Clock, CheckCircle } from 'lucide-react';

export const SupportCenter = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Support Center</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4h</div>
            <p className="text-xs text-muted-foreground">Target: &lt;4h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+3 from yesterday</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-sm">Elite Performance</p>
                    <p className="text-xs text-muted-foreground">John Smith</p>
                  </div>
                  <Badge variant="secondary">New</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Having trouble with data sync from our force plates...
                </p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-muted-foreground">2 hours ago</span>
                  <Button size="sm" variant="outline">Reply</Button>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-sm">FitPro Clinic</p>
                    <p className="text-xs text-muted-foreground">Sarah Johnson</p>
                  </div>
                  <Badge variant="outline">In Progress</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Can you help me set up team branding colors?
                </p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-muted-foreground">5 hours ago</span>
                  <Button size="sm" variant="outline">Reply</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea 
                placeholder="Type your response here..."
                className="min-h-[150px]"
              />
              <div className="flex justify-between">
                <Button variant="outline">Save as Template</Button>
                <Button>Send Response</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};