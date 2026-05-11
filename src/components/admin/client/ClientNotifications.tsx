import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Trophy, Award, CalendarClock, FileText, Dumbbell, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';
import { useClientMetrics, useClientRankings } from './useClientMetrics';
import { formatDistanceToNow } from 'date-fns';

const iconForSeverity = (sev: string) => {
  switch (sev) {
    case 'success':
      return CheckCircle2;
    case 'warning':
      return CalendarClock;
    default:
      return Bell;
  }
};

interface DerivedCard {
  id: string;
  title: string;
  body: string;
  Icon: any;
  tone: 'positive' | 'attention' | 'info';
}

export const ClientNotifications = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: athlete } = useClientAthlete();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['client-notifications-feed', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_in_app_notifications')
        .select('id, title, message, severity, created_at, read_at')
        .eq('recipient_user_id', user!.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(40);
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('platform_in_app_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-notifications-feed'] }),
  });

  const { data: metrics } = useClientMetrics({
    athleteId: athlete?.id ?? null,
    athleteName: athlete?.name ?? null,
    teamName: null,
  });
  const { data: rankings } = useClientRankings({
    athleteId: athlete?.id ?? null,
    athleteName: athlete?.name ?? null,
    teamName: null,
  });

  // Derived performance cards (frontend-only, anonymised)
  const derived: DerivedCard[] = [];
  (metrics ?? []).forEach((m) => {
    if (m.isImprovement === true && m.changePct != null && m.changePct >= 5) {
      derived.push({
        id: `pb-${m.spec.short}`,
        title: `New personal best — ${m.spec.label}`,
        body: `You're up ${m.changePct.toFixed(1)}% since your baseline. Keep it going!`,
        Icon: Award,
        tone: 'positive',
      });
    }
  });
  (rankings ?? []).forEach((r) => {
    if (r.scope === 'club' && r.rank && r.rank > 1 && r.beatenBy > 0) {
      derived.push({
        id: `rank-${r.spec.short}-${r.scope}`,
        title: `Someone in ${r.scopeLabel} beat your ${r.spec.label}`,
        body: `You're now ranked #${r.rank} of ${r.totalAthletes} — ${r.beatenBy} ahead.`,
        Icon: Trophy,
        tone: 'attention',
      });
    } else if (r.scope === 'club' && r.rank === 1) {
      derived.push({
        id: `lead-${r.spec.short}-${r.scope}`,
        title: `You lead ${r.scopeLabel} in ${r.spec.label}`,
        body: `#1 of ${r.totalAthletes}. Keep that crown.`,
        Icon: Trophy,
        tone: 'positive',
      });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Updates from your coach, your programme and how you're stacking up.
        </p>
      </div>

      {derived.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {derived.map((d) => (
            <Card key={d.id} className={
              d.tone === 'positive'
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : d.tone === 'attention'
                ? 'border-amber-500/40 bg-amber-500/5'
                : ''
            }>
              <CardContent className="p-4 flex items-start gap-3">
                <d.Icon className="h-5 w-5 mt-0.5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{d.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{d.body}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet — you're all caught up.</p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n: any) => {
                const Icon = iconForSeverity(n.severity);
                return (
                  <li key={n.id} className="py-3 flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{n.title}</span>
                        {!n.read_at && <Badge variant="default" className="text-[10px]">New</Badge>}
                      </div>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markRead.mutate(n.id)}
                        disabled={markRead.isPending}
                      >
                        Mark read
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
