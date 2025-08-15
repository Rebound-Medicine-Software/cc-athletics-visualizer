import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { BarChart3 } from 'lucide-react';

interface AdminDashboardSheetProps {
  children?: React.ReactNode;
}

export const AdminDashboardSheet: React.FC<AdminDashboardSheetProps> = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-full p-0">
        <div className="h-full">
          <SuperAdminDashboard />
        </div>
      </SheetContent>
    </Sheet>
  );
};