import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { listContainer, listItem, useReducedMotionVariants } from "@/lib/motion";

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Optional permission check — when false the action is hidden */
  visible?: boolean;
  /** Optional tooltip / disabled reason */
  disabled?: boolean;
  description?: string;
}

interface QuickActionsProps {
  title?: string;
  actions: QuickAction[];
}

/**
 * Compact CTA grid used at the top of every role-specific home view.
 * Uses outline buttons so it visually subordinates to KPI cards beneath.
 */
export const QuickActions = ({ title = "Quick actions", actions }: QuickActionsProps) => {
  const visible = actions.filter((a) => a.visible !== false);
  if (visible.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2"
          variants={useReducedMotionVariants(listContainer)}
          initial="hidden"
          animate="visible"
        >
          {visible.map((a) => (
            <motion.div
              key={a.id}
              variants={useReducedMotionVariants(listItem)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-auto w-full py-3 flex flex-col items-center justify-center gap-1.5 text-center whitespace-normal hover:border-primary/40 hover:bg-primary/5 transition-colors"
                onClick={a.onClick}
                disabled={a.disabled}
                title={a.description}
              >
                <a.icon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium leading-tight">{a.label}</span>
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
};
