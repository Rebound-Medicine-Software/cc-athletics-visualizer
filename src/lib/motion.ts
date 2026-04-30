/**
 * NEXUS HUB animation system.
 *
 * Centralised duration tokens, easing presets, and Framer Motion variants used
 * across the organisation/practitioner dashboard. Designed to feel premium but
 * subtle — short durations, soft easing, and reduced-motion safe.
 *
 * Always pair components using these variants with `useReducedMotionSafe()` so
 * users with `prefers-reduced-motion: reduce` get instant transitions.
 */
import { useReducedMotion, type Variants, type Transition } from "framer-motion";

// ─── Duration tokens (seconds) ────────────────────────────────────────────────
export const motionDuration = {
  instant: 0.12,
  fast: 0.18,
  base: 0.24,
  slow: 0.36,
  page: 0.32,
} as const;

// ─── Easing presets ───────────────────────────────────────────────────────────
// Soft, slightly overshooting easing for a premium feel without being bouncy.
export const motionEase = {
  standard: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
  emphasized: [0.16, 1, 0.3, 1] as [number, number, number, number],
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
} as const;

// ─── Transition presets ───────────────────────────────────────────────────────
export const transitions = {
  base: { duration: motionDuration.base, ease: motionEase.standard } as Transition,
  fast: { duration: motionDuration.fast, ease: motionEase.standard } as Transition,
  page: { duration: motionDuration.page, ease: motionEase.emphasized } as Transition,
};

// ─── Reusable variants ────────────────────────────────────────────────────────
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, y: -4, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
  exit: { opacity: 0, transition: { duration: motionDuration.fast } },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: transitions.page },
  exit: { opacity: 0, y: -4, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
};

export const cardEntrance: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: transitions.base },
};

export const listContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transitions.fast },
};

// ─── Reduced motion helper ────────────────────────────────────────────────────
/**
 * Returns variants that collapse to instant transitions when the user has
 * `prefers-reduced-motion: reduce` set. Use this around any of the variant
 * objects above before passing them to `<motion.* variants>`.
 */
export function useReducedMotionVariants(variants: Variants): Variants {
  const reduce = useReducedMotion();
  if (!reduce) return variants;
  // Strip transforms + use opacity-only transitions with zero duration.
  const stripped: Variants = {};
  for (const key of Object.keys(variants)) {
    const v = variants[key] as Record<string, unknown>;
    stripped[key] = {
      opacity: (v.opacity as number) ?? 1,
      transition: { duration: 0 },
    };
  }
  return stripped;
}

/**
 * Returns transition props that respect reduced-motion. Spread onto any
 * `<motion.*>` element that does not use the variant helpers above.
 */
export function useSafeTransition(t: Transition = transitions.base): Transition {
  const reduce = useReducedMotion();
  if (reduce) return { duration: 0 };
  return t;
}

// ─── Microinteraction primitives ──────────────────────────────────────────────
export const hoverLift = {
  whileHover: { y: -2, transition: transitions.fast },
  whileTap: { y: 0, scale: 0.985, transition: { duration: motionDuration.instant } },
};

export const tapScale = {
  whileTap: { scale: 0.96, transition: { duration: motionDuration.instant } },
};
