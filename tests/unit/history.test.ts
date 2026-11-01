import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  isExpired,
  saveHistoryEntry,
  listHistoryEntries,
  deleteHistoryEntry,
  HISTORY_TTL_MS,
} from "@/lib/history";

describe("history expiry", () => {
  it("isExpired honours expiresAt", () => {
    const now = 1_000_000;
    expect(isExpired({ expiresAt: now - 1 }, now)).toBe(true);
    expect(isExpired({ expiresAt: now + 1000 }, now)).toBe(false);
  });
  it("TTL is one hour", () => {
    expect(HISTORY_TTL_MS).toBe(60 * 60 * 1000);
  });
});

describe("history IndexedDB round trip", () => {
  it("saves, lists, and deletes entries", async () => {
    const blob = new Blob(["hello"], { type: "application/pdf" });
    const saved = await saveHistoryEntry("merge-pdf", "out.pdf", blob);
    expect(saved).not.toBeNull();
    const listed = await listHistoryEntries();
    expect(listed.some((e) => e.id === saved!.id)).toBe(true);
    await deleteHistoryEntry(saved!.id);
    const after = await listHistoryEntries();
    expect(after.some((e) => e.id === saved!.id)).toBe(false);
  });
});
