'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getAddressFromPrivateKey } from '@/lib/wallet';

interface WalletConnectProps {
  onPrivateKeyConnect: (address: string, privateKey: string) => void;
}

export default function WalletConnect({ onPrivateKeyConnect }: WalletConnectProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const { address, isConnected } = useAccount();

  const handlePrivateKeyConnect = async () => {
    setError('');
    setLoading(true);

    try {
      const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      const address = getAddressFromPrivateKey(key);

      console.log('Private key connect:', address);
      onPrivateKeyConnect(address, key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDevKey = () => {
    const devKey = process.env.NEXT_PUBLIC_PRIVATE_KEY || '';
    if (devKey) {
      setPrivateKey(devKey);
    } else {
      setError('No dev key found in environment');
    }
  };

  return (
    <div className="card-soft p-6">
      <h2 className="text-xl font-semibold mb-4 text-slate-900">Connect Wallet</h2>

      <div className="space-y-4">
        <div className="flex justify-center">
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-400">or</span>
          </div>
        </div>

        {/* Private Key Input (Toggle) */}
        <button
          onClick={() => setShowPrivateKey(!showPrivateKey)}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
        >
          <span>{showPrivateKey ? '▼' : '▶'}</span>
          <span>Connect with Private Key (Development)</span>
        </button>

        {showPrivateKey && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-sm text-slate-500 mb-2">
                Private Key (Development Only)
              </label>
              <input
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Enter your private key"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePrivateKeyConnect}
                disabled={loading || !privateKey}
                className="btn-secondary flex-1"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>

              <button
                onClick={handleUseDevKey}
                type="button"
                className="btn-tertiary"
              >
                Use Dev Key
              </button>
            </div>

            <p className="text-xs text-slate-500">
              ⚠️ 仅限测试使用，勿用于真实资产。请勿分享私钥。
            </p>
          </div>
        )}

        {isConnected && address && (
          <div className="text-xs text-slate-500">
            Connected wallet: {address.slice(0, 8)}...{address.slice(-6)}
          </div>
        )}

        {error && (
          <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl border border-rose-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
