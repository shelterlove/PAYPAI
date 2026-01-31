'use client';

import { useEffect, useState } from 'react';
import { ethers, BigNumberish } from 'ethers';
import { formatAddress } from '@/lib/wallet';
import { SpendingRule } from '@/types';
import VaultConfig from './VaultConfig';
import VaultApproval from './VaultApproval';
import VaultExecutor from './VaultExecutor';

interface VaultInfoProps {
  vaultAddress: string;
  aaWalletAddress?: string;
  privateKey?: string;
  onExecutorStatusChange?: (authorized: boolean) => void;
  refreshTrigger?: number;
}

interface VaultData {
  vault: {
    settlementToken: string;
    spendingAccount?: string;
    admin: string;
    balance: string;
  };
  spendingRules: SpendingRule[];
  tokenBalance: string;
  allowance?: string;
  allowanceRaw?: string;
  currentBudget?: string;
  tokenMeta?: {
    symbol?: string;
    decimals?: number;
  };
  executor?: {
    address?: string;
    authorized?: boolean;
  };
}

export default function VaultInfo({
  vaultAddress,
  aaWalletAddress = '',
  privateKey = '',
  onExecutorStatusChange,
  refreshTrigger
}: VaultInfoProps) {
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [pendingTokenAddress, setPendingTokenAddress] = useState('');
  const [pendingTokenError, setPendingTokenError] = useState('');
  const [approveTokenAddress, setApproveTokenAddress] = useState('');
  const [showExecutorModal, setShowExecutorModal] = useState(false);
  const [remainingBudget, setRemainingBudget] = useState<string | null>(null);
  const [remainingBudgetSymbol, setRemainingBudgetSymbol] = useState<string | null>(null);

  const fetchVaultInfo = async (showRefreshing = false) => {
    try {
      setError('');
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`/api/vault/info?address=${vaultAddress}`);

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to fetch vault info');
      }

      const data = await response.json();
      if (data?.error) {
        setError(data.error);
      }
      setVaultData(data);
      if (typeof data?.executor?.authorized === 'boolean') {
        onExecutorStatusChange?.(Boolean(data.executor.authorized));
      }
    } catch (error) {
      console.error('Error fetching vault info:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch vault info');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVaultInfo();

    // Refresh every 15 seconds
    const interval = setInterval(() => fetchVaultInfo(true), 15000);
    return () => clearInterval(interval);
  }, [vaultAddress]);

  useEffect(() => {
    if (!vaultAddress) return;
    if (typeof refreshTrigger === 'number') {
      fetchVaultInfo(true);
    }
  }, [refreshTrigger, vaultAddress]);

  useEffect(() => {
    if (!vaultAddress) return;
    let cancelled = false;

    const fetchActivitySummary = async () => {
      try {
        const res = await fetch(`/api/vault/activity?address=${vaultAddress}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data && typeof data.remainingBudget !== 'undefined') {
          setRemainingBudget(data.remainingBudget);
          setRemainingBudgetSymbol(data.tokenSymbol || null);
        } else {
          setRemainingBudget(null);
          setRemainingBudgetSymbol(null);
        }
      } catch {
        // ignore
      }
    };

    fetchActivitySummary();

    return () => {
      cancelled = true;
    };
  }, [vaultAddress, refreshTrigger]);

  useEffect(() => {
    if (vaultData?.executor) {
      onExecutorStatusChange?.(Boolean(vaultData.executor.authorized));
    }
  }, [vaultData?.executor?.authorized, onExecutorStatusChange]);

  const formatTimeWindow = (seconds: BigNumberish) => {
    const hours = Number(seconds) / 3600;
    return `${hours} hours`;
  };

  const formatBudget = (budget: BigNumberish) => {
    const decimals = vaultData?.tokenMeta?.decimals ?? 18;
    const symbol = vaultData?.tokenMeta?.symbol ?? 'KITE';
    return `${ethers.formatUnits(budget, decimals)} ${symbol}`;
  };

  const formatTimestamp = (timestamp: BigNumberish) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const formatAmount = (value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 'Unlimited';
    return num.toFixed(6);
  };

  const tokenSymbol = vaultData?.tokenMeta?.symbol || 'KITE';
  const tokenBalanceValue = Number(vaultData?.tokenBalance || 0);
  const allowanceValue = Number(vaultData?.allowance || 0);
  const availableValue = Number.isFinite(allowanceValue)
    ? Math.min(tokenBalanceValue || 0, allowanceValue)
    : tokenBalanceValue || 0;
  const executorAuthorized = Boolean(vaultData?.executor?.authorized);
  const isDeployed = Boolean(vaultData?.vault?.admin);
  const deploymentLabel = isDeployed ? 'Deployed' : 'Not Deployed';
  const isMaxAllowance = vaultData?.allowanceRaw === ethers.MaxUint256.toString();
  const allowanceDisplay = isMaxAllowance
    ? 'Follow spending rules'
    : `${formatAmount(vaultData?.allowance || '0')} ${tokenSymbol}`;
  const needsApproval = !Number.isFinite(allowanceValue) || allowanceValue <= 0;
  const currentBudgetDisplay = vaultData?.currentBudget
    ? `${vaultData.currentBudget} ${tokenSymbol}`
    : remainingBudget
      ? `${remainingBudget} ${remainingBudgetSymbol || tokenSymbol}`
      : null;

  if (loading) {
    return (
      <div className="card-soft p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!vaultData) {
    return (
      <div className="card-soft p-6">
        <p className="text-slate-500">
          {error || 'Failed to load vault information'}
        </p>
      </div>
    );
  }

  return (
    <div className="card-soft p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Vault</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill text-xs ${isDeployed ? 'bg-[#5CD5DD]/20 text-[#0F89C0]' : 'bg-white text-slate-600 border border-[color:var(--pp-border)]'}`}>
            {deploymentLabel}
          </span>
          <button
            onClick={() => fetchVaultInfo(true)}
            disabled={refreshing}
            className="btn-tertiary text-xs px-2.5 py-1"
            title="Refresh"
          >
            {refreshing ? '↻' : '⟳'}
          </button>
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="btn-tertiary text-xs px-2.5 py-1"
            title="Vault settings"
          >
            <span aria-hidden>⚙</span>
          </button>
        </div>
      </div>

      {needsApproval && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <span>Vault allowance is zero. Approve the vault to enable spending.</span>
          <button type="button" onClick={() => setShowApproveModal(true)} className="btn-secondary text-xs px-3 py-1">
            Approve Vault
          </button>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            if (!executorAuthorized) {
              setShowExecutorModal(true);
            }
          }}
          className={`w-full rounded-xl border border-[color:var(--pp-border)] bg-white/90 px-4 py-3 shadow-[var(--pp-shadow)] flex items-center justify-between gap-4 text-left transition-all duration-200 ease-out hover:bg-white ${executorAuthorized ? '' : 'cursor-pointer'}`}
        >
          <span className="text-sm text-slate-600 font-semibold">Authorize Status</span>
          <span className={`text-sm font-mono ${executorAuthorized ? 'text-[#0F89C0]' : 'text-amber-600'}`}>
            {executorAuthorized ? 'Authorized' : 'Not Authorized'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setApproveTokenAddress('');
            setShowApproveModal(true);
          }}
          className="w-full rounded-xl border border-[color:var(--pp-border)] bg-white/90 px-4 py-3 shadow-[var(--pp-shadow)] flex items-center justify-between gap-4 text-left transition-all duration-200 ease-out hover:bg-white"
          title="Click to approve"
        >
          <span className="text-sm text-slate-600 font-semibold">{tokenSymbol} Allowance</span>
          <span className="text-sm text-slate-700 font-mono">{allowanceDisplay}</span>
        </button>
        {error && (
          <div className="text-amber-700 text-sm bg-amber-50 p-3 rounded-xl border border-amber-200">
            {error}
          </div>
        )}

        {vaultData.tokenBalance && Number(vaultData.tokenBalance) === 0 && (
          <div className="text-amber-700 text-xs bg-amber-50 p-3 rounded-xl border border-amber-200">
            AA wallet has zero token balance. Fund the AA wallet first.
          </div>
        )}

        {vaultData.spendingRules && vaultData.spendingRules.length > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-700">Spending Rules</h3>
              <span className="pill bg-white text-slate-500 border border-[color:var(--pp-border)] text-xs">
                {vaultData.spendingRules.length} rule{vaultData.spendingRules.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {vaultData.spendingRules.map((rule, index) => (
                <div key={index} className="bg-white/90 p-4 rounded-xl border border-[color:var(--pp-border)] shadow-[var(--pp-shadow)]">
                  <div className="grid gap-6 text-base md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="min-h-[56px]">
                        <span className="text-slate-600">Rule Token</span>
                        <div className="mt-1 min-h-[28px] font-mono text-base text-slate-700">{formatAddress(rule.token)}</div>
                      </div>
                      <div className="min-h-[56px]">
                        <span className="text-slate-600">Budget</span>
                        <div className="mt-1 min-h-[28px] font-mono text-base text-slate-700">
                          {formatBudget(rule.budget)}
                        </div>
                      </div>
                      <div className="min-h-[56px]">
                        <span className="text-slate-600">Start Time</span>
                        <div className="mt-1 min-h-[28px] font-mono text-base text-slate-700">
                          {formatTimestamp(rule.initialWindowStartTime)}
                        </div>
                      </div>
                      <div className="min-h-[56px]">
                        <span className="text-slate-600">Time Window</span>
                        <div className="mt-1 min-h-[28px] font-mono text-base text-slate-700">
                          {formatTimeWindow(rule.timeWindow)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="min-h-[56px] flex items-start">
                        <button
                          type="button"
                          onClick={() => setShowRuleEditor(true)}
                          className="btn-secondary text-xs px-3 py-1"
                        >
                          Change Rules
                        </button>
                      </div>
                      <div className="min-h-[56px]">
                        <span className="text-slate-600">Current Budget</span>
                        <div className="mt-1 min-h-[28px] font-mono text-base text-slate-700">
                          {currentBudgetDisplay && index === 0
                            ? currentBudgetDisplay
                            : formatBudget(rule.budget)}
                        </div>
                      </div>
                      <div className="min-h-[56px]">
                        <span className="text-slate-600">Whitelist</span>
                        {rule.whitelist && rule.whitelist.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {rule.whitelist.map((provider, idx) => (
                              <div key={idx} className="min-h-[28px] font-mono text-base text-slate-700">
                                {formatAddress(provider)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-1 min-h-[28px] text-base text-slate-700">All recipients allowed</div>
                        )}
                      </div>
                      <div className="min-h-[56px]">
                        <span className="text-slate-600">Blacklist</span>
                        {rule.blacklist && rule.blacklist.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {rule.blacklist.map((provider, idx) => (
                              <div key={idx} className="min-h-[28px] font-mono text-base text-slate-700">
                                {formatAddress(provider)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-1 min-h-[28px] text-base text-slate-700">None</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {showDetails && (
          <div className="mt-3 rounded-xl border border-[color:var(--pp-border)] bg-white/90 p-4 shadow-[var(--pp-shadow)]">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-600 font-semibold">Vault Settings</div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="btn-tertiary text-xs px-2.5 py-1"
              >
                Hide
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {vaultAddress && (
                <InfoRow
                  label="Vault Address"
                  value={formatAddress(vaultAddress)}
                  fullValue={vaultAddress}
                  valueClassName="break-all"
                />
              )}
              <div className="mt-2 rounded-lg border border-[color:var(--pp-border)] bg-white p-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-600 font-semibold mb-2">Add Token Allowance</div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={pendingTokenAddress}
                    onChange={(e) => {
                      setPendingTokenAddress(e.target.value);
                      setPendingTokenError('');
                    }}
                    placeholder="0x..."
                    className="flex-1 min-w-[220px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = pendingTokenAddress.trim();
                      if (!trimmed || !ethers.isAddress(trimmed)) {
                        setPendingTokenError('Enter a valid token address.');
                        return;
                      }
                      setApproveTokenAddress(trimmed);
                      setShowApproveModal(true);
                    }}
                    className="btn-tertiary px-3"
                    title="Add token allowance"
                  >
                    +
                  </button>
                </div>
                {pendingTokenError && (
                  <div className="mt-2 text-xs text-rose-600">{pendingTokenError}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {showExecutorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm px-4">
          <div className="w-full max-w-3xl">
            <div className="flex items-center justify-end mb-3">
              <button
                type="button"
                onClick={() => setShowExecutorModal(false)}
                className="btn-tertiary text-xs px-2.5 py-1"
              >
                Close
              </button>
            </div>
            <VaultExecutor
              vaultAddress={vaultAddress}
              aaWalletAddress={aaWalletAddress}
              privateKey={privateKey}
              onAuthorized={(authorized) => {
                setShowExecutorModal(false);
                fetchVaultInfo(true);
              }}
            />
          </div>
        </div>
      )}
      {showRuleEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl card-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Change Spending Rules</h3>
              <button
                type="button"
                onClick={() => setShowRuleEditor(false)}
                className="btn-tertiary text-xs px-2.5 py-1"
              >
                Close
              </button>
            </div>
            <VaultConfig
              aaWalletAddress={aaWalletAddress}
              privateKey={privateKey}
              vaultAddress={vaultAddress}
              onConfigured={() => {
                setShowRuleEditor(false);
                fetchVaultInfo(true);
              }}
              embedded
              hideTitle
            />
          </div>
        </div>
      )}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm px-4">
          <div className="w-full max-w-3xl">
            <div className="flex items-center justify-end mb-3">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="btn-tertiary text-xs px-2.5 py-1"
              >
                Close
              </button>
            </div>
            <VaultApproval
              signerAddress={aaWalletAddress}
              privateKey={privateKey}
              vaultAddress={vaultAddress}
              presetTokenAddress={approveTokenAddress || undefined}
              onApproved={() => {
                setShowApproveModal(false);
                fetchVaultInfo(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  fullValue,
  valueClassName
}: {
  label: string;
  value: React.ReactNode;
  fullValue?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-slate-200 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <div className="flex items-center gap-2 max-w-[70%]">
        <span
          className={`text-right font-mono text-sm text-slate-700 ${valueClassName || ''}`}
          title={fullValue}
        >
          {value}
        </span>
        {fullValue && (
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(fullValue)}
            className="btn-tertiary px-2 py-0.5 text-xs"
            title="Copy"
          >
            ⧉
          </button>
        )}
      </div>
    </div>
  );
}
