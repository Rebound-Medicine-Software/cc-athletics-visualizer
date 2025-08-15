import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useFilteredNavigation } from '@/components/navigation/RoleBasedNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  role: 'super_admin' | 'practitioner' | 'client';
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  role,
  activeSection,
  onSectionChange,
}) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { filteredNavigation } = useFilteredNavigation();
  const { teamBranding } = useAuth();

  return (
    <Sidebar className={cn("border-r", collapsed ? "w-14" : "w-64")}>
      <SidebarContent style={{ 
        backgroundColor: teamBranding?.primary_color 
          ? `${teamBranding.primary_color}10` 
          : undefined 
      }}>
        <div className="p-4 border-b">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              {teamBranding?.logo_url && (
                <img 
                  src={teamBranding.logo_url} 
                  alt="Team Logo" 
                  className="w-8 h-8 rounded"
                />
              )}
              <div>
                <h2 className="font-semibold text-lg text-foreground">
                  {teamBranding?.name || 'Admin Panel'}
                </h2>
                <p className="text-xs text-muted-foreground capitalize">
                  {role.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}
          <SidebarTrigger className="ml-auto" />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id)}
                    className={cn(
                      "w-full justify-start",
                      activeSection === item.id && "bg-primary/10 text-primary font-medium"
                    )}
                    style={{
                      backgroundColor: activeSection === item.id && teamBranding?.primary_color
                        ? `${teamBranding.primary_color}20`
                        : undefined,
                      color: activeSection === item.id && teamBranding?.primary_color
                        ? teamBranding.primary_color
                        : undefined
                    }}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {!collapsed && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};