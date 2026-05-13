import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, Trophy, Award, CalendarClock, CheckCircle2, Crown, TrendingUp,
  Hourglass, X, RefreshCw, Pin, Flame, Target, PartyPopper, MessageSquare,
  FileText,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, isToday, isThisWeek } from 'date-fns';
import { toast } from 'sonner';

// Categories aligned with the athlete app reference: Coach / Updates / Achievements / Action.
const TYPE_META: Record<string, { Icon: any; tone: string; label: string; pinned: boolean; category: string }> = {
  personal_best:       { Icon: Award,        tone: 'positive',  label: 'Personal Best', pinned: true,  category: 'achievements' },
  leader:              { Icon: Crown,        tone: 'positive',  label: 'Leader',        pinned: true,  category: 'achievements' },
  ranking:             { Icon: TrendingUp,   tone: 'info',      label: 'Ranking',       pinned: false, category: 'achievements' },
  streak:              { Icon: Flame,        tone: 'positive',  label: 'Streak',        pinned: true,  category: 'achievements' },
  adherence:           { Icon: Target,       tone: 'positive',  label: 'Adherence',     pinned: false, category: 'achievements' },
  programme_milestone: { Icon: Trophy,       tone: 'positive',  label: 'Milestone',     pinned: true,  category: 'achievements' },
  programme_completed: { Icon: PartyPopper,  tone: 'positive',  label: 'Completed',     pinned: true,  category: 'achievements' },
  retest_due:          { Icon: Hourglass,    tone: 'attention', label: 'Retest Due',    pinned: true,  category: 'action' },
  coach_update:        { Icon: MessageSquare, tone: 'info',     label: 'Coach',         pinned: false, category: 'coach' },
  report_available:    { Icon: FileText,     tone: 'info',      label: 'Report',        pinned: false, category: 'updates' },
  default:             { Icon: Bell,         tone: 'info',      label: 'Update',        pinned: false, category: 'updates' },
};

const toneClass = (tone: string) => {
  switch (tone) {
    case 'positive': return 'border-emerald-500/40 bg-emerald-500/5';
    case 'attention': return 'border-amber-500/40 bg-amber-500/5';
    default: return '';
  }
};

const severityToTone = (s: string) => {
  if (s === 'success') return 'positive';
  if (s === 'warning' || s === 'critical') return 'attention';
  return 'info';
};

interface Notif {
  id: string;
  title: string;
  message: string | null;
  severity: string;
  created_at: string;
  read_at: string | null;
  metadata: any;
}

const CATEGORIES = [
  { key: 'all',          label: 'All' },
  { key: 'coach',        label: 'Coach' },
  { key: 'updates',      label: 'Updates' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'action',       label: 'Action' },
];

export const ClientNotifications = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['client-notifications-feed', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<Notif[]> => {
      const { data } = await supabase
        .from('platform_in_app_notifications')
        .select('id, title, message, severity, created_at, read_at, metadata')
        .eq('recipient_user_id', user!.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(80);
      return (data ?? []) as Notif[];
    },
  });

  const QKEY = ['client-notifications-feed', user?.id] as const;
  const UNREAD_KEY = ['client-unread-notifications', user?.id] as const;

  const markRead = useMutation({
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
      qc.setQueryData<number>(UNREAD_KEY, (c) => Math.max(0, (c ?? 1) - 1));
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(QKEY, ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['client-notifications-feed'] });
      qc.invalidateQueries({ queryKey: ['client-unread-notifications'] });
    },
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
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(QKEY, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['client-notifications-feed'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('platform_in_app_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_user_id', user!.id)
        .is('read_at', null);
    },
    onMutate: async () => {
      const ts = new Date().toISOString();
      const prev = qc.getQueryData<Notif[]>(QKEY);
      qc.setQueryData<Notif[]>(QKEY, (old) => (old ?? []).map((n) => ({ ...n, read_at: n.read_at ?? ts })));
      qc.setQueryData<number>(UNREAD_KEY, 0);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(QKEY, ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['client-notifications-feed'] });
      qc.invalidateQueries({ queryKey: ['client-unread-notifications'] });
    },
  });

  const refresh = async () => {
    setRefreshing(true);
    try {
      const [rank, adh] = await Promise.all([
        supabase.functions.invoke('compute-client-rank-events', { body: {} }),
        supabase.functions.invoke('compute-client-adherence-events', { body: {} }),
      ]);
      if (rank.error) throw rank.error;
      if (adh.error) throw adh.error;
      toast.success('Checked for new updates');
      await qc.invalidateQueries({ queryKey: ['client-notifications-feed'] });
    } catch (e: any) {
      toast.error(e.message ?? 'Could not refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    if (category === 'all') return notifications;
    return notifications.filter((n) => {
      const t = n.metadata?.notification_type ?? 'default';
      const cat = (TYPE_META[t] ?? TYPE_META.default).category;
      return cat === category || t === category;
    });
  }, [notifications, category]);


  const unread = notifications.filter((n) => !n.read_at).length;
  const pinned = filtered.filter((n) => {
    const t = n.metadata?.notification_type ?? 'default';
    return (TYPE_META[t] ?? TYPE_META.default).pinned && !n.read_at;
  });
  const rest = filtered.filter((n) => !pinned.includes(n));

  const grouped = useMemo(() => {
    const today: Notif[] = [];
    const week: Notif[] = [];
    const older: Notif[] = [];
    rest.forEach((n) => {
      const d = new Date(n.created_at);
      if (isToday(d)) today.push(n);
      else if (isThisWeek(d, { weekStartsOn: 1 })) week.push(n);
      else older.push(n);
    });
    return { today, week, older };
  }, [rest]);

  const renderCard = (n: Notif) => {
    const typeKey = n.metadata?.notification_type ?? 'default';
    const meta = TYPE_META[typeKey] ?? TYPE_META.default;
    const tone = meta.tone === 'info' ? severityToTone(n.severity) : meta.tone;
    const iconBg =
      tone === 'positive'
        ? 'bg-emerald-500/15 text-emerald-600'
        : tone === 'attention'
        ? 'bg-amber-500/15 text-amber-600'
        : 'bg-primary/10 text-primary';
    return (
      <Card
        key={n.id}
        className={cn(
          'overflow-hidden transition-all animate-fade-in',
          toneClass(tone),
          !n.read_at && 'shadow-sm',
          n.read_at && 'opacity-70',
        )}
      >
        <CardContent className="p-4 flex items-start gap-3">
          <div className={cn('h-10 w-10 rounded-2xl flex items-center justify-center shrink-0', iconBg)}>
            <meta.Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm leading-tight">{n.title}</span>
              {!n.read_at && (
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-label="unread" />
              )}
            </div>
            {n.message && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {meta.label}
              </span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {!n.read_at && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => markRead.mutate(n.id)}
                disabled={markRead.isPending}
                aria-label="Mark read"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground"
              onClick={() => dismiss.mutate(n.id)}
              disabled={dismiss.isPending}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="px-1">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              Updates
              {unread > 0 && (
                <Badge className="bg-primary text-primary-foreground animate-pop">{unread}</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              PBs, rankings and reminders — fresh as new tests arrive.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            {unread > 0 && (
              <Button size="sm" variant="ghost" onClick={() => markAllRead.mutate()}>
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((c) => (
          <Button
            key={c.key}
            size="sm"
            variant={category === c.key ? 'default' : 'outline'}
            className="rounded-full shrink-0"
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Bell className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium">All caught up</p>
            <p className="text-xs text-muted-foreground mt-1">
              New PBs and ranking changes will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {pinned.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-1">
                <Pin className="h-3 w-3" /> Pinned
              </div>
              <div className="grid gap-2">{pinned.map(renderCard)}</div>
            </section>
          )}

          {(['today', 'week', 'older'] as const).map((bucket) => {
            const items = grouped[bucket];
            if (items.length === 0) return null;
            const label = bucket === 'today' ? 'Today' : bucket === 'week' ? 'This week' : 'Older';
            return (
              <section key={bucket} className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-2 px-1">
                  {bucket === 'older' ? <CalendarClock className="h-3 w-3" /> : <Trophy className="h-3 w-3" />}
                  {label}
                </div>
                <div className="grid gap-2">{items.map(renderCard)}</div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
