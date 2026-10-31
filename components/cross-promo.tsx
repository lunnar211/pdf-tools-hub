import { Sparkles, Users } from "lucide-react";
import { SISTER_SITE_URL, LEADSFORCEGEN_URL } from "@/lib/site";
export function CrossPromo() {
  return (
    <section aria-label="Our other projects" className="mt-10 rounded-xl border-2 border-[#99f6e4] bg-[#f0fdfa] p-5 dark:border-teal-900 dark:bg-teal-950">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Done here? Try our other projects</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a href={SISTER_SITE_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center gap-3 rounded-lg border border-[#99f6e4] bg-white p-4 hover:border-[#0d9488] dark:border-teal-800 dark:bg-slate-900">
          <Sparkles className="shrink-0 text-[#ea580c]" aria-hidden="true" />
          <span><span className="block font-bold text-[#0f766e] dark:text-[#5eead4]">AI Studio</span><span className="text-sm text-slate-600 dark:text-slate-300">AI logo generation and photo enhancement.</span></span>
        </a>
        <a href={LEADSFORCEGEN_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center gap-3 rounded-lg border border-[#99f6e4] bg-white p-4 hover:border-[#0d9488] dark:border-teal-800 dark:bg-slate-900">
          <Users className="shrink-0 text-[#ea580c]" aria-hidden="true" />
          <span><span className="block font-bold text-[#0f766e] dark:text-[#5eead4]">LeadsForceGen</span><span className="text-sm text-slate-600 dark:text-slate-300">Find business leads for outreach.</span></span>
        </a>
      </div>
    </section>
  );
}
