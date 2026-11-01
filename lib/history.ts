// Client-side conversion history: output blobs live in IndexedDB on the
// user's own device — never on the server (server Job rows stay
// metadata-only by design). Entries expire after 1 hour and are pruned on
// every load, so re-download works briefly without building a file store.
// This is a tiny hand-written wrapper (no new dependency).
export type HistoryEntry = {
  id: string;
  tool: string;
  filename: string;
  mime: string;
  blob: Blob;
  createdAt: number;
  expiresAt: number;
};

export const HISTORY_TTL_MS = 60 * 60 * 1000;
const DB_NAME = "pdf-tools-hub-history";
const STORE = "outputs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function isExpired(entry: { expiresAt: number }, now = Date.now()): boolean {
  return entry.expiresAt <= now;
}

export async function saveHistoryEntry(
  tool: string,
  filename: string,
  blob: Blob,
): Promise<HistoryEntry | null> {
  try {
    const now = Date.now();
    const entry: HistoryEntry = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      tool,
      filename,
      mime: blob.type,
      blob,
      createdAt: now,
      expiresAt: now + HISTORY_TTL_MS,
    };
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    await txDone(tx);
    db.close();
    return entry;
  } catch {
    // History is a convenience: a full/quota-blocked IndexedDB must never
    // break the conversion itself.
    return null;
  }
}

export async function listHistoryEntries(): Promise<HistoryEntry[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const all = await new Promise<HistoryEntry[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as HistoryEntry[]);
      req.onerror = () => reject(req.error);
    });
    // Prune expired entries on load.
    const now = Date.now();
    for (const e of all) {
      if (isExpired(e, now)) store.delete(e.id);
    }
    await txDone(tx);
    db.close();
    return all
      .filter((e) => !isExpired(e, now))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
    db.close();
  } catch {
    // ignore
  }
}
