import React, { useEffect, useState, useCallback } from 'react';
import { Bell, Check, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface InAppNotification {
  id: string;
  campaign_id: string | null;
  team_id: string | null;
  title: string;
  message: string;
  severity: string;
  metadata: any;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

const severityClass = (s: string) => {
  switch (s) {
    case 'critical': return 'bg-red-100 text-red-700 border-red-300';
    case 'warning': return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'success': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    default: return 'bg-blue-100 text-blue-700 border-blue-300';
  }
};

export const InAppInbox: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshUnread = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('count_unread_in_app_notifications');
    if (!error) setUnread((data as unknown as number) ?? 0);
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('list_my_in_app_notifications', {
      p_include_dismissed: false,
      p_limit: 50,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setItems((data as InAppNotification[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshUnread();
    const interval = setInterval(refreshUnread, 60_000);
    return () => clearInterval(interval);
  }, [user, refreshUnread]);

  useEffect(() => { if (open) load(); }, [open, load]);

  // Realtime: refresh when a new notification arrives for this user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`in-app-notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_in_app_notifications',
        filter: `recipient_user_id=eq.${user.id}`,
      }, () => {
        refreshUnread();
        if (open) load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, open, load, refreshUnread]);

  const markRead = async (id: string) => {
    const { error } = await supabase.rpc('mark_notification_read', { p_notification_id: id });
    if (error) { toast.error(error.message); return; }
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n));
    refreshUnread();
  };

  const dismiss = async (id: string) => {
    const { error } = await supabase.rpc('dismiss_notification', { p_notification_id: id });
    if (error) { toast.error(error.message); return; }
    setItems(prev => prev.filter(n => n.id !== id));
    refreshUnread();
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center bg-red-600 text-white border-0"
            >
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold text-sm">Notifications</div>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              {loading ? 'Loading…' : 'No notifications'}
            </div>
          ) : (
            <ul className="divide-y">
              {items.map(n => (
                <li key={n.id} className={`px-4 py-3 ${n.read_at ? 'opacity-70' : 'bg-muted/30'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityClass(n.severity)}`}>
                      {n.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 mt-2">
                    {!n.read_at && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => markRead(n.id)}>
                        <Check className="w-3 h-3 mr-1" /> Mark read
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => dismiss(n.id)}>
                      <X className="w-3 h-3 mr-1" /> Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default InAppInbox;
