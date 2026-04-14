import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";

interface OutOfHoursConfirmDialogProps {
  open: boolean;
  targetDate: Date | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const OutOfHoursConfirmDialog = ({
  open,
  targetDate,
  onConfirm,
  onCancel,
}: OutOfHoursConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Outside Allocated Hours
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to move this booking to{" "}
              <span className="font-semibold text-foreground">
                {targetDate ? format(targetDate, "EEEE, MMMM d 'at' h:mm a") : "this time"}
              </span>
              ? This is outside of your allocated working hours.
            </p>
            <p className="text-xs text-muted-foreground">
              Choosing "Yes" will attempt to override and force-reschedule via the Cal.com API. If Cal.com still rejects it, the move will be cancelled.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>No, undo move</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-yellow-600 hover:bg-yellow-700">
            Yes, use this timeslot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
