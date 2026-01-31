'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { formatAddress } from '@/lib/wallet';
import { kiteTestnetChain } from '@/lib/wagmi';

interface VaultExecutorProps {
  vaultAddress: string;
  aaWalletAddress: string;
  privateKey: string;
  onAuthorized?: (authorized: boolean) => void;
}

const VAULT_ABI = [
  'function setExecutor(address executor, bool allowed) external'
];

export default function VaultExecutor({
  vaultAddress,
  aaWalletAddress,
  privateKey,
  onAuthorized
}: VaultExecutorProps) {
  const [executorAddress, setExecutorAddress] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  const fetchExecutorInfo = async () => {
    try {
      const response = await fetch('/api/vault/executor-info');
      if (!response.ok) return;
      const data = await response.json();
      if (data.address) {
        setExecutorAddress(data.address);
      }
    } catch {
      // ignore
    }
  };

  const fetchAuthorizationStatus = async () => {
    if (!vaultAddress) return;
    try {
      const response = await fetch(`/api/vault/info?address=${vaultAddress}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.executor) {
        setAuthorized(Boolean(data.executor.authorized));
        onAuthorized?.(Boolean(data.executor.authorized));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchExecutorInfo();
  }, []);

  useEffect(() => {
    fetchAuthorizationStatus();
  }, [vaultAddress]);

  const handleAuthorize = async () => {
    setError('');
    setTxHash('');
    setLoading(true);

    try {
      if (!executorAddress) {
        throw new Error('Executor address not configured');
      }

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasWalletClient) {
        const vaultInterface = new ethers.Interface(VAULT_ABI);
        const callData = vaultInterface.encodeFunctionData('setExecutor', [
          executorAddress,
          true
        ]);

        const hash = await walletClient.sendTransaction({
          account: aaWalletAddress as `0x${string}`,
          to: vaultAddress as `0x${string}`,
          data: callData as `0x${string}`,
          value: 0n
        });

        setTxHash(hash);
      } else if (hasPrivateKey) {
        const response = await fetch('/api/vault/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vaultAddress,
            privateKey,
            executor: executorAddress
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Authorization failed');
        }

        setTxHash(result.transactionHash || '');
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }

      setAuthorized(true);
      onAuthorized?.(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authorize executor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-soft p-6">
      <h2 className="text-xl font-semibold mb-4 text-slate-900">Authorize AI Executor</h2>

      <div className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Executor Address</div>
          <div className="text-xs font-mono text-blue-600 break-all">
            {executorAddress ? formatAddress(executorAddress) : 'Not configured'}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${authorized ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span className="text-slate-600">
            {authorized ? 'Executor authorized' : 'Executor not authorized'}
          </span>
        </div>

        {error && (
          <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl border border-rose-200">
            {error}
          </div>
        )}

        {txHash && (
          <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <div className="font-semibold mb-1">Authorization Successful!</div>
            <div className="font-mono text-xs break-all">
              Hash: {txHash}
            </div>
          </div>
        )}

        <button
          onClick={handleAuthorize}
          disabled={loading || authorized || !executorAddress}
          className="w-full btn-secondary"
        >
          {loading ? 'Authorizing...' : authorized ? 'Already Authorized' : 'Authorize Executor'}
        </button>

        <p className="text-xs text-slate-500">
          This is a one-time approval. After this, AI can execute within the vault rules without prompting you again.
        </p>
      </div>
    </div>
  );
}
