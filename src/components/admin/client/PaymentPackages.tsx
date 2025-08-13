import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check } from 'lucide-react';

export const PaymentPackages = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Payment Packages</h2>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Basic
              <Badge variant="outline">$29/mo</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />View Analytics</li>
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />4 Bookings/month</li>
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />Basic Reports</li>
            </ul>
            <Button className="w-full mt-4" variant="outline">
              Current Plan
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Premium
              <Badge>$59/mo</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />Everything in Basic</li>
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />Edit Programming</li>
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />Export Reports</li>
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />8 Bookings/month</li>
            </ul>
            <Button className="w-full mt-4">
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Elite
              <Badge variant="secondary">$99/mo</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />Everything in Premium</li>
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />Adjust Sets/Reps</li>
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />20 Bookings/month</li>
              <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-success" />Priority Support</li>
            </ul>
            <Button className="w-full mt-4" variant="outline">
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Your billing history and payment methods will be managed here via Stripe integration.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};