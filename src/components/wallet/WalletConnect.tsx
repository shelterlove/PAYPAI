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
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
        <p className="text-slate-400 text-sm">Choose how you want to connect to PayPai</p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-center transform transition-transform hover:scale-105 duration-300">
          <div className="p-1 rounded-xl bg-gradient-to-r from-pp-cyan/20 to-pp-purple/20">
            <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest">
            <span className="px-4 bg-[#0a0a16] text-slate-500 font-medium">or</span>
          </div>
        </div>

        {/* Private Key Input (Toggle) */}
        <button
          onClick={() => setShowPrivateKey(!showPrivateKey)}
          className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group py-2"
        >
          <span className={`transition-transform duration-300 ${showPrivateKey ? 'rotate-90' : ''}`}>▶</span>
          <span className="group-hover:underline decoration-pp-cyan/50 underline-offset-4">Connect with Private Key (Dev)</span>
        </button>

        {showPrivateKey && (
          <div className="space-y-4 animate-slide-in">
            <div className="relative">
              <label className="block text-xs uppercase tracking-wider text-pp-cyan/80 mb-2 font-bold ml-1">
                Private Key
              </label>
              <input
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-pp-cyan/50 focus:ring-1 focus:ring-pp-cyan/20 transition-all font-mono text-sm"
                disabled={loading}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrivateKeyConnect}
                disabled={loading || !privateKey}
                className="btn-primary flex-1 py-2.5 text-sm"
              >
                {loading ? 'Connecting...' : 'Connect Identity'}
              </button>

              <button
                onClick={handleUseDevKey}
                type="button"
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium whitespace-nowrap"
              >
                Use Dev Key
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-500 border-t border-white/5 pt-3">
              <span className="text-amber-500/80 mr-1">⚠️</span>
              Development mode only. Never use production keys.
            </p>
          </div>
        )}

        {isConnected && address && (
          <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-xs text-emerald-200">
              Connected: <span className="font-mono text-emerald-100">{address.slice(0, 6)}...{address.slice(-4)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-pulse">
            <div className="text-xs text-rose-200">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
