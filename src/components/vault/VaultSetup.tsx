'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { getVaultSalt } from '@/lib/vault-utils';
import { kiteTestnetChain } from '@/lib/wagmi';
import { DEFAULT_VAULT_TOKEN } from '@/types';

interface VaultSetupProps {
  signerAddress: string;
  privateKey: string;
  onReady?: (vaultAddress: string) => void;
}

const FACTORY_ABI = [
  'function deployDeterministic(address admin, address spendingAccount, bytes32 userSalt) external returns (address)',
  'function getVaultAddress(address admin, address spendingAccount, bytes32 userSalt) external view returns (address)'
];

const VAULT_ABI = [
  'function configureSpendingRules((address token, uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] whitelist, address[] blacklist)[] calldata rules) external',
  'function setExecutor(address executor, bool allowed) external'
];

export default function VaultSetup({ signerAddress, privateKey, onReady }: VaultSetupProps) {
  const [budget, setBudget] = useState('100');
  const [timeWindow, setTimeWindow] = useState('24');
  const [tokenAddress, setTokenAddress] = useState(DEFAULT_VAULT_TOKEN.ADDRESS);
  const [tokenSymbol, setTokenSymbol] = useState(DEFAULT_VAULT_TOKEN.SYMBOL);
  const [tokenDecimals, setTokenDecimals] = useState(String(DEFAULT_VAULT_TOKEN.DECIMALS));
  const [allowedProviders, setAllowedProviders] = useState('');
  const [blockedProviders, setBlockedProviders] = useState('');
  const [executorAddress, setExecutorAddress] = useState('');
  const [vaultAddress, setVaultAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });
  const publicClient = usePublicClient({ chainId: kiteTestnetChain.id });

  useEffect(() => {
    const loadExecutor = async () => {
      try {
        const res = await fetch('/api/vault/executor-info');
        if (!res.ok) return;
        const data = await res.json();
        if (data.address) setExecutorAddress(data.address);
      } catch {
        // ignore
      }
    };
    loadExecutor();
  }, []);

  const parseProviders = () => {
    const providers = allowedProviders
      .split(',')
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    for (const addr of providers) {
      if (!ethers.isAddress(addr)) {
        throw new Error(`Invalid whitelist address: ${addr}`);
      }
    }

    return providers;
  };

  const parseBlocked = () => {
    const blocked = blockedProviders
      .split(',')
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    for (const addr of blocked) {
      if (!ethers.isAddress(addr)) {
        throw new Error(`Invalid blacklist address: ${addr}`);
      }
    }

    return blocked;
  };

  const buildRules = () => {
    const now = Math.floor(Date.now() / 1000);
    const providers = parseProviders();
    const blocked = parseBlocked();

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

    return [{
      token: tokenAddress,
      timeWindow: parseInt(timeWindow, 10) * 3600,
      budget: budgetUnits,
      initialWindowStartTime: now,
      whitelist: providers,
      blacklist: blocked
    }];
  };

  const waitForReceipt = async (hash: `0x${string}`) => {
    if (!publicClient) return;
    await publicClient.waitForTransactionReceipt({ hash });
  };

  const fetchVaultAddress = async () => {
    const response = await fetch(`/api/vault/calculate?address=${signerAddress}`);
    const info = await response.json();
    if (info.vaultAddress) {
      setVaultAddress(info.vaultAddress);
    }
    return info;
  };

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    setStep('');

    try {
      if (!executorAddress) {
        throw new Error('Executor address not configured. Set EXECUTOR_PRIVATE_KEY on server.');
      }

      const factory = process.env.NEXT_PUBLIC_VAULT_FACTORY;
      if (!factory || factory === '0x0000000000000000000000000000000000000000') {
        throw new Error('Vault factory not configured.');
      }

      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;
      const hasPrivateKey = privateKey && privateKey.length > 0;

      const rules = buildRules();

      if (hasWalletClient) {
        const info = await fetchVaultAddress();
        let resolvedVault = info.vaultAddress as string | undefined;
        const spendingAccount = info.aaWalletAddress as string | undefined;

        if (!spendingAccount) {
          throw new Error('Failed to resolve AA wallet address.');
        }

        if (!info.deployed) {
          setStep('Deploying vault...');
          const salt = getVaultSalt(signerAddress);
          const factoryInterface = new ethers.Interface(FACTORY_ABI);
          const deployCall = factoryInterface.encodeFunctionData('deployDeterministic', [
            signerAddress,
            spendingAccount,
            salt
          ]);

          const deployHash = await walletClient.sendTransaction({
            account: signerAddress as `0x${string}`,
            to: factory as `0x${string}`,
            data: deployCall as `0x${string}`,
            value: 0n
          });
          await waitForReceipt(deployHash);
          const refreshed = await fetchVaultAddress();
          resolvedVault = refreshed.vaultAddress;
        }

        if (!resolvedVault) {
          throw new Error('Failed to resolve vault address after deployment.');
        }

        setStep('Configuring spending rules...');
        const vaultInterface = new ethers.Interface(VAULT_ABI);
        const configCall = vaultInterface.encodeFunctionData('configureSpendingRules', [rules]);
        const configHash = await walletClient.sendTransaction({
          account: signerAddress as `0x${string}`,
          to: resolvedVault as `0x${string}`,
          data: configCall as `0x${string}`,
          value: 0n
        });
        await waitForReceipt(configHash);

        setStep('Authorizing executor...');
        const authCall = vaultInterface.encodeFunctionData('setExecutor', [
          executorAddress,
          true
        ]);
        const authHash = await walletClient.sendTransaction({
          account: signerAddress as `0x${string}`,
          to: resolvedVault as `0x${string}`,
          data: authCall as `0x${string}`,
          value: 0n
        });
        await waitForReceipt(authHash);

        setStep('Vault ready!');
        onReady?.(resolvedVault);
      } else if (hasPrivateKey) {
        const info = await fetchVaultAddress();
        let resolvedVault = info.vaultAddress as string | undefined;

        if (!info.deployed) {
          setStep('Deploying vault...');
          const deployRes = await fetch('/api/vault/deploy-factory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signerAddress,
              privateKey,
              factoryAddress: factory
            })
          });
          const deployData = await deployRes.json();
          if (!deployData.success) {
            throw new Error(deployData.error || 'Vault deployment failed');
          }
          resolvedVault = deployData.vaultAddress;
        }

        if (!resolvedVault) {
          throw new Error('Failed to resolve vault address after deployment.');
        }
        setVaultAddress(resolvedVault);

        setStep('Configuring spending rules...');
        const configRes = await fetch('/api/vault/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vaultAddress: resolvedVault,
            privateKey,
            rules
          })
        });
        const configData = await configRes.json();
        if (!configData.success) {
          throw new Error(configData.error || 'Configure rules failed');
        }

        setStep('Authorizing executor...');
        const authRes = await fetch('/api/vault/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vaultAddress: resolvedVault,
            privateKey,
            executor: executorAddress
          })
        });
        const authData = await authRes.json();
        if (!authData.success) {
          throw new Error(authData.error || 'Executor authorization failed');
        }

        setStep('Vault ready!');
        onReady?.(resolvedVault);
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vault setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="vault-setup" className="card-soft p-6">
      <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-pp-cyan dark:to-blue-400">Create Vault (One Step)</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">Token Address</label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-white font-mono text-sm focus:border-blue-400 dark:focus:border-blue-400/50 focus:outline-none"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">Token Name / Symbol</label>
            <input
              type="text"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-white text-sm focus:border-blue-400 dark:focus:border-blue-400/50 focus:outline-none"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">Token Decimals</label>
            <input
              type="number"
              value={tokenDecimals}
              onChange={(e) => setTokenDecimals(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-white font-mono text-sm focus:border-blue-400 dark:focus:border-blue-400/50 focus:outline-none"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
              Budget ({tokenSymbol || 'Tokens'})
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-white font-mono text-sm focus:border-blue-400 dark:focus:border-blue-400/50 focus:outline-none"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">Time Window (Hours)</label>
            <input
              type="number"
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-white font-mono text-sm focus:border-blue-400 dark:focus:border-blue-400/50 focus:outline-none"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
            Whitelist (Optional)
          </label>
          <input
            type="text"
            value={allowedProviders}
            onChange={(e) => setAllowedProviders(e.target.value)}
            placeholder="0xabc..., 0xdef..."
            className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-white font-mono text-sm focus:border-blue-400 dark:focus:border-blue-400/50 focus:outline-none"
            disabled={loading}
          />
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Leave empty to allow all recipients.
          </p>
        </div>

        <div>
          <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
            Blacklist (Optional)
          </label>
          <input
            type="text"
            value={blockedProviders}
            onChange={(e) => setBlockedProviders(e.target.value)}
            placeholder="0xabc..., 0xdef..."
            className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-white font-mono text-sm focus:border-blue-400 dark:focus:border-blue-400/50 focus:outline-none"
            disabled={loading}
          />
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Blacklisted recipients are always blocked.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-blue-500/10 p-3 rounded-xl border border-slate-200 dark:border-blue-500/30">
          <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">Executor</div>
          <div className="text-xs font-mono text-blue-600 dark:text-pp-cyan break-all">
            {executorAddress || 'Not configured'}
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          This vault spends from your AA wallet balance. Approve the vault after creation.
        </p>

        {step && (
          <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 p-3 rounded-xl border border-blue-200 dark:border-blue-500/30">
            {step}
          </div>
        )}

        {error && (
          <div className="text-rose-600 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-200 dark:border-rose-500/30">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading || !tokenAddress}
          className="w-full btn-secondary"
        >
          {loading ? 'Setting up...' : 'Create Vault & Authorize'}
        </button>
      </div>
    </div>
  );
}
