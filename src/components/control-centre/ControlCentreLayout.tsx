import React, { useState } from 'react';
import { NAV_ITEMS } from './nav';
import { Search, Bell, Command, ChevronDown, Sparkles, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ControlCentreLayoutProps {
  active: string;
  onNavigate: (id: string) => void;
  children: React.ReactNode;
}

export const ControlCentreLayout: React.FC<ControlCentreLayoutProps> = ({ active, onNavigate, children }) => {
  const [search, setSearch] = useState('');
  const { profile, signOut } = useAuth() as any;

  const groups = ['Overview', 'Tenants', 'Operations', 'Governance'] as const;

  return (
    <div className="control-centre flex w-full">
      {/* Sidebar */}
      <aside className="cc-sidebar w-[260px] flex-shrink-0 sticky top-0 h-screen overflow-y-auto py-5 px-3">
        <div className="px-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold"
              style={{ background: 'var(--cc-grad-gold)', color: 'hsl(222 30% 8%)' }}
            >
              N
            </div>
            <div>
              <div className="text-[14px] font-bold tracking-tight" style={{ color: 'hsl(var(--cc-fg))' }}>NEXUS HUB</div>
              <div className="text-[10.5px] font-medium uppercase tracking-widest" style={{ color: 'hsl(var(--cc-gold))' }}>
                Control Centre
              </div>
            </div>
          </div>
        </div>

        {groups.map((g) => (
          <div key={g} className="mb-4">
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
              {g}
            </div>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter((n) => n.group === g).map((n) => {
                const Icon = n.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => onNavigate(n.id)}
                    className={`cc-nav-item w-full text-left ${active === n.id ? 'active' : ''}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{n.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="cc-glass p-3 mt-6 mx-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'hsl(var(--cc-gold))' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'hsl(var(--cc-fg))' }}>Platform Health</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="cc-pulse" />
            <span className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>All systems operational</span>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="cc-topbar sticky top-0 z-20 flex items-center gap-3 px-6 py-3">
          <div className="flex-1 max-w-xl relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--cc-fg-dim))' }} />
            <input
              className="cc-input"
              placeholder="Search organisations, practitioners, athletes, tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ background: 'hsl(var(--cc-surface-2))', color: 'hsl(var(--cc-fg-dim))', border: '1px solid hsl(var(--cc-border))' }}
            >
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </div>

          <button
            className="cc-btn relative"
            onClick={() => toast('3 unread system notifications')}
          >
            <Bell className="w-4 h-4" />
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ background: 'hsl(var(--cc-gold))', boxShadow: '0 0 8px hsl(var(--cc-gold))' }}
            />
          </button>

          <div className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-white/5"
               onClick={() => signOut?.().then(() => toast.success('Signed out'))}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[13px]"
              style={{ background: 'var(--cc-grad-primary)', color: 'white' }}
            >
              {(profile?.full_name || profile?.email || 'SA').slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-[12.5px] font-semibold" style={{ color: 'hsl(var(--cc-fg))' }}>
                {profile?.full_name || 'Super Admin'}
              </div>
              <div className="text-[10.5px]" style={{ color: 'hsl(var(--cc-gold))' }}>SUPER_ADMIN</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'hsl(var(--cc-fg-dim))' }} />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};
