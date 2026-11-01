// Thumbnail page grid shared by Rotate PDF and Organize pages: shows every
// page, lets the user reorder (drag + keyboard), delete (checkbox), and/or
// rotate (per-page select). Reports state upward via onChange.
"use client";
import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { fileToBytes, renderPageThumbnails } from "@/lib/pdf-client";

export type PageGridState = {
  order: number[];
  rotations: number[];
  deleted: Set<number>;
};

export function PdfPageGrid({
  file,
  allowRotate,
  allowDelete,
  allowReorder,
  onChange,
}: {
  file: File;
  allowRotate: boolean;
  allowDelete: boolean;
  allowReorder: boolean;
  onChange: (state: PageGridState) => void;
}) {
  const [thumbs, setThumbs] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [order, setOrder] = useState<number[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
  const [deleted, setDeleted] = useState<Set<number>>(new Set());
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropId, setDropId] = useState<number | null>(null);

  // Fresh mount per file (parents pass key={file identity}), so no state
  // reset is needed here when the file changes.
  useEffect(() => {
    let alive = true;
    fileToBytes(file)
      .then((bytes) => renderPageThumbnails(bytes))
      .then((t) => {
        if (!alive) return;
        setThumbs(t);
        setOrder(t.map((_, i) => i));
        setRotations(t.map(() => 0));
        setDeleted(new Set());
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : "Could not read this PDF.");
      });
    return () => {
      alive = false;
    };
  }, [file]);

  useEffect(() => {
    if (thumbs) onChange({ order, rotations, deleted });
  }, [order, rotations, deleted, thumbs, onChange]);

  if (loadError) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
        {loadError}
      </p>
    );
  }
  if (!thumbs) return <p className="py-6 text-center text-sm text-slate-500">Reading pages…</p>;

  const move = (pageIdx: number, dir: -1 | 1) => {
    setOrder((cur) => {
      const pos = cur.indexOf(pageIdx);
      const j = pos + dir;
      if (pos < 0 || j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[pos], next[j]] = [next[j], next[pos]];
      return next;
    });
  };

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="PDF pages">
      {order.map((pageIdx, pos) => {
        const isDeleted = deleted.has(pageIdx);
        return (
          <li
            key={pageIdx}
            draggable={allowReorder}
            onDragStart={() => setDragId(pageIdx)}
            onDragOver={(e) => {
              e.preventDefault();
              setDropId(pageIdx);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId !== null && dragId !== pageIdx) {
                setOrder((cur) => {
                  const from = cur.indexOf(dragId);
                  const to = cur.indexOf(pageIdx);
                  if (from < 0 || to < 0) return cur;
                  const next = [...cur];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  return next;
                });
              }
              setDragId(null);
              setDropId(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setDropId(null);
            }}
            className={`rounded-xl border-2 p-2 ${
              dropId === pageIdx
                ? "border-[#ea580c] bg-orange-50 dark:bg-orange-950"
                : "border-[#99f6e4] dark:border-teal-900"
            } ${isDeleted ? "opacity-50" : ""}`}
          >
            <p className="text-sm font-semibold">
              Page {pageIdx + 1}
              {pos + 1 !== pageIdx + 1 ? ` → position ${pos + 1}` : ""}
              {isDeleted ? " (deleted)" : ""}
            </p>
            {/* Rendered page thumbnails (data URLs) cannot use next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbs[pageIdx]}
              alt={`Page ${pageIdx + 1}`}
              className="mt-1 h-40 w-full object-contain bg-white transition-transform"
              style={{ transform: `rotate(${rotations[pageIdx] ?? 0}deg)` }}
              draggable={false}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {allowRotate && (
                <label className="flex min-h-[44px] items-center gap-1 text-sm font-semibold">
                  Rotate
                  <select
                    aria-label={`Rotation for page ${pageIdx + 1}`}
                    value={rotations[pageIdx] ?? 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRotations((cur) => cur.map((r, i) => (i === pageIdx ? v : r)));
                    }}
                    className="min-h-[44px] rounded-lg border-2 border-[#99f6e4] bg-white px-2 py-1 dark:border-teal-800 dark:bg-slate-800"
                  >
                    <option value={0}>0°</option>
                    <option value={90}>90°</option>
                    <option value={180}>180°</option>
                    <option value={270}>270°</option>
                  </select>
                </label>
              )}
              {allowReorder && (
                <>
                  <button
                    type="button"
                    aria-label={`Move page ${pageIdx + 1} up`}
                    onClick={() => move(pageIdx, -1)}
                    className="min-h-[44px] min-w-[44px] rounded-lg border px-2 py-1 font-bold"
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move page ${pageIdx + 1} down`}
                    onClick={() => move(pageIdx, 1)}
                    className="min-h-[44px] min-w-[44px] rounded-lg border px-2 py-1 font-bold"
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                </>
              )}
              {allowDelete && (
                <label className="flex min-h-[44px] cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-sm font-bold text-red-700 dark:text-red-400">
                  <input
                    type="checkbox"
                    checked={isDeleted}
                    onChange={(e) => {
                      setDeleted((cur) => {
                        const next = new Set(cur);
                        if (e.target.checked) next.add(pageIdx);
                        else next.delete(pageIdx);
                        return next;
                      });
                    }}
                    className="h-5 w-5"
                  />
                  Delete
                </label>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
