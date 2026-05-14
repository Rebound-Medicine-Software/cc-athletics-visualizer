import { Home, Activity, Dumbbell, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon: any;
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
      className="absolute z-40 nav-float left-3 right-3 bottom-3"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 p-1.5 gap-0.5">
        {TABS.map((t) => {
          const active =
            activeSection === t.id ||
            (t.id === 'notifications' && activeSection === 'messages');
          const Icon = t.icon;
          const showBadge = t.id === 'notifications' && unread > 0;
          return (
            <li key={t.id}>
              <button
                onClick={() => onSectionChange(t.id)}
                className={cn(
                  'relative w-full h-12 flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[9px] font-bold tracking-wide transition-all duration-300 active:scale-[0.94] min-w-0 px-1',
                  active
                    ? 'text-[hsl(var(--athlete-green))] bg-[hsl(var(--athlete-green)/0.10)] shadow-[inset_0_0_0_1px_hsl(var(--athlete-green)/0.18)]'
                    : 'text-muted-foreground hover:text-foreground/90',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative flex items-center justify-center">
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px] transition-all duration-300',
                      active && 'drop-shadow-[0_0_10px_hsl(var(--athlete-green)/0.55)]',
                    )}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {showBadge && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive text-destructive-foreground text-[8px] leading-[14px] text-center font-bold ring-2 ring-[hsl(210_40%_6%)]">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                <span className="uppercase tracking-[0.08em] text-[9px] leading-none truncate max-w-full">
                  {t.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
