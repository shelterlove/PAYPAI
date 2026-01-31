'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWalletClient, useAccount } from 'wagmi';
import { formatAddress } from '@/lib/wallet';
import { createWalletClientSignFunction } from '@/lib/wallet-client';
import { kiteTestnetChain } from '@/lib/wagmi';
import { AAWallet } from '@/types';
import RecentActivity from '@/components/vault/RecentActivity';

interface WalletInfoProps {
  signerAddress: string;
  privateKey: string;
  onDeploymentStatusChange?: (deployed: boolean) => void;
  aaWalletAddress?: string;
  refreshTrigger?: number;
}

interface WalletData {
  wallet: AAWallet;
  balance: string;
  signerBalance: string;
}

export default function WalletInfo({ signerAddress, privateKey, onDeploymentStatusChange, refreshTrigger }: WalletInfoProps) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fundingAmount, setFundingAmount] = useState('0.01');
  const [funding, setFunding] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [tokenAddressInput, setTokenAddressInput] = useState('');
  const [tokenNameInput, setTokenNameInput] = useState('');
  const [tokenImportError, setTokenImportError] = useState('');
  const [importingToken, setImportingToken] = useState(false);
  const [importedTokens, setImportedTokens] = useState<Array<{
    address: string;
    name: string;
    balance: string;
  }>>([
    {
      address: '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63',
      name: 'USDT',
      balance: '0'
    }
  ]);
  const [showAddToken, setShowAddToken] = useState(true);
  const [showRecentActivity, setShowRecentActivity] = useState(false);

  // Get wagmi connection status
  const { isConnected } = useAccount();

  // Get wallet client for MetaMask signing
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  // Debug: log wallet client status
  useEffect(() => {
    console.log('=== WalletInfo Debug ===');
    console.log('signerAddress:', signerAddress);
    console.log('privateKey:', privateKey);
    console.log('privateKey length:', privateKey?.length);
    console.log('isConnected (wagmi):', isConnected);
    console.log('walletClient:', walletClient ? 'exists' : 'null');
    console.log('isWalletClientLoading:', isWalletClientLoading);
  }, [signerAddress, privateKey, isConnected, walletClient, isWalletClientLoading]);

  const fetchWalletInfo = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(
        `/api/wallet/info?address=${signerAddress}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch wallet info');
      }

      const data = await response.json();
      setWalletData(data);

      // Notify parent component about deployment status
      if (onDeploymentStatusChange) {
        onDeploymentStatusChange(data.wallet.isDeployed);
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletInfo();

    // Refresh every 10 seconds
    const interval = setInterval(() => fetchWalletInfo(true), 10000);
    return () => clearInterval(interval);
  }, [signerAddress, refreshTrigger]);

  const handleDeploy = async () => {
    try {
      setDeploying(true);

      console.log('=== Deploy Wallet ===');
      console.log('privateKey:', privateKey);
      console.log('privateKey type:', typeof privateKey);
      console.log('privateKey length:', privateKey?.length);
      console.log('!privateKey:', !privateKey);
      console.log('isConnected:', isConnected);
      console.log('walletClient:', walletClient);
      console.log('isWalletClientLoading:', isWalletClientLoading);

      // Determine deployment method
      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      console.log('hasPrivateKey:', hasPrivateKey);
      console.log('hasWalletClient:', hasWalletClient);

      // If using MetaMask (no private key but have wallet client)
      if (!hasPrivateKey && hasWalletClient) {
        console.log('Deploying with MetaMask...');

        // Dynamically import Kite SDK to avoid SSR issues
        const { getKiteManager } = await import('@/lib/kite');
        const kiteManager = getKiteManager();
        const sdk = kiteManager.getSDK();

        // Create sign function using MetaMask
        const signFunction = createWalletClientSignFunction(walletClient, signerAddress);

        // Send deployment transaction
        const deployRequest = {
          target: signerAddress,
          value: 0n,
          callData: '0x'
        };

        console.log('Sending user operation...');
        const result = await sdk.sendUserOperationAndWait(
          signerAddress,
          deployRequest,
          signFunction
        );

        console.log('Deploy result:', result);

        if (result.status?.status === 'success') {
          alert('Wallet deployed successfully!');
          fetchWalletInfo();
        } else {
          const errorMsg = result.status?.reason || 'Unknown error';
          alert(`Deployment failed: ${errorMsg}`);
          console.error('Deployment error details:', result);
        }
      } else if (hasPrivateKey) {
        console.log('Deploying with private key...');
        // Use private key method
        const response = await fetch('/api/wallet/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signerAddress, privateKey })
        });

        const result = await response.json();
        console.log('Deploy response:', result);

        if (!response.ok) {
          const errorMsg = result.error || result.details || 'Unknown error';
          alert(`Deployment failed: ${errorMsg}`);
          return;
        }

        if (result.status?.status === 'success') {
          alert('Wallet deployed successfully!');
          fetchWalletInfo();
        } else {
          const errorMsg = result.status?.reason || result.error || result.details || 'Unknown error';
          alert(`Deployment failed: ${errorMsg}`);
          console.error('Deployment error details:', result);
        }
      } else {
        console.error('No wallet connection available');
        console.error('- hasPrivateKey:', hasPrivateKey);
        console.error('- hasWalletClient:', hasWalletClient);
        console.error('- isConnected:', isConnected);
        console.error('- walletClient:', walletClient);
        console.error('- isWalletClientLoading:', isWalletClientLoading);

        if (isWalletClientLoading) {
          alert('Wallet is still loading. Please wait a moment and try again.');
        } else if (!isConnected) {
          alert('Wallet not connected. Please reconnect your wallet.');
        } else {
          alert('No wallet connection available. Please reconnect your wallet.');
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to deploy wallet: ${errorMsg}`);
      console.error('Deploy error:', error);
    } finally {
      setDeploying(false);
    }
  };

  const handleFund = async () => {
    if (!walletData) return;

    try {
      setFunding(true);
      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasPrivateKey) {
        const response = await fetch('/api/wallet/fund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signerAddress,
            aaWalletAddress: walletData.wallet.address,
            amount: fundingAmount,
            privateKey
          })
        });

        const result = await response.json();

        if (result.success) {
          alert(`Successfully funded ${result.amount} ETH to AA wallet!`);
          fetchWalletInfo();
        } else {
          alert(`Funding failed: ${result.error || 'Unknown error'}`);
        }
      } else if (hasWalletClient) {
        const hash = await walletClient.sendTransaction({
          account: signerAddress as `0x${string}`,
          to: walletData.wallet.address as `0x${string}`,
          value: ethers.parseEther(fundingAmount)
        });

        alert(`Funding submitted: ${hash}`);
        fetchWalletInfo();
      } else {
        alert('Wallet not connected. Please reconnect and try again.');
      }
    } catch (error) {
      alert('Failed to fund wallet');
      console.error(error);
    } finally {
      setFunding(false);
    }
  };

  const tokenKey = importedTokens.map((token) => token.address.toLowerCase()).join('|');

  const handleAddToken = async () => {
    setTokenImportError('');
    const address = tokenAddressInput.trim();
    let name = tokenNameInput.trim();

    if (!address || !ethers.isAddress(address)) {
      setTokenImportError('Enter a valid token address.');
      return;
    }
    if (!walletData?.wallet?.address) {
      setTokenImportError('AA wallet address not available yet.');
      return;
    }
    if (importedTokens.some((token) => token.address.toLowerCase() === address.toLowerCase())) {
      setTokenImportError('Token already added.');
      return;
    }

    setImportingToken(true);
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL);
      const erc20 = new ethers.Contract(
        address,
        [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)'
        ],
        provider
      );

      let decimals = 18;
      try {
        decimals = Number(await erc20.decimals());
      } catch {
        decimals = 18;
      }

      if (!name) {
        try {
          name = await erc20.symbol();
        } catch {
          name = 'TOKEN';
        }
      }

      const balance = await erc20.balanceOf(walletData.wallet.address);
      const formatted = ethers.formatUnits(balance, decimals);

      setImportedTokens((prev) => [
        ...prev,
        { address, name, balance: formatted }
      ]);
      setTokenAddressInput('');
      setTokenNameInput('');
    } catch (error) {
      setTokenImportError(error instanceof Error ? error.message : 'Failed to import token.');
    } finally {
      setImportingToken(false);
    }
  };

  useEffect(() => {
    if (!walletData?.wallet?.address || importedTokens.length === 0) return;
    let cancelled = false;

    const refreshTokenBalances = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL);
        const updated = await Promise.all(
          importedTokens.map(async (token) => {
            const erc20 = new ethers.Contract(
              token.address,
              [
                'function balanceOf(address owner) view returns (uint256)',
                'function decimals() view returns (uint8)',
                'function symbol() view returns (string)'
              ],
              provider
            );

            let decimals = 18;
            try {
              decimals = Number(await erc20.decimals());
            } catch {
              decimals = 18;
            }

            let name = token.name;
            if (!name) {
              try {
                name = await erc20.symbol();
              } catch {
                name = 'TOKEN';
              }
            }

            const balance = await erc20.balanceOf(walletData.wallet.address);
            return {
              ...token,
              name,
              balance: ethers.formatUnits(balance, decimals)
            };
          })
        );

        if (!cancelled) {
          const hasChange = updated.some((token, index) => token.balance !== importedTokens[index]?.balance || token.name !== importedTokens[index]?.name);
          if (hasChange) {
            setImportedTokens(updated);
          }
        }
      } catch {
        // ignore balance refresh errors
      }
    };

    refreshTokenBalances();

    return () => {
      cancelled = true;
    };
  }, [walletData?.wallet?.address, refreshTrigger, tokenKey]);

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-white/20 rounded w-3/4"></div>
            <div className="h-4 bg-white/20 rounded w-1/2"></div>
            <div className="h-4 bg-white/20 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!walletData) {
    return (
      <div className="card p-6 border-red-500/30 bg-red-500/10">
        <p className="text-red-200">Failed to load wallet information</p>
      </div>
    );
  }

  const aaBalance = Number(walletData.balance);
  const deploymentLabel = walletData.wallet.isDeployed ? 'Deployed' : 'Not Deployed';
  const aaWalletAddress = walletData.wallet?.address || '';

  return (
    <div id="wallet-info" className="card p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-pp-cyan">Wallet</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill text-xs ${walletData.wallet.isDeployed ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-pp-cyan/20 dark:text-pp-cyan dark:border-pp-cyan/50' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/20'}`}>
            {deploymentLabel}
          </span>
          <button
            onClick={() => fetchWalletInfo(true)}
            disabled={refreshing}
            className="btn-tertiary text-xs px-2.5 py-1 bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
            title="Refresh"
          >
            {refreshing ? '↻' : '⟳'}
          </button>
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="btn-tertiary text-xs px-2.5 py-1 bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
            title="Wallet settings"
          >
            <span aria-hidden>⚙</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-lg backdrop-blur-sm min-h-[100px] flex flex-col justify-center transition-transform hover:scale-[1.02]">
          <div className="text-sm uppercase tracking-[0.1em] text-blue-600 dark:text-pp-cyan/80 font-bold mb-1">KITE</div>
          <div className="metric text-4xl">{Number.isFinite(aaBalance) ? aaBalance.toFixed(2) : '0.00'}</div>
        </div>
        {importedTokens.map((token) => (
          <div
            key={token.address}
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-lg backdrop-blur-sm min-h-[100px] flex flex-col justify-center transition-transform hover:scale-[1.02]"
          >
            <div className="text-sm uppercase tracking-[0.1em] text-purple-600 dark:text-pp-purple/80 font-bold mb-1">{token.name}</div>
            <div className="metric text-4xl">{Number.isFinite(Number(token.balance)) ? Number(token.balance).toFixed(2) : token.balance}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4 mt-6">
        {showDetails && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:border-pp-cyan/20 dark:bg-pp-cyan/5 p-5 animate-float-in">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-[0.16em] text-blue-700 dark:text-pp-cyan font-semibold">Wallet Settings</div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="btn-tertiary text-xs px-2.5 py-1 bg-slate-200 text-slate-700 border-transparent hover:bg-slate-300 dark:bg-black/20 dark:text-white dark:hover:bg-black/30"
              >
                Hide
              </button>
            </div>
            <div className="space-y-3">
              <InfoRow
                label="Signer Address"
                value={formatAddress(walletData.wallet.signerAddress)}
                fullValue={walletData.wallet.signerAddress}
                copyValue={walletData.wallet.signerAddress}
              />
              <InfoRow
                label="AA Wallet Address"
                value={formatAddress(walletData.wallet.address)}
                fullValue={walletData.wallet.address}
                copyValue={walletData.wallet.address}
              />
              {importedTokens.map((token) => (
                <InfoRow
                  key={token.address}
                  label={`Token Address (${token.name})`}
                  value={formatAddress(token.address)}
                  fullValue={token.address}
                  copyValue={token.address}
                />
              ))}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20 p-4">
                <button
                  type="button"
                  onClick={() => setShowAddToken((prev) => !prev)}
                  className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-700 dark:text-white/90 font-semibold hover:text-blue-600 dark:hover:text-pp-cyan transition-colors"
                  aria-expanded={showAddToken}
                >
                  <span className="text-blue-600 dark:text-pp-cyan text-lg leading-none">+</span>
                  ADD TOKEN ADDRESS
                </button>
                {showAddToken && (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={tokenAddressInput}
                        onChange={(e) => setTokenAddressInput(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 dark:bg-black/30 dark:border-white/10 dark:text-white font-mono text-xs focus:border-blue-500 dark:focus:border-pp-cyan/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 dark:focus:ring-pp-cyan/50"
                      />
                      <input
                        type="text"
                        value={tokenNameInput}
                        onChange={(e) => setTokenNameInput(e.target.value)}
                        placeholder="Token name"
                        className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 dark:bg-black/30 dark:border-white/10 dark:text-white text-xs focus:border-blue-500 dark:focus:border-pp-cyan/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddToken}
                        disabled={importingToken}
                        className="px-3 py-2 bg-blue-100 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-200 dark:bg-pp-cyan/20 dark:border-pp-cyan/30 dark:text-pp-cyan dark:hover:bg-pp-cyan/30 transition-colors"
                        title="Add token"
                      >
                        {importingToken ? '...' : '+'}
                      </button>
                    </div>
                    {tokenImportError && (
                      <div className="mt-2 text-xs text-rose-300">{tokenImportError}</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {walletData.wallet.isDeployed && parseFloat(walletData.balance) < 0.001 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-300 rounded-2xl backdrop-blur-md dark:bg-blue-500/10 dark:border-blue-400/30">
            <p className="text-sm text-blue-900 dark:text-blue-200 mb-3 font-medium">
              Your AA wallet balance is low. Fund it to start transactions.
            </p>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                className="flex-1 px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:border-blue-400/50 focus:outline-none"
                placeholder="Amount in KITE"
              />
              <button
                onClick={handleFund}
                disabled={funding || !fundingAmount}
                className="btn-primary py-2 px-6 text-sm"
              >
                {funding ? 'Sending...' : 'Fund'}
              </button>
            </div>
          </div>
        )}

        {!walletData.wallet.isDeployed && (
          <div className="mt-4 p-5 bg-amber-50 border border-amber-300 rounded-2xl backdrop-blur-md dark:bg-amber-500/10 dark:border-amber-500/30">
            <p className="text-sm text-amber-900 dark:text-amber-200 mb-4 font-medium">
              Your AA wallet needs to be deployed before you can use it.
            </p>
            <button
              onClick={handleDeploy}
              disabled={deploying || (!privateKey && (isWalletClientLoading || !isConnected))}
              className="w-full btn bg-amber-500 text-white shadow-lg hover:bg-amber-600 dark:hover:bg-amber-400 border-none font-bold"
            >
              {deploying ? 'Deploying...' : (!privateKey && isWalletClientLoading) ? 'Loading...' : 'Deploy Smart Wallet'}
            </button>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRecentActivity((prev) => !prev)}
            className="flex w-full items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            aria-expanded={showRecentActivity}
          >
            <span className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">Recent Activities</span>
            <span className="text-slate-500 dark:text-white/60 text-sm">{showRecentActivity ? '▾' : '▸'}</span>
          </button>
          {showRecentActivity && (
            <div className="p-4 pt-0 border-t border-white/5">
              <RecentActivity
                signerAddress={signerAddress}
                aaWalletAddress={aaWalletAddress}
                refreshTrigger={refreshTrigger}
                compact
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  fullValue,
  copyValue
}: {
  label: string;
  value: React.ReactNode;
  fullValue?: string;
  copyValue?: string;
}) {
  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
    } catch {
      // ignore copy errors
    }
  };

  return (
    <div className="flex justify-between items-start py-2.5 border-b border-white/10 last:border-0 group">
      <span className="text-slate-300 text-sm">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-right font-mono text-sm text-pp-cyan/90 group-hover:text-pp-cyan transition-colors">{value}</span>
        {copyValue && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Copy"
          >
            ⧉
          </button>
        )}
      </span>
    </div>
  );
}
