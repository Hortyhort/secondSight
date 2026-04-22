import { EventRecord } from '../types';
import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'second-sight-history';
const MIGRATION_KEY = 'second-sight-migrated-to-idb';

async function performMigrationIfNeeded() {
  const isMigrated = localStorage.getItem(MIGRATION_KEY);
  if (!isMigrated) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const oldRecords = JSON.parse(raw);
        await set(STORAGE_KEY, oldRecords);
        // We do not delete from localStorage immediately just to be safe, but mark as migrated
      }
      localStorage.setItem(MIGRATION_KEY, 'true');
    } catch (err) {
      console.error('Failed to migrate from localStorage to IndexedDB', err);
    }
  }
}

// Automatically initiate migration on module load
let migrationPromise = performMigrationIfNeeded();

const notifyStorageUpdate = () => {
  window.dispatchEvent(new Event('records-updated'));
};

export async function saveRecord(record: EventRecord): Promise<void> {
  await migrationPromise;
  try {
    const existing = await getRecords(true);
    existing.unshift(record);
    await set(STORAGE_KEY, existing);
    notifyStorageUpdate();
  } catch (err) {
    console.error('Error saving record to IndexedDB', err);
  }
}

export async function updateRecordAnalysis(id: string, analysis: EventRecord['analysis']): Promise<void> {
  await updateRecord(id, { analysis });
}

export async function getRecords(includeArchived = false): Promise<EventRecord[]> {
  await migrationPromise;
  try {
    const all = await get<EventRecord[]>(STORAGE_KEY) || [];
    return includeArchived ? all : all.filter(r => !r.isArchived);
  } catch (err) {
    console.error('Error reading records', err);
    return [];
  }
}

export async function updateRecord(id: string, updates: Partial<EventRecord>): Promise<void> {
  await migrationPromise;
  try {
    const existing = await getRecords(true);
    const index = existing.findIndex((r: EventRecord) => r.id === id);
    if (index !== -1) {
      existing[index] = { ...existing[index], ...updates };
      await set(STORAGE_KEY, existing);
      notifyStorageUpdate();
    }
  } catch(err) {
    console.error(err);
  }
}

export async function deleteRecord(id: string): Promise<void> {
  await migrationPromise;
  try {
    const existing = await getRecords(true);
    const filtered = existing.filter((r: EventRecord) => r.id !== id);
    await set(STORAGE_KEY, filtered);
    notifyStorageUpdate();
  } catch (err) {
    console.error(err);
  }
}
