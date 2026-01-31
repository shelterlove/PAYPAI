import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getActivity,
  getLastSynced,
  getLastError,
  setLastSynced,
  setLastError,
  upsertActivity,
  type ActivityRecord
} from '@/lib/activity-db';

export const runtime = 'nodejs';

const inFlight = new Map<string, Promise<void>>();
const SYNC_TTL_MS = 5 * 60 * 1000;

function getExplorerApiBase() {
  const network = process.env.NEXT_PUBLIC_KITE_NETWORK || 'kite_testnet';
  const isTestnet = network.toLowerCase().includes('test');
  return (
    process.env.NEXT_PUBLIC_KITE_EXPLORER_API ||
    process.env.KITE_EXPLORER_API ||
    (isTestnet ? 'https://testnet.kitescan.ai/api' : 'https://kitescan.ai/api')
  );
}

function parseTxList(result: any): ActivityRecord[] {
  if (!result || result.status === '0') {
    const message = String(result?.message || '');
    if (message.toLowerCase().includes('no transactions')) return [];
    return [];
  }
  const list = Array.isArray(result.result) ? result.result : [];
  return list.map((tx: any) => {
    const value = BigInt(tx.value || '0');
    const amount = ethers.formatEther(value);
    const isFailed = tx.isError === '1' || tx.txreceipt_status === '0';
    return {
      address: '',
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      timestamp: Number(tx.timeStamp || 0),
      amount,
      symbol: 'KITE',
      status: isFailed ? 'failed' : 'confirmed',
      type: 'native'
    };
  });
}

function parseTokenTxList(result: any): ActivityRecord[] {
  if (!result || result.status === '0') {
    const message = String(result?.message || '');
    if (message.toLowerCase().includes('no transactions')) return [];
    return [];
  }
  const list = Array.isArray(result.result) ? result.result : [];
  return list.map((tx: any) => {
    const value = BigInt(tx.value || '0');
    const decimals = Number(tx.tokenDecimal || 18);
    const amount = ethers.formatUnits(value, decimals);
    const isFailed = tx.isError === '1' || tx.txreceipt_status === '0';
    return {
      address: '',
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      timestamp: Number(tx.timeStamp || 0),
      amount,
      symbol: tx.tokenSymbol || 'TOKEN',
      status: isFailed ? 'failed' : 'confirmed',
      type: 'token',
      tokenAddress: tx.contractAddress
    };
  });
}

async function fetchJson(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message = data?.message || data?.error || `HTTP ${res.status}`;
      throw new Error(message);
    }
    return data;
  } finally {
    clearTimeout(id);
  }
}

async function fetchAndStore(address: string) {
  const explorerApi = getExplorerApiBase();
  const normalUrl = `${explorerApi}?module=account&action=txlist&address=${address}&page=1&offset=100&sort=desc`;
  const tokenUrl = `${explorerApi}?module=account&action=tokentx&address=${address}&page=1&offset=100&sort=desc`;

  const [normalJson, tokenJson] = await Promise.all([
    fetchJson(normalUrl),
    fetchJson(tokenUrl)
  ]);

  const normalTxs = parseTxList(normalJson);
  const tokenTxs = parseTokenTxList(tokenJson);

  const merged = [...normalTxs, ...tokenTxs]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100)
    .map((item) => ({ ...item, address }));

  upsertActivity(address, merged, 100);
  setLastSynced(address, Date.now());
}

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');
    const refresh = request.nextUrl.searchParams.get('refresh') === '1';

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const now = Date.now();
    const lastSynced = getLastSynced(address) || 0;
    const isStale = !lastSynced || now - lastSynced > SYNC_TTL_MS;

    if ((refresh || isStale) && !inFlight.has(address)) {
      const job = fetchAndStore(address)
        .catch((error) => {
          setLastSynced(address, Date.now());
          setLastError(address, error instanceof Error ? error.message : 'Sync failed');
        })
        .finally(() => {
          inFlight.delete(address);
        });
      inFlight.set(address, job);

      if (refresh) {
        await job;
      }
    }

    const activity = getActivity(address, 100);
    const updatedLastSynced = getLastSynced(address) || lastSynced || now;
    const lastError = getLastError(address);

    return NextResponse.json({
      address,
      activity,
      lastSynced: updatedLastSynced,
      syncing: inFlight.has(address),
      error: lastError || undefined
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch wallet activity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
