import { Home, TrendingUp, Dumbbell, Activity, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  { id: 'home', label: 'Today', icon: Home },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'programming', label: 'Programme', icon: Dumbbell },
  { id: 'testing', label: 'Testing', icon: Activity },
  { id: 'notifications', label: 'Alerts', icon: Bell },
];

interface Props {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

/**
 * App-like bottom tab bar — mobile only (md:hidden).
 * Honours iOS safe-area via env(safe-area-inset-bottom).
 */
export const ClientBottomNav = ({ activeSection, onSectionChange }: Props) => {
  const { user } = useAuth();

  const { data: unread = 0 } = useQuery({
    queryKey: ['client-unread-notifications', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('platform_in_app_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', user!.id)
        .is('read_at', null);
      return count ?? 0;
    },
  });

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map((t) => {
          const active = activeSection === t.id || (t.id === 'progress' && activeSection === 'analytics');
          const Icon = t.icon;
          const showBadge = t.id === 'notifications' && unread > 0;
          return (
            <li key={t.id} className="flex-1">
              <button
                onClick={() => onSectionChange(t.id)}
                className={cn(
                  'w-full h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:scale-[0.96]',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative">
                  <Icon className={cn('h-5 w-5', active && 'scale-110 transition-transform')} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center font-semibold">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                <span>{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
