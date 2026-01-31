'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClientSignFunction } from '@/lib/wallet-client';
import { kiteTestnetChain } from '@/lib/wagmi';
import { KITE_CONTRACTS } from '@/types';

interface SendTransactionProps {
  signerAddress: string;
  privateKey: string;
  isWalletDeployed: boolean;
  refreshTrigger?: number;
  onTransactionSent?: () => void;
  vaultAddress?: string;
  useVault?: boolean;
}

export default function SendTransaction({
  signerAddress,
  privateKey,
  isWalletDeployed,
  refreshTrigger,
  onTransactionSent,
  vaultAddress,
  useVault
}: SendTransactionProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [assetType, setAssetType] = useState<'ETH' | 'ERC20'>('ETH');
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('TOKEN');
  const [tokenDecimals, setTokenDecimals] = useState('18');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  const vaultMode = Boolean(useVault && vaultAddress);

  useEffect(() => {
    if (vaultMode) {
      setAssetType('ERC20');
      setTokenAddress(KITE_CONTRACTS.SETTLEMENT_TOKEN);
      setTokenSymbol('KITE');
      setTokenDecimals(String(KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS));
    }
  }, [vaultMode]);

  const handleSend = async () => {
    setError('');
    setTxHash('');
    setLoading(true);

    try {
      // Validate recipient address
      if (!ethers.isAddress(recipient)) {
        throw new Error('Invalid recipient address');
      }

      // Validate amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount');
      }

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (useVault && vaultAddress) {
        if (assetType !== 'ERC20') {
          throw new Error('Vault mode only supports settlement token transfers.');
        }

        if (
          tokenAddress &&
          tokenAddress.toLowerCase() !== KITE_CONTRACTS.SETTLEMENT_TOKEN.toLowerCase()
        ) {
          throw new Error('Vault only supports the settlement token.');
        }

        const response = await fetch('/api/vault/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vaultAddress,
            recipient,
            amount
          })
        });

        const result = await response.json();

        if (result.success) {
          setTxHash(result.transactionHash || '');
          onTransactionSent?.();

          // Reset form
          setRecipient('');
          setAmount('');
        } else {
          throw new Error(result.error || 'Vault execution failed');
        }
      } else if (hasPrivateKey) {
        if (assetType === 'ETH') {
          const response = await fetch('/api/wallet/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signerAddress,
              recipient,
              amount,
              privateKey
            })
          });

          const result = await response.json();

          if (result.status?.status === 'success') {
            setTxHash(result.status.transactionHash || '');
            onTransactionSent?.();
            setRecipient('');
            setAmount('');
          } else {
            throw new Error(result.status?.reason || 'Transaction failed');
          }
        } else {
          if (!ethers.isAddress(tokenAddress)) {
            throw new Error('Invalid token address');
          }

          const response = await fetch('/api/wallet/send-erc20', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signerAddress,
              recipient,
              amount,
              privateKey,
              tokenAddress,
              tokenDecimals: parseInt(tokenDecimals, 10) || 18
            })
          });

          const result = await response.json();

          if (result.status?.status === 'success') {
            setTxHash(result.status.transactionHash || '');
            onTransactionSent?.();
            setRecipient('');
            setAmount('');
          } else {
            throw new Error(result.status?.reason || 'Transaction failed');
          }
        }
      } else if (hasWalletClient) {
        const { getKiteManager } = await import('@/lib/kite');
        const sdk = getKiteManager().getSDK();
        const signFunction = createWalletClientSignFunction(walletClient, signerAddress);

        let request;
        if (assetType === 'ETH') {
          request = {
            target: recipient,
            value: ethers.parseEther(amount),
            callData: '0x'
          };
        } else {
          if (!ethers.isAddress(tokenAddress)) {
            throw new Error('Invalid token address');
          }

          const decimals = parseInt(tokenDecimals, 10) || 18;
          const erc20 = new ethers.Interface(['function transfer(address to, uint256 amount)']);
          const callData = erc20.encodeFunctionData('transfer', [
            recipient,
            ethers.parseUnits(amount, decimals)
          ]);
          request = {
            target: tokenAddress,
            value: 0n,
            callData
          };
        }

        const result = await sdk.sendUserOperationAndWait(
          signerAddress,
          request,
          signFunction
        );

        if (result.status?.status === 'success') {
          setTxHash(result.status.transactionHash || '');
          onTransactionSent?.();
          setRecipient('');
          setAmount('');
        } else {
          throw new Error(result.status?.reason || 'Transaction failed');
        }
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  if (!isWalletDeployed) {
    return (
      <div className="card p-6 opacity-60">
        <h2 className="text-xl font-semibold mb-4 text-slate-900">Send Transaction</h2>
        <p className="text-slate-500">
          Deploy your AA wallet first to send transactions.
        </p>
      </div>
    );
  }

  return (
    <div className="card-soft p-6">
      <h2 className="text-xl font-semibold mb-4 text-slate-900">
        {vaultMode
          ? 'Send Settlement Token (Vault)'
          : assetType === 'ETH'
            ? 'Send ETH'
            : 'Send ERC20'}
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => !vaultMode && setAssetType('ETH')}
            disabled={vaultMode}
            className={`px-3 py-2 rounded text-sm font-semibold ${
              assetType === 'ETH'
                ? 'bg-[#5A39BA] text-white'
                : 'bg-white border border-[color:var(--pp-border)] text-slate-600'
            } ${vaultMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            ETH
          </button>
          <button
            type="button"
            onClick={() => setAssetType('ERC20')}
            className={`px-3 py-2 rounded text-sm font-semibold ${
              assetType === 'ERC20'
                ? 'bg-[#0F89C0] text-white'
                : 'bg-white border border-[color:var(--pp-border)] text-slate-600'
            }`}
          >
            ERC20
          </button>
        </div>

        {assetType === 'ERC20' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-500 mb-2">Token Address</label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono text-sm"
                disabled={loading || vaultMode}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
              <label className="block text-sm text-slate-500 mb-2">Token Name / Symbol</label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm"
                  disabled={loading || vaultMode}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-2">Decimals</label>
                <input
                  type="number"
                  value={tokenDecimals}
                  onChange={(e) => setTokenDecimals(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm"
                  disabled={loading || vaultMode}
                />
              </div>
            </div>
            {vaultMode && (
              <p className="text-xs text-[#0F89C0]">
                Vault mode uses the settlement token only.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-500 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm text-slate-500 mb-2">
            Amount ({assetType === 'ETH' ? 'ETH' : tokenSymbol || 'TOKEN'})
          </label>
          <input
            type="number"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl border border-rose-200">
            {error}
          </div>
        )}

        {txHash && (
          <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <div className="font-semibold mb-1">Transaction Sent!</div>
            <div className="font-mono text-xs break-all">
              Hash: {txHash}
            </div>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={loading || !recipient || !amount || (assetType === 'ERC20' && !tokenAddress)}
          className="w-full btn-primary"
        >
          {loading ? 'Sending...' : 'Send Transaction'}
        </button>
      </div>
    </div>
  );
}
