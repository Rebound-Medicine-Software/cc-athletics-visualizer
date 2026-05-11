import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Subscribes to realtime inserts on platform_in_app_notifications for the
 * current user. Triggers a toast for high-priority notification types and
 * invalidates the notification queries so badges/feeds refresh instantly.
 *
 * Safe to mount multiple times (channel name is unique per user).
 */
const HIGH_PRIORITY_TYPES = new Set([
  'personal_best',
  'leader',
  'retest_due',
  'programme_milestone',
  'programme_completed',
  'streak',
]);

export const useRealtimeClientNotifications = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`client-notifications-${user.id}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_in_app_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const row = payload.new ?? {};
          const meta = row.metadata ?? {};
          const type = meta.notification_type ?? 'default';
          const priority = meta.priority ?? (HIGH_PRIORITY_TYPES.has(type) ? 'high' : 'normal');

          // Refresh inbox + feed + unread badge
          qc.invalidateQueries({ queryKey: ['client-notifications-feed'] });
          qc.invalidateQueries({ queryKey: ['client-unread-notifications'] });

          if (priority === 'high' || HIGH_PRIORITY_TYPES.has(type)) {
            const fn = row.severity === 'success' ? toast.success
              : row.severity === 'warning' || row.severity === 'critical' ? toast.error
              : toast.message;
            fn(row.title ?? 'New update', {
              description: row.message ?? undefined,
              duration: 6000,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
};
