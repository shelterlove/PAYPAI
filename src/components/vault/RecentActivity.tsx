'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatAddress } from '@/lib/wallet';
import { getKiteManager } from '@/lib/kite';

interface ActivityItem {
  hash: string;
  from: string;
  to: string;
  amount: string;
  symbol: string;
  status: string;
  type: string;
  timestamp: number;
}

interface RecentActivityProps {
  signerAddress?: string;
  aaWalletAddress?: string;
  refreshTrigger?: number;
  compact?: boolean;
}

export default function RecentActivity({
  signerAddress,
  aaWalletAddress,
  refreshTrigger,
  compact
}: RecentActivityProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [syncStartedAt, setSyncStartedAt] = useState<number | null>(null);

  const resolvedAddress = useMemo(() => {
    if (aaWalletAddress) return aaWalletAddress;
    if (!signerAddress) return '';
    try {
      return getKiteManager().getAccountAddress(signerAddress);
    } catch {
      return '';
    }
  }, [aaWalletAddress, signerAddress]);

  const loadActivity = async (force = false) => {
    let cancelled = false;
    if (!resolvedAddress) {
      setItems([]);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError('');
    try {
      const url = force
        ? `/api/wallet/activity?address=${resolvedAddress}&refresh=1`
        : `/api/wallet/activity?address=${resolvedAddress}`;
      const res = await fetch(url);
      const data = await res.json();
      if (cancelled) return () => {
        cancelled = true;
      };
      if (!res.ok || data?.error) {
        setError(data?.error || 'Failed to load activity');
      } else {
        setError('');
      }
      setItems(Array.isArray(data.activity) ? data.activity : []);
      setLastSynced(typeof data?.lastSynced === 'number' ? data.lastSynced : null);
      setSyncing(Boolean(data?.syncing));
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Failed to load activity');
        setItems([]);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    loadActivity(false).then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
    };
  }, [resolvedAddress, refreshTrigger]);

  useEffect(() => {
    if (syncing) {
      setSyncStartedAt((prev) => prev ?? Date.now());
    } else {
      setSyncStartedAt(null);
    }
  }, [syncing]);

  const syncTooLong = syncStartedAt ? Date.now() - syncStartedAt > 30000 : false;
  const showError = Boolean(error) && (!syncing || syncTooLong);

  const statusLabel = showError
    ? 'Error'
    : syncing || loading
      ? 'Syncing'
      : items.length
        ? 'Updated'
        : 'Waiting';

  const handleRefresh = async () => {
    await loadActivity(true);
  };

  const formatAmount = (value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return value;
    return num.toFixed(6);
  };

  const visibleItems = showAll ? items.slice(0, 10) : items.slice(0, 3);
  const canShowMore = items.length > 3;

  const content = (
    <>
      {visibleItems.length > 0 && (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const isOutgoing = resolvedAddress
              ? item.from?.toLowerCase() === resolvedAddress.toLowerCase()
              : false;
            const counterparty = isOutgoing ? item.to : item.from;
            return (
              <div
                key={`${item.hash}-${item.symbol}-${item.amount}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--pp-border)] bg-white/90 px-4 py-3 text-sm shadow-[var(--pp-shadow)]"
              >
                <div className="space-y-1">
                  <div className="font-mono text-slate-700">
                    {formatAmount(item.amount)} {item.symbol}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isOutgoing ? 'To' : 'From'} {formatAddress(counterparty)} · {new Date(item.timestamp * 1000).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === 'failed' && (
                    <span className="pill bg-rose-50 text-rose-600 border border-rose-200">Failed</span>
                  )}
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(item.hash)}
                    className="btn-tertiary text-xs px-3 py-1.5"
                  >
                    Copy hash
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {canShowMore && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="btn-tertiary text-xs px-3 py-1.5"
        >
          {showAll ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );

  if (compact) {
    return (
      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600 dark:text-slate-500">
            {showError
              ? 'Unable to load recent activity.'
              : syncing || loading
                ? 'Syncing the latest AA wallet activity…'
                : items.length
                  ? 'Latest AA wallet activity.'
                  : 'No recent transactions yet. Your next action will appear here.'}
            {lastSynced && (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Last synced: {new Date(lastSynced).toLocaleString()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="btn-tertiary text-xs px-2.5 py-1"
              title="Refresh"
              disabled={loading}
            >
              ⟳
            </button>
            <span
              className={`pill ${syncing || loading
                  ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300'
                }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-600 font-semibold">Recent Activity</p>
          <p className="mt-2 text-sm text-slate-500">
            {error
              ? 'Unable to load recent activity.'
              : syncing || loading
                ? 'Syncing the latest AA wallet activity…'
                : items.length
                  ? 'Latest AA wallet activity.'
                  : 'No recent transactions yet. Your next action will appear here.'}
          </p>
          {lastSynced && (
            <p className="mt-2 text-xs text-slate-400">
              Last synced: {new Date(lastSynced).toLocaleString()}
            </p>
          )}
        </div>
        <span
          className={`pill text-slate-700 ${syncing || loading
              ? 'bg-amber-100 text-amber-700 border border-amber-200'
              : 'bg-slate-100 text-slate-600'
            }`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="mt-4 space-y-3">{content}</div>
    </div>
  );
}
