// Shared upload component for every tool: drag + drop, paste from
// clipboard, file list with per-file remove, client-side size + magic-byte
// validation, and (for image tools) mobile camera capture. Server routes
// re-validate everything — client checks are for fast feedback only.
"use client";
import { useCallback, useRef, useState } from "react";
import { validateClientFile, formatBytes, type ClientFileKind } from "@/lib/file-detect";

export type UploadZoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept: string;
  allowedKinds: ClientFileKind[];
  maxBytes: number;
  maxFiles: number;
  multiple?: boolean;
  /** Show a camera-capture input (image tools on mobile). */
  capture?: boolean;
  label: string;
  hint?: string;
  disabled?: boolean;
  inputId?: string;
};

export function UploadZone({
  files,
  onFilesChange,
  accept,
  allowedKinds,
  maxBytes,
  maxFiles,
  multiple = true,
  capture = false,
  label,
  hint,
  disabled = false,
  inputId = "upload-zone-input",
}: UploadZoneProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (incoming: File[]) => {
      if (disabled) return;
      const next = multiple ? [...files] : [];
      const newErrors: string[] = [];
      setChecking(true);
      try {
        for (const f of incoming) {
          if (next.length >= maxFiles) {
            newErrors.push(`Only ${maxFiles} files at a time — "${f.name}" was skipped.`);
            continue;
          }
          const err = await validateClientFile(f, allowedKinds, maxBytes);
          if (err) {
            newErrors.push(err);
            continue;
          }
          next.push(f);
        }
      } finally {
        setChecking(false);
      }
      setErrors(newErrors);
      onFilesChange(next);
    },
    [disabled, files, multiple, maxFiles, allowedKinds, maxBytes, onFilesChange],
  );

  const removeAt = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  const keyFor = (f: File, i: number) => `${f.name}-${f.size}-${f.lastModified}-${i}`;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(Array.from(e.dataTransfer.files));
        }}
        onPaste={(e) => {
          const pasted = Array.from(e.clipboardData.files);
          if (pasted.length > 0) {
            e.preventDefault();
            void addFiles(pasted);
          }
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging
            ? "border-[#0f766e] bg-[#f0fdfa] dark:bg-teal-950"
            : "border-[#99f6e4] bg-[#f0fdfa]/50 dark:border-teal-900 dark:bg-slate-900"
        }`}
      >
        <p className="text-lg font-bold text-[#0f766e] dark:text-[#5eead4]">
          {checking ? "Checking files…" : "Drop files here, paste (Ctrl+V), or click to choose"}
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {hint ?? `Up to ${maxFiles} files, ${formatBytes(maxBytes)} each.`}
        </p>
        {capture && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cameraRef.current?.click();
            }}
            className="mt-3 min-h-[44px] rounded-lg bg-[#0f766e] px-4 py-2 font-semibold text-white"
          >
            Take a photo
          </button>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={disabled}
          aria-label="Take a photo with your camera"
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Selected files">
          {files.map((f, i) => (
            <li
              key={keyFor(f, i)}
              className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-[#99f6e4] px-3 py-2 dark:border-teal-900"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {f.name} <span className="text-slate-500">({formatBytes(f.size)})</span>
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${f.name}`}
                className="min-h-[44px] min-w-[44px] rounded-lg px-2 py-1 font-bold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1" role="alert">
          {errors.map((err, i) => (
            <li key={i} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
