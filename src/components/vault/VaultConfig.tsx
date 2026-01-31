'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { kiteTestnetChain } from '@/lib/wagmi';
import { DEFAULT_VAULT_TOKEN } from '@/types';

interface VaultConfigProps {
  aaWalletAddress: string;
  privateKey: string;
  onConfigured?: () => void;
  vaultAddress?: string;
  embedded?: boolean;
  hideTitle?: boolean;
}

const VAULT_ABI = [
  'function configureSpendingRules((address token, uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] whitelist, address[] blacklist)[] calldata rules) external'
];

export default function VaultConfig({
  aaWalletAddress,
  privateKey,
  onConfigured,
  vaultAddress: vaultAddressProp,
  embedded = false,
  hideTitle = false
}: VaultConfigProps) {
  const [vaultAddress, setVaultAddress] = useState(vaultAddressProp || '');
  const [budget, setBudget] = useState('100');
  const [timeWindow, setTimeWindow] = useState('24');
  const [tokenAddress, setTokenAddress] = useState(DEFAULT_VAULT_TOKEN.ADDRESS);
  const [tokenSymbol, setTokenSymbol] = useState(DEFAULT_VAULT_TOKEN.SYMBOL);
  const [tokenDecimals, setTokenDecimals] = useState(String(DEFAULT_VAULT_TOKEN.DECIMALS));
  const [allowedProviders, setAllowedProviders] = useState('');
  const [blockedProviders, setBlockedProviders] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  useEffect(() => {
    if (vaultAddressProp) {
      setVaultAddress(vaultAddressProp);
    }
  }, [vaultAddressProp]);

  const handleConfigure = async () => {
    setError('');
    setTxHash('');
    setLoading(true);

    try {
      // Validate vault address
      if (!ethers.isAddress(vaultAddress)) {
        throw new Error('Invalid vault address');
      }

      const now = Math.floor(Date.now() / 1000);
      const providers = allowedProviders
        .split(',')
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      for (const addr of providers) {
        if (!ethers.isAddress(addr)) {
          throw new Error(`Invalid provider address: ${addr}`);
        }
      }

      const blocked = blockedProviders
        .split(',')
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      for (const addr of blocked) {
        if (!ethers.isAddress(addr)) {
          throw new Error(`Invalid blacklist address: ${addr}`);
        }
      }

      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      const decimals = parseInt(tokenDecimals, 10);
      if (Number.isNaN(decimals) || decimals < 0) {
        throw new Error('Invalid token decimals');
      }

      const budgetUnits = ethers.parseUnits(
        budget,
        decimals
      ).toString();

      const rules = [{
        token: tokenAddress,
        timeWindow: parseInt(timeWindow, 10) * 3600, // Convert hours to seconds
        budget: budgetUnits,
        initialWindowStartTime: now,
        whitelist: providers,
        blacklist: blocked
      }];

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasPrivateKey) {
        const response = await fetch('/api/vault/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vaultAddress,
            privateKey,
            rules
          })
        });

        const result = await response.json();

        if (result.success) {
          setTxHash(result.transactionHash || '');
          onConfigured?.();
        } else {
          throw new Error(result.error || 'Configuration failed');
        }
      } else if (hasWalletClient) {
        const vaultInterface = new ethers.Interface(VAULT_ABI);
        const callData = vaultInterface.encodeFunctionData('configureSpendingRules', [rules]);

        const hash = await walletClient.sendTransaction({
          account: aaWalletAddress as `0x${string}`,
          to: vaultAddress as `0x${string}`,
          data: callData as `0x${string}`,
          value: 0n
        });

        setTxHash(hash);
        onConfigured?.();
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure vault');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
      {!hideTitle && <h2 className="text-xl font-semibold mb-4">Configure Spending Rules</h2>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-500 mb-2">
            Vault Address
          </label>
          <input
            type="text"
            value={vaultAddress}
            onChange={(e) => setVaultAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
            disabled={loading}
          />
          <p className="text-xs text-slate-500 mt-1">
            Enter your deployed ClientAgentVault address
          </p>
        </div>

        <div>
          <label className="block text-sm text-slate-500 mb-2">
            Token Address
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
            disabled={loading}
          />
          <p className="text-xs text-slate-500 mt-1">
            Token used for spending rule and vault transfers.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-500 mb-2">
              Token Name / Symbol
            </label>
            <input
              type="text"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              placeholder="PPT"
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-2">
              Token Decimals
            </label>
            <input
              type="number"
              value={tokenDecimals}
              onChange={(e) => setTokenDecimals(e.target.value)}
              placeholder="18"
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-500 mb-2">
              Budget ({tokenSymbol || 'Tokens'})
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="100"
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-500 mb-2">
              Time Window (Hours)
            </label>
            <input
              type="number"
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              placeholder="24"
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-500 mb-2">
            Whitelist (Optional)
          </label>
          <input
            type="text"
            value={allowedProviders}
            onChange={(e) => setAllowedProviders(e.target.value)}
            placeholder="0xabc..., 0xdef..."
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
            disabled={loading}
          />
          <p className="text-xs text-slate-500 mt-1">
            Comma-separated whitelist. Leave empty to allow all recipients.
          </p>
        </div>

        <div>
          <label className="block text-sm text-slate-500 mb-2">
            Blacklist (Optional)
          </label>
          <input
            type="text"
            value={blockedProviders}
            onChange={(e) => setBlockedProviders(e.target.value)}
            placeholder="0xabc..., 0xdef..."
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
            disabled={loading}
          />
          <p className="text-xs text-slate-500 mt-1">
            Blacklisted recipients are always blocked, even if whitelisted.
          </p>
        </div>

        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Rule Explanation:</strong>
          </p>
          <ul className="text-xs text-blue-600 mt-2 space-y-1">
            <li>• Budget: Maximum tokens that can be spent</li>
            <li>• Time Window: Period in hours for budget reset</li>
            <li>• Empty whitelist: All recipients allowed</li>
            <li>• Blacklist always blocks recipients</li>
          </ul>
        </div>

        <p className="text-xs text-slate-500">
          Note: Vault spends from your AA wallet balance. Ensure allowance is set.
        </p>
        <p className="text-xs text-slate-500">
          If you change the token, you must approve the vault again.
        </p>

        {error && (
          <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded border border-rose-200">
            {error}
          </div>
        )}

        {txHash && (
          <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded border border-emerald-200">
            <div className="font-semibold mb-1">Rules Configured!</div>
            <div className="font-mono text-xs break-all">
              Hash: {txHash}
            </div>
          </div>
        )}

        <button
          onClick={handleConfigure}
          disabled={loading || !vaultAddress || !budget || !timeWindow || !tokenAddress}
          className="w-full btn-secondary"
        >
          {loading ? 'Configuring...' : 'Configure Rules'}
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <div className="card-soft p-6">
      {content}
    </div>
  );
}
