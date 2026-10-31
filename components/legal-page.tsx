import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{title}</h1>
      <div className="mt-6 space-y-4 text-slate-700 dark:text-slate-200">{children}</div>
      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        This page describes how this site actually works. It is not legal advice. If anything here conflicts with how
        a third-party service (Google, Paddle, Vercel) handles data, that service&apos;s own policy governs its part.
      </p>
    </main>
  );
}

export function H({ children }: { children: ReactNode }) {
  return <h2 className="pt-2 text-xl font-bold text-slate-900 dark:text-white">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}
