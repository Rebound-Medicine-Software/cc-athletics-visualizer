import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bell, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AdminHeaderProps {
  role: 'super_admin' | 'practitioner' | 'client';
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ role }) => {
  const { profile, signOut, teamBranding } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getRoleDisplay = () => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'practitioner':
        return 'Practitioner';
      case 'client':
        return 'Client';
      default:
        return 'User';
    }
  };

  return (
    <header 
      className="border-b bg-card/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between"
      style={{
        borderBottomColor: teamBranding?.accent_color || undefined
      }}
    >
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold text-foreground">
          {role === 'super_admin' 
            ? 'Platform Overview' 
            : role === 'practitioner' 
            ? 'Team Management' 
            : 'My Dashboard'
          }
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium">{profile?.full_name || profile?.email}</p>
                <p className="text-xs text-muted-foreground">{getRoleDisplay()}</p>
              </div>
            </Button>
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
    </header>
  );
};