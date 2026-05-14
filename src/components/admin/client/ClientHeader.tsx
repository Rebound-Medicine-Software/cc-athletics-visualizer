import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bell, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Compact client/athlete header — sized for the iPhone shell.
 * Slim, glassy, truncates long names. Replaces AdminHeader inside the phone frame.
 */
export const ClientHeader: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayName = profile?.full_name || profile?.email || 'User';
  const initial = profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U';

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 min-w-0">
      <h1 className="text-[15px] font-extrabold tracking-[-0.01em] text-foreground truncate min-w-0">
        My Dashboard
      </h1>

      <div className="flex items-center gap-1 shrink-0">
        <button
          aria-label="Notifications"
          className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/5 active:scale-95 transition"
        >
          <Bell className="w-4 h-4 text-foreground/80" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 max-w-[140px] pl-1 pr-2 py-1 rounded-full hover:bg-white/5 active:scale-95 transition min-w-0"
              aria-label="Account menu"
            >
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-[11px]">{initial}</AvatarFallback>
              </Avatar>
              <span className="text-[12px] font-semibold text-foreground/90 truncate min-w-0 hidden xs:inline">
                {displayName.split(' ')[0]}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
