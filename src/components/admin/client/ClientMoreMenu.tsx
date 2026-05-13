import { Card, CardContent } from '@/components/ui/card';
import {
  User, BarChart3, TrendingUp, Heart, Target,
  Settings, HelpCircle, Calendar, FileText, CreditCard, ChevronRight, LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Props {
  onSectionChange: (section: string) => void;
}

interface Row {
  id: string;
  label: string;
  sub?: string;
  icon: any;
  section?: string;
  onClick?: () => void;
  tone?: 'default' | 'danger';
}

/**
 * Minimal premium "More" menu — placeholder pending full Stage-3 redesign.
 * Visual language matches the athlete shell (card-premium, gold accents).
 */
export const ClientMoreMenu = ({ onSectionChange }: Props) => {
  const { profile, signOut } = useAuth();

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: 'Performance',
      rows: [
        { id: 'progress',  label: 'Progress & Trends', sub: 'How you compare', icon: TrendingUp, section: 'progress' },
        { id: 'reports',   label: 'Reports',           sub: 'Latest testing reports', icon: FileText, section: 'reports' },
        { id: 'testing',   label: 'Testing Hub',       sub: 'All assessments', icon: BarChart3, section: 'testing' },
      ],
    },
    {
      title: 'You',
      rows: [
        { id: 'profile',  label: 'Performance Profile', sub: profile?.full_name ?? 'Athlete', icon: User },
        { id: 'goals',    label: 'Goals & Milestones',  sub: 'Coming soon',    icon: Target },
        { id: 'recovery', label: 'Recovery & Wellness', sub: 'Coming soon',    icon: Heart },
      ],
    },
    {
      title: 'Account',
      rows: [
        { id: 'bookings', label: 'Book a Session', icon: Calendar, section: 'bookings' },
        { id: 'payments', label: 'Payments & Packages', icon: CreditCard, section: 'payment-packages' },
        { id: 'settings', label: 'Account Settings', icon: Settings },
        { id: 'help',     label: 'Help & Support',   icon: HelpCircle },
        { id: 'logout',   label: 'Sign out', icon: LogOut, tone: 'danger', onClick: () => signOut?.() },
      ],
    },
  ];

  const handle = (row: Row) => {
    if (row.onClick) return row.onClick();
    if (row.section) return onSectionChange(row.section);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="px-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.22em]">
          Everything you need
        </p>
        <h1 className="text-[clamp(1.85rem,7vw,2.75rem)] font-bold tracking-tight mt-1 leading-[1.05]">
          More
        </h1>
      </header>

      {/* Profile chip */}
      <Card className="card-premium rounded-3xl border-0">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-bold text-lg">
            {(profile?.full_name ?? 'A').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{profile?.full_name ?? 'Athlete'}</div>
            <div className="text-xs text-muted-foreground truncate">Athlete profile</div>
          </div>
        </CardContent>
      </Card>

      {groups.map((g) => (
        <section key={g.title} className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-muted-foreground px-1">
            {g.title}
          </div>
          <Card className="card-premium rounded-3xl border-0 overflow-hidden">
            <CardContent className="p-0 divide-y divide-[hsl(var(--athlete-edge)/0.5)]">
              {g.rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handle(r)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary/60',
                    r.tone === 'danger' && 'text-destructive',
                  )}
                >
                  <div className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                    r.tone === 'danger' ? 'bg-destructive/10' : 'bg-primary/10 text-primary',
                  )}>
                    <r.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight">{r.label}</div>
                    {r.sub && (
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{r.sub}</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
};
