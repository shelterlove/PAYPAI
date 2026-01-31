'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

interface WalletDeployProps {
  signerAddress: string;
  privateKey: string;
  onDeployed?: () => void;
}

export default function WalletDeploy({ signerAddress, privateKey, onDeployed }: WalletDeployProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const handleDeploy = async () => {
    setError('');
    setTxHash('');
    setLoading(true);

    try {
      const response = await fetch('/api/wallet/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerAddress, privateKey })
      });

      const result = await response.json();

      if (result.status?.status === 'success' || result.status?.status === 'included') {
        setTxHash(result.status.transactionHash || '');
        alert('AA Wallet deployed successfully!\n\nTransaction Hash: ' + result.status.transactionHash);
        onDeployed?.();
      } else {
        throw new Error(result.status?.reason || result.error || 'Deployment failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-soft p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Deploy Your AA Wallet
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Your AA wallet address is ready but needs to be deployed on-chain before you can use it.
            Click the button below to deploy.
          </p>

          {error && (
            <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl border border-rose-200 mb-4">
              {error}
            </div>
          )}

          {txHash && (
            <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-200 mb-4">
              <div className="font-semibold mb-1">✓ Deployment Successful!</div>
              <div className="font-mono text-xs break-all">
                Hash: {txHash}
              </div>
            </div>
          )}

          <button
            onClick={handleDeploy}
            disabled={loading}
            className="w-full btn-secondary"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Deploying...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Deploy AA Wallet</span>
              </>
            )}
          </button>

          <p className="text-xs text-slate-500 mt-3 text-center">
            ⚡ Gasless transaction via Bundler • First transaction deploys your wallet
          </p>
        </div>
      </div>
    </div>
  );
}
