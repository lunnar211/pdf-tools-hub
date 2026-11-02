"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

// Motion's own button prop type (not React's ButtonHTMLAttributes):
// the two differ on a few React 19 form props, and spreading the
// React type into motion.button fails type-checking (proven on
// AI Studio 2026-11-01).
type Props = Omit<HTMLMotionProps<"button">, "ref"> & {
  variant?: "primary" | "accent" | "outline" | "ghost";
};

// Site-wide button motion (Motion gesture showcase, 2026-11-01):
// a subtle press answer — hover grows 2%, tap shrinks 2%.
// Transform-only, so no layout shift. Disabled buttons and
// reduced-motion users get no motion at all.
export function Button({ className, variant = "primary", disabled, ...props }: Props) {
  const reduce = usePrefersReducedMotion();
  const animate = !reduce && !disabled;
  return (
    <motion.button
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-base font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[#0d9488] text-white hover:bg-[#0f766e] dark:bg-[#14b8a6] dark:text-white dark:hover:bg-[#0d9488]",
        variant === "accent" && "bg-[#ea580c] text-white hover:bg-[#c2410c]",
        variant === "outline" && "border-2 border-[#0d9488] text-[#0f766e] hover:bg-[#f0fdfa] dark:text-[#5eead4] dark:hover:bg-teal-950",
        variant === "ghost" && "text-[#0f766e] hover:bg-[#f0fdfa] dark:text-[#5eead4]",
        className
      )}
      disabled={disabled}
      whileHover={animate ? { scale: 1.02 } : undefined}
      whileTap={animate ? { scale: 0.98 } : undefined}
      {...props}
    />
  );
}
