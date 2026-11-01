// "Next step" buttons after a conversion, from the contextual mapping.
"use client";
import Link from "next/link";
import { NEXT_TOOLS } from "@/lib/next-tools";
import { TOOLS, type ToolSlug } from "@/lib/site";

export function NextToolSuggest({ tool }: { tool: ToolSlug }) {
  const suggestions = NEXT_TOOLS[tool] ?? [];
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Next step</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((s) => {
          const meta = TOOLS.find((t) => t.slug === s.slug);
          return (
            <Link
              key={s.slug}
              href={`/${s.slug}`}
              className="min-h-[44px] rounded-lg border-2 border-[#99f6e4] px-4 py-2.5 font-semibold text-[#0f766e] hover:bg-[#f0fdfa] dark:border-teal-900 dark:text-[#5eead4] dark:hover:bg-teal-950"
              title={s.reason}
            >
              {meta?.title ?? s.slug} — {s.reason}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
