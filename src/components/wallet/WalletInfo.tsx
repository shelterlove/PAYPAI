'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWalletClient, useAccount } from 'wagmi';
import { formatAddress } from '@/lib/wallet';
import { createWalletClientSignFunction } from '@/lib/wallet-client';
import { kiteTestnetChain } from '@/lib/wagmi';
import { AAWallet, KITE_CONTRACTS } from '@/types';
import RecentActivity from '@/components/vault/RecentActivity';

interface WalletInfoProps {
  signerAddress: string;
  privateKey: string;
  onDeploymentStatusChange?: (deployed: boolean) => void;
  onFundingStatusChange?: (funded: boolean) => void;
  aaWalletAddress?: string;
  refreshTrigger?: number;
}

interface WalletData {
  wallet: AAWallet;
  balance: string;
  signerBalance: string;
}

export default function WalletInfo({
  signerAddress,
  privateKey,
  onDeploymentStatusChange,
  onFundingStatusChange,
  refreshTrigger
}: WalletInfoProps) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fundingAmount, setFundingAmount] = useState('0.01');
  const [funding, setFunding] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundToken, setFundToken] = useState<{
    symbol: string;
    address?: string;
    isNative: boolean;
  } | null>(null);
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
  const [tokenRefreshTick, setTokenRefreshTick] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Get wagmi connection status
  const { isConnected } = useAccount();

  // Get wallet client for MetaMask signing
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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
      setTokenRefreshTick((prev) => prev + 1);

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

    // Refresh every 20 seconds when tab is visible
    const interval = setInterval(() => {
      if (!isVisible) return;
      fetchWalletInfo(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [signerAddress, refreshTrigger, isVisible]);

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

  const handleFundToken = async (tokenAddress: string) => {
    if (!walletData) return;

    try {
      setFunding(true);
      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;
      const decimals =
        tokenAddress.toLowerCase() === KITE_CONTRACTS.SETTLEMENT_TOKEN.toLowerCase()
          ? KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS
          : 18;

      if (hasPrivateKey) {
        const response = await fetch('/api/wallet/send-erc20-eoa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signerAddress,
            recipient: walletData.wallet.address,
            amount: fundingAmount,
            privateKey,
            tokenAddress,
            tokenDecimals: decimals
          })
        });

        const result = await response.json();

        if (result.success) {
          alert(`Successfully funded ${fundingAmount} tokens to AA wallet!`);
          fetchWalletInfo();
        } else {
          alert(`Funding failed: ${result.error || 'Unknown error'}`);
        }
      } else if (hasWalletClient) {
        const erc20 = new ethers.Interface(['function transfer(address to, uint256 amount)']);
        const callData = erc20.encodeFunctionData('transfer', [
          walletData.wallet.address,
          ethers.parseUnits(fundingAmount, decimals)
        ]);
        const hash = await walletClient.sendTransaction({
          account: signerAddress as `0x${string}`,
          to: tokenAddress as `0x${string}`,
          data: callData
        });

        alert(`Funding submitted: ${hash}`);
        fetchWalletInfo();
      } else {
        alert('Wallet not connected. Please reconnect and try again.');
      }
    } catch (error) {
      alert('Failed to fund token');
      console.error(error);
    } finally {
      setFunding(false);
    }
  };

  const openFundModal = (symbol: string, address?: string, isNative = false) => {
    setFundToken({ symbol, address, isNative });
    setShowFundModal(true);
  };

  const submitFund = async () => {
    if (!fundToken) return;
    if (fundToken.isNative) {
      await handleFund();
    } else if (fundToken.address) {
      await handleFundToken(fundToken.address);
    }
    setShowFundModal(false);
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
        if (!isVisible) return;
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
  }, [walletData?.wallet?.address, refreshTrigger, tokenKey, tokenRefreshTick, isVisible]);

  const aaBalance = Number(walletData?.balance ?? 0);
  const deploymentLabel = walletData?.wallet?.isDeployed ? 'Deployed' : 'Not Deployed';
  const aaWalletAddress = walletData?.wallet?.address || '';
  const usdtToken = importedTokens.find((token) => token.name.toUpperCase() === 'USDT');
  const usdtBalance = usdtToken ? Number(usdtToken.balance) : 0;
  const safeUsdtBalance = Number.isFinite(usdtBalance) ? usdtBalance : 0;
  const isWalletFunded = Boolean(walletData?.wallet?.isDeployed) && (aaBalance >= 0.001 || safeUsdtBalance > 0);
  const isLowBalance = Boolean(walletData?.wallet?.isDeployed) && !isWalletFunded;

  useEffect(() => {
    onFundingStatusChange?.(isWalletFunded);
  }, [isWalletFunded, onFundingStatusChange]);

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

  if (!walletData) {
    return (
      <div className="card-soft p-6">
        <p className="text-slate-500">Failed to load wallet information</p>
      </div>
    );
  }

  return (
    <div id="wallet-info" className="card-soft p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Wallet</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill text-xs ${walletData.wallet.isDeployed ? 'bg-[#5CD5DD]/20 text-info' : 'bg-white text-slate-600 border border-[color:var(--pp-border)]'}`}>
            {deploymentLabel}
          </span>
          <button
            onClick={() => fetchWalletInfo(true)}
            disabled={refreshing}
            className="btn-tertiary text-base px-3.5 py-1.5"
            title="Refresh"
          >
            <span className="text-lg leading-none">{refreshing ? '↻' : '⟳'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="btn-tertiary text-base px-3.5 py-1.5"
            title="Wallet settings"
          >
            <span className="text-lg leading-none" aria-hidden>⚙</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--pp-border)] bg-white/90 p-4 shadow-[var(--pp-shadow)] min-h-[92px] flex flex-col justify-center">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="text-xs uppercase tracking-[0.08em] text-slate-600 font-semibold">KITE</div>
              <a
                href="https://faucet.gokite.ai/"
                target="_blank"
                rel="noreferrer"
                className="btn-tertiary px-2 py-0.5 text-xs"
                title="Open KITE faucet"
                aria-label="Open KITE faucet"
              >
                ⛲
              </a>
            </div>
            <button
              type="button"
              onClick={() => openFundModal('KITE', undefined, true)}
              disabled={funding || !walletData?.wallet.isDeployed}
              className="btn-tertiary px-2 py-0.5 text-xs"
              title="Fund KITE"
            >
              Fund
            </button>
          </div>
          <div className="metric mt-2">{Number.isFinite(aaBalance) ? aaBalance.toFixed(6) : '0.000000'}</div>
        </div>
        {importedTokens.map((token) => (
          <div
            key={token.address}
            className="rounded-xl border border-[color:var(--pp-border)] bg-white/90 p-4 shadow-[var(--pp-shadow)] min-h-[92px] flex flex-col justify-center"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.08em] text-slate-600 font-semibold">{token.name}</div>
              <button
                type="button"
                onClick={() => openFundModal(token.name, token.address, false)}
                disabled={funding || !walletData?.wallet.isDeployed}
                className="btn-tertiary px-2 py-0.5 text-xs"
                title={`Fund ${token.name}`}
              >
                Fund
              </button>
            </div>
            <div className="metric mt-2">{Number.isFinite(Number(token.balance)) ? Number(token.balance).toFixed(6) : token.balance}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {showDetails && (
          <div className="mt-2 rounded-xl border border-[color:var(--pp-border)] bg-white/90 p-4 shadow-[var(--pp-shadow)]">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-600 font-semibold">Wallet Settings</div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="btn-tertiary text-xs px-2.5 py-1"
              >
                Hide
              </button>
            </div>
            <div className="mt-3 space-y-2">
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
              <div className="mt-2 rounded-lg border border-[color:var(--pp-border)] bg-white p-3">
                <button
                  type="button"
                  onClick={() => setShowAddToken((prev) => !prev)}
                  className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-600 font-semibold"
                  aria-expanded={showAddToken}
                >
                  <span className="text-slate-500">+</span>
                  ADD TOKEN ADDRESS
                </button>
                {showAddToken && (
                  <>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={tokenAddressInput}
                        onChange={(e) => setTokenAddressInput(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 min-w-[220px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono text-xs"
                      />
                      <input
                        type="text"
                        value={tokenNameInput}
                        onChange={(e) => setTokenNameInput(e.target.value)}
                        placeholder="Token name"
                        className="w-40 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddToken}
                        disabled={importingToken}
                        className="btn-tertiary px-3"
                        title="Add token"
                      >
                        {importingToken ? '...' : '+'}
                      </button>
                    </div>
                    {tokenImportError && (
                      <div className="mt-2 text-xs text-rose-600">{tokenImportError}</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {walletData.wallet.isDeployed && isLowBalance && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700">
              Your AA wallet balance is low. Fund it to start transactions.
            </p>
          </div>
        )}

        {!walletData.wallet.isDeployed && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-700 mb-3">
              Your AA wallet needs to be deployed before you can use it.
            </p>
            {!privateKey && (isWalletClientLoading || !isConnected) && (
              <p className="text-xs text-slate-500 mb-2">
                {isWalletClientLoading ? '⏳ Loading wallet connection...' : !isConnected ? '⚠️ Wallet not connected' : ''}
              </p>
            )}
            <button
              onClick={handleDeploy}
              disabled={deploying || (!privateKey && (isWalletClientLoading || !isConnected))}
              className="w-full btn-secondary text-amber-700 border-amber-200 hover:bg-amber-50"
            >
              {deploying ? 'Deploying...' : (!privateKey && isWalletClientLoading) ? 'Loading...' : (!privateKey && !isConnected) ? 'Wallet Not Connected' : 'Deploy Wallet'}
            </button>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-[color:var(--pp-border)] bg-white/90 p-4 shadow-[var(--pp-shadow)]">
          <button
            type="button"
            onClick={() => setShowRecentActivity((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={showRecentActivity}
          >
            <span className="text-sm font-semibold text-slate-700">Recent Activities</span>
            <span className="text-slate-400 text-sm">{showRecentActivity ? '▾' : '▸'}</span>
          </button>
          {showRecentActivity && (
            <RecentActivity
              signerAddress={signerAddress}
              aaWalletAddress={aaWalletAddress}
              refreshTrigger={refreshTrigger}
              compact
            />
          )}
        </div>
        {showFundModal && fundToken && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-md card-soft p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Fund {fundToken.symbol}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFundModal(false)}
                  className="btn-tertiary text-xs px-2.5 py-1"
                >
                  Close
                </button>
              </div>
              <label className="block text-xs text-slate-500 mb-2">Amount</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm"
                placeholder={`Amount in ${fundToken.symbol}`}
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFundModal(false)}
                  className="btn-tertiary text-xs px-3 py-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitFund}
                  disabled={funding || !fundingAmount}
                  className="btn-primary text-xs px-3 py-1"
                >
                  {funding ? 'Funding...' : 'Fund'}
                </button>
              </div>
            </div>
          </div>
        )}
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
    <div className="flex justify-between items-start py-2 border-b border-slate-200 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-right font-mono text-sm text-slate-700">{value}</span>
        {copyValue && (
          <button
            type="button"
            onClick={handleCopy}
            className="btn-tertiary px-2 py-0.5 text-xs"
            title="Copy"
          >
            ⧉
          </button>
        )}
      </span>
    </div>
  );
}
