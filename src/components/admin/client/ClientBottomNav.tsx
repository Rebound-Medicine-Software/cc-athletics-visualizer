import { Home, Activity, Dumbbell, MessageSquare, MoreHorizontal } from 'lucide-react';
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
  { id: 'home', label: 'Home', icon: Home },
  { id: 'testing', label: 'Testing', icon: Activity },
  { id: 'programming', label: 'Programs', icon: Dumbbell },
  { id: 'notifications', label: 'Messages', icon: MessageSquare },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

interface Props {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

/**
 * Premium app-store style bottom tab bar — mobile only (md:hidden).
 * Dark glass surface, gold active glow, safe-area aware.
 * Reference: NEXUS HUB x MTP Sports app structure.
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
      className="absolute bottom-0 inset-x-0 z-40 border-t glass"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      {/* Hairline gold accent at the top edge */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <ul className="flex items-stretch justify-around px-1 pt-2">
        {TABS.map((t) => {
          const active =
            activeSection === t.id ||
            (t.id === 'notifications' && activeSection === 'messages');
          const Icon = t.icon;
          const showBadge = t.id === 'notifications' && unread > 0;
          return (
            <li key={t.id} className="flex-1">
              <button
                onClick={() => onSectionChange(t.id)}
                className={cn(
                  'relative w-full h-14 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wide transition-all active:scale-[0.92]',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'relative flex items-center justify-center h-9 w-12 rounded-2xl transition-all',
                    active && 'bg-primary/12 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.55)]',
                  )}
                >
                  <Icon className={cn('h-[22px] w-[22px] transition-transform', active && 'scale-110')} />
                  {showBadge && (
                    <span className="absolute -top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-4 text-center font-bold ring-2 ring-background">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                <span className="uppercase tracking-[0.12em]">{t.label}</span>
                {active && (
                  <span className="absolute bottom-1 h-[3px] w-6 rounded-full bg-primary" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
