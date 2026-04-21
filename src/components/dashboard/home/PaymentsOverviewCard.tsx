import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { HomeMetrics } from "@/hooks/useHomeMetrics";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamCurrency } from "@/hooks/useTeamCurrency";

interface Props {
  metrics?: HomeMetrics;
  isLoading: boolean;
}

export const PaymentsOverviewCard = ({ metrics, isLoading }: Props) => {
  const { profile } = useAuth();
  const { symbol } = useTeamCurrency(profile?.team_id);
  const total = metrics?.payingCustomers ?? 0;
  const revenue = metrics?.totalRevenue ?? 0;
  const annual = revenue * 12;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-amber-600" />
          Payments Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Subscriptions</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <CreditCard className="h-8 w-8 text-amber-500/40" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Revenue (est.)</p>
                <p className="text-2xl font-bold">{symbol}{revenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{symbol}{annual.toFixed(0)}/year projected</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500/40" />
            </div>
            <p className="text-[10px] text-muted-foreground text-center pt-2">
              Based on tier prices × active subscriptions. Connect Stripe for live data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
