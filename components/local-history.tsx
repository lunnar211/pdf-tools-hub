// "Recent conversions" for the account page: outputs saved on this device
// (IndexedDB, 1-hour expiry) with re-download + delete. This is separate
// from the server job history below it, which is metadata only — the server
// never holds file contents, so re-download can only work from this device.
"use client";
import { useEffect, useState } from "react";
import { listHistoryEntries, deleteHistoryEntry, type HistoryEntry } from "@/lib/history";
import { formatBytes } from "@/lib/file-detect";

export function LocalHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    listHistoryEntries().then((es) => {
      if (alive) {
        setEntries(es);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const download = (e: HistoryEntry) => {
    const url = URL.createObjectURL(e.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = e.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const remove = async (id: string) => {
    await deleteHistoryEntry(id);
    setEntries((es) => es.filter((x) => x.id !== id));
  };

  if (!loaded) return null;
  if (entries.length === 0) {
    return (
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        No recent conversions on this device yet. Results you download here are kept on this device
        for 1 hour so you can re-download them.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {entries.map((e) => {
        return (
          <li
            key={e.id}
            className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 rounded-lg border border-[#99f6e4] px-3 py-2 dark:border-teal-900"
          >
            <span className="min-w-0 flex-1 truncate text-sm">
              <span className="font-semibold">{e.tool}</span> — {e.filename} ({formatBytes(e.blob.size)})
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => download(e)}
                className="min-h-[44px] rounded-lg bg-[#0f766e] px-3 py-1.5 text-sm font-semibold text-white"
              >
                Download again
              </button>
              <button
                type="button"
                onClick={() => void remove(e.id)}
                aria-label={`Delete ${e.filename} from this device`}
                className="min-h-[44px] rounded-lg border px-3 py-1.5 text-sm font-bold text-red-700 dark:text-red-400"
              >
                Delete
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
