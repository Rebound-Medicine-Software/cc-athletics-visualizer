import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Inbox, CheckCircle2, X, Hourglass, Award, Crown, Trophy, PartyPopper,
  Flame, FileText, UserRound, ArrowRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Notif {
  id: string;
  title: string;
  message: string | null;
  severity: string;
  created_at: string;
  read_at: string | null;
  metadata: any;
  team_id: string | null;
}

const TYPE_ICON: Record<string, any> = {
  retest_request: Hourglass,
  personal_best: Award,
  leader: Crown,
  ranking: Trophy,
  programme_completed: PartyPopper,
  programme_milestone: Trophy,
  streak: Flame,
  adherence: Trophy,
  report_available: FileText,
};

const TYPE_LABEL: Record<string, string> = {
  retest_request: 'Retest requested',
  personal_best: 'Personal best',
  leader: 'Leader',
  ranking: 'Ranking',
  programme_completed: 'Programme done',
  programme_milestone: 'Milestone',
  streak: 'Streak',
  adherence: 'Adherence',
  report_available: 'Report',
};

/**
 * Practitioner Action Tray — surfaces client engagement events that
 * coaches should react to (retest requests, PBs, milestones).
 *
 * Backed by `platform_in_app_notifications` rows broadcast via the
 * `notify-practitioners-of-client-event` edge function and the
 * `compute-client-*` jobs (source: 'client_event_broadcast').
 */
export const PractitionerActionTray = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const QKEY = ['practitioner-action-tray', user?.id] as const;

  const { data: items = [], isLoading } = useQuery({
    queryKey: QKEY,
    enabled: !!user?.id,
    staleTime: 20_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Notif[]> => {
      const { data } = await supabase
        .from('platform_in_app_notifications')
        .select('id, title, message, severity, created_at, read_at, metadata, team_id')
        .eq('recipient_user_id', user!.id)
        .is('dismissed_at', null)
        .contains('metadata', { source: 'client_event_broadcast' })
        .order('created_at', { ascending: false })
        .limit(25);
      return (data ?? []) as Notif[];
    },
  });

  const handle = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('platform_in_app_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QKEY });
      const prev = qc.getQueryData<Notif[]>(QKEY);
      qc.setQueryData<Notif[]>(QKEY, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(QKEY, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: QKEY }),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('platform_in_app_notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QKEY });
      const prev = qc.getQueryData<Notif[]>(QKEY);
      qc.setQueryData<Notif[]>(QKEY, (old) => (old ?? []).filter((n) => n.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(QKEY, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: QKEY }),
  });

  const open = (n: Notif) => {
    const athleteId = n.metadata?.athlete_id;
    if (n.metadata?.notification_type === 'retest_request') {
      navigate('/dashboard?section=bookings');
    } else if (athleteId) {
      navigate('/settings');
    }
  };

  const unhandled = items.filter((i) => !i.read_at);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          Action tray
          {unhandled.length > 0 && (
            <Badge className="ml-1">{unhandled.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No outstanding client events. You're all caught up.
          </p>
        ) : (
          items.slice(0, 8).map((n) => {
            const t = n.metadata?.notification_type ?? 'default';
            const Icon = TYPE_ICON[t] ?? Inbox;
            const athleteName = n.metadata?.athlete_name as string | undefined;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-md border p-3 ${
                  n.read_at ? 'opacity-70' : 'bg-muted/30'
                }`}
              >
                <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{n.title}</span>
                    <Badge variant="outline" className="text-[10px] h-4">
                      {TYPE_LABEL[t] ?? 'Event'}
                    </Badge>
                    {!n.read_at && <Badge className="text-[10px] h-4">New</Badge>}
                  </div>
                  {athleteName && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <UserRound className="h-3 w-3" /> {athleteName}
                    </div>
                  )}
                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => open(n)}
                    title="Open"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  {!n.read_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => handle.mutate(n.id)}
                      disabled={handle.isPending}
                      title="Mark handled"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => dismiss.mutate(n.id)}
                    disabled={dismiss.isPending}
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
