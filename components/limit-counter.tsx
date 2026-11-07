// Free-limit counter wired to the REAL limit system (GET /api/usage/remaining).
// Never a hardcoded number: guests see the per-IP limit, signed-in users
// see their plan quota, premium users see a plan label instead of a number.
"use client";
import { useEffect, useState } from "react";

type UsageInfo = {
  plan: "guest" | "free" | "premium";
  quota: number;
  used: number;
  remaining: number | null;
};

export function LimitCounter({ refreshKey = 0 }: { refreshKey?: number }) {
  const [info, setInfo] = useState<UsageInfo | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/usage/remaining", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data) setInfo(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  if (!info) return null;
  if (info.plan === "premium") {
    return (
      <p className="text-sm font-semibold text-[#0f766e] dark:text-[#5eead4]">
        Premium plan — {info.quota.toLocaleString()} conversions per day.
      </p>
    );
  }
  // Guests: the per-visitor count is only tracked in memory on each
  // serverless instance (no shared store until Upstash is configured), so
  // the live number is unreliable — advertise the fair-use guideline
  // instead of a count that flips between instances. Signed-in limits
  // are tracked per account, so those users still see a real number.
  if (info.plan === "guest") {
    return (
      <p className="text-sm font-semibold text-[#0f766e] dark:text-[#5eead4]">
        Guest fair-use guideline: around {info.quota} conversions a day (sign in for a tracked limit)
      </p>
    );
  }
  return (
    <p className="text-sm font-semibold text-[#0f766e] dark:text-[#5eead4]">
      {info.remaining} of {info.quota} free conversions left today
    </p>
  );
}
