import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "accent" | "outline" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-base font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[#0d9488] text-white hover:bg-[#0f766e] dark:bg-[#14b8a6] dark:text-white dark:hover:bg-[#0d9488]",
        variant === "accent" && "bg-[#ea580c] text-white hover:bg-[#c2410c]",
        variant === "outline" && "border-2 border-[#0d9488] text-[#0f766e] hover:bg-[#f0fdfa] dark:text-[#5eead4] dark:hover:bg-teal-950",
        variant === "ghost" && "text-[#0f766e] hover:bg-[#f0fdfa] dark:text-[#5eead4]",
        className
      )}
      {...props}
    />
  );
}
