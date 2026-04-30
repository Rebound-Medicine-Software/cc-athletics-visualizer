import { AnimatePresence, motion } from "framer-motion";
import { pageTransition, useReducedMotionVariants } from "@/lib/motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  /** Unique key for the current section/page — drives enter/exit animations */
  sectionKey: string;
  children: ReactNode;
  className?: string;
}

/**
 * Animates section/page swaps inside the dashboard shell.
 * Uses opacity + a 6px lift; honours `prefers-reduced-motion`.
 */
export const PageTransition = ({ sectionKey, children, className }: PageTransitionProps) => {
  const variants = useReducedMotionVariants(pageTransition);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={sectionKey}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
