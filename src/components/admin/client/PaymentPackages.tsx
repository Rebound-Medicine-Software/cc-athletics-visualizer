import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, Link2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const PaymentPackages = () => {
  const { toast } = useToast();

  const handleConnectStripe = () => {
    toast({
      title: "Stripe Connect — coming soon",
      description:
        "Live Stripe Connect onboarding has not been enabled by the developer yet. No payments will be taken. Contact reflexsportstherapyy@gmail.com to activate.",
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Payment Packages</h2>

      {/* Stripe Connect — Pay NEXUS HUB */}
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Connect Your Stripe Account
          </CardTitle>
          <CardDescription>
            Link your Stripe account so NEXUS HUB can automatically charge your subscription
            once billing is activated by the platform developer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">
                No payments will be taken yet
              </p>
              <p className="text-amber-800/80 dark:text-amber-300/80">
                Stripe billing has not been finalised by the developer
                (<a
                  href="mailto:reflexsportstherapyy@gmail.com"
                  className="underline hover:no-underline"
                >reflexsportstherapyy@gmail.com</a>).
                Connecting now stores your account reference so charges can begin once enabled.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleConnectStripe} className="flex-1">
              <CreditCard className="w-4 h-4 mr-2" />
              Connect Stripe Account
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('https://dashboard.stripe.com/register', '_blank')}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Create Stripe Account
            </Button>
          </div>
        </CardContent>
      </Card>

      
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