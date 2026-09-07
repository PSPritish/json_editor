import Dexie, { type EntityTable } from "dexie";

/* ============================================================
   Database Schema for RiskJSON Editor
   - files: file handles + metadata
   - snapshots: versioned snapshots (Time Machine)
   - settings: user preferences
   ============================================================ */

export interface FileRecord {
  id?: number;
  name: string;
  handle?: FileSystemFileHandle; // persisted for re-opening
  lastOpened: number; // epoch ms
  sizeBytes: number;
}

export interface SnapshotRecord {
  id?: number;
  fileId: number;
  content: string;
  timestamp: number; // epoch ms
  label: string;
  sizeBytes: number;
}

export interface SettingRecord {
  key: string;
  value: string;
}

class RiskJsonDB extends Dexie {
  files!: EntityTable<FileRecord, "id">;
  snapshots!: EntityTable<SnapshotRecord, "id">;
  settings!: EntityTable<SettingRecord, "key">;

  constructor() {
    super("RiskJsonDB");

    this.version(1).stores({
      files: "++id, name, lastOpened",
      snapshots: "++id, fileId, timestamp",
      settings: "key",
    });
  }
}

export const db = new RiskJsonDB();

// --- Snapshot Helpers ---

const MAX_SNAPSHOTS_PER_FILE = 50;

export async function createSnapshot(
  fileId: number,
  content: string,
  label: string = "Auto-save"
): Promise<number> {
  const id = await db.snapshots.add({
    fileId,
    content,
    timestamp: Date.now(),
    label,
    sizeBytes: new Blob([content]).size,
  });

  // Prune old snapshots beyond the limit
  const allSnapshots = await db.snapshots
    .where("fileId")
    .equals(fileId)
    .sortBy("timestamp");

  if (allSnapshots.length > MAX_SNAPSHOTS_PER_FILE) {
    const toDelete = allSnapshots
      .slice(0, allSnapshots.length - MAX_SNAPSHOTS_PER_FILE)
      .map((s) => s.id!)
      .filter(Boolean);
    await db.snapshots.bulkDelete(toDelete);
  }

  return id as number;
}

export async function getSnapshots(fileId: number): Promise<SnapshotRecord[]> {
  return db.snapshots
    .where("fileId")
    .equals(fileId)
    .reverse()
    .sortBy("timestamp");
}

export async function getSnapshot(
  snapshotId: number
): Promise<SnapshotRecord | undefined> {
  return db.snapshots.get(snapshotId);
}

export async function deleteSnapshot(snapshotId: number): Promise<void> {
  await db.snapshots.delete(snapshotId);
}

// --- File Helpers ---

export async function saveFileRecord(
  record: Omit<FileRecord, "id">
): Promise<number> {
  return (await db.files.add(record)) as number;
}

export async function updateFileRecord(
  id: number,
  changes: Partial<FileRecord>
): Promise<void> {
  await db.files.update(id, changes);
}

export async function getRecentFiles(limit = 10): Promise<FileRecord[]> {
  return db.files.orderBy("lastOpened").reverse().limit(limit).toArray();
}

// --- Settings Helpers ---

export async function getSetting(key: string): Promise<string | undefined> {
  const record = await db.settings.get(key);
  return record?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}
