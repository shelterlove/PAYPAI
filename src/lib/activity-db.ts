import fs from 'fs';
import path from 'path';

export type ActivityRecord = {
  address: string;
  hash: string;
  from: string;
  to: string;
  timestamp: number;
  amount: string;
  symbol: string;
  status: string;
  type: string;
  tokenAddress?: string;
};

type WalletActivityEntry = {
  activity: ActivityRecord[];
  lastSynced: number;
  lastError?: string;
};

type ActivityStore = {
  wallets: Record<string, WalletActivityEntry>;
};

let cachedStore: ActivityStore | null = null;
let loaded = false;

function getDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

function getDbFilePath() {
  return path.join(getDataDir(), 'wallet-activity.json');
}

function loadStore(): ActivityStore {
  if (loaded && cachedStore) return cachedStore;
  loaded = true;

  const filePath = getDbFilePath();
  if (!fs.existsSync(filePath)) {
    cachedStore = { wallets: {} };
    return cachedStore;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw || '{}') as ActivityStore;
    cachedStore = parsed.wallets ? parsed : { wallets: {} };
  } catch {
    cachedStore = { wallets: {} };
  }

  return cachedStore;
}

function saveStore(store: ActivityStore) {
  const filePath = getDbFilePath();
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2));
}

function getEntry(address: string): WalletActivityEntry {
  const store = loadStore();
  if (!store.wallets[address]) {
    store.wallets[address] = { activity: [], lastSynced: 0 };
  }
  return store.wallets[address];
}

export function getActivity(address: string, limit = 100): ActivityRecord[] {
  const entry = getEntry(address);
  return entry.activity.slice(0, limit);
}

export function upsertActivity(address: string, rows: ActivityRecord[], limit = 100) {
  if (!rows.length) return;
  const entry = getEntry(address);
  const existing = entry.activity;
  const map = new Map<string, ActivityRecord>();

  for (const item of existing) {
    const key = `${item.hash}:${item.type}:${item.tokenAddress || ''}`;
    map.set(key, item);
  }
  for (const row of rows) {
    const key = `${row.hash}:${row.type}:${row.tokenAddress || ''}`;
    map.set(key, { ...row, address });
  }

  entry.activity = Array.from(map.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);

  const store = loadStore();
  store.wallets[address] = entry;
  saveStore(store);
}

export function getLastSynced(address: string): number | null {
  const entry = getEntry(address);
  return entry.lastSynced || null;
}

export function setLastSynced(address: string, timestamp: number) {
  const entry = getEntry(address);
  entry.lastSynced = timestamp;
  entry.lastError = undefined;
  const store = loadStore();
  store.wallets[address] = entry;
  saveStore(store);
}

export function getLastError(address: string): string | null {
  const entry = getEntry(address);
  return entry.lastError || null;
}

export function setLastError(address: string, message: string) {
  const entry = getEntry(address);
  entry.lastError = message;
  const store = loadStore();
  store.wallets[address] = entry;
  saveStore(store);
}
