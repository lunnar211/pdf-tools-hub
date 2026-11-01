// Shared helpers for browser-side tools: charge quota, trigger downloads,
// and save outputs to on-device history.
import { saveHistoryEntry } from "@/lib/history";
import type { ToolSlug } from "@/lib/site";

/** Charge one conversion against the real limit system. Returns an error
 *  message when blocked (maintenance / tool-off / limit reached), else null. */
export async function countToolUse(tool: ToolSlug): Promise<string | null> {
  try {
    const res = await fetch("/api/usage/count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool }),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error ?? "The daily limit was reached. Please try again tomorrow.";
  } catch {
    // If the count endpoint is unreachable, do NOT block the conversion:
    // server-side tools still enforce limits, and a failed count call must
    // not strand a browser conversion. The failure is visible in the
    // counter (which simply stays hidden).
    return null;
  }
}

/** Trigger a browser download for a blob and revoke the URL afterwards. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function saveToHistory(tool: ToolSlug, filename: string, blob: Blob): Promise<void> {
  await saveHistoryEntry(tool, filename, blob);
}
