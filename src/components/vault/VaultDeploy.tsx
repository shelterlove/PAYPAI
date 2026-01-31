'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

interface VaultDeployProps {
  aaWalletAddress: string;
  calculatedVaultAddress: string;
  signerAddress: string;
  privateKey: string;
  onDeployed?: (vaultAddress: string) => void;
}

export default function VaultDeploy({
  aaWalletAddress,
  calculatedVaultAddress,
  signerAddress,
  privateKey,
  onDeployed
}: VaultDeployProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleDeploy = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/vault/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aaWalletAddress,
          signerAddress,
          privateKey
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Vault deployed successfully!\n\nTransaction Hash: ' + result.transactionHash);
        onDeployed?.(result.vaultAddress || calculatedVaultAddress);
      } else {
        // Show manual deployment instructions
        setShowManual(true);
      }
    } catch (err) {
      setShowManual(true);
    } finally {
      setLoading(false);
    }
  };

  if (showManual) {
    return (
      <div className="card-soft p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-900">Manual Vault Deployment</h2>

        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <p className="text-sm text-amber-700 mb-3">
              <strong>⚠️ Automatic deployment not yet available</strong>
            </p>
            <p className="text-xs text-slate-500">
              Please deploy your vault manually using one of the methods below.
            </p>
          </div>

          {/* Deployment Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Deployment Parameters</h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Implementation:</span>
                <span className="text-slate-700 break-all ml-2">
                  {process.env.NEXT_PUBLIC_VAULT_IMPLEMENTATION_ADDRESS}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Settlement Token:</span>
                <span className="text-emerald-600 break-all ml-2">
                  {process.env.NEXT_PUBLIC_SETTLEMENT_TOKEN_ADDRESS}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Admin (AA Wallet):</span>
                <span className="text-blue-600 break-all ml-2">
                  {aaWalletAddress}
                </span>
              </div>
            </div>
          </div>

          {/* Deployment Methods */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Deployment Methods</h3>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-1">Method 1: Using Remix IDE</p>
                <ol className="text-xs text-slate-500 list-decimal list-inside space-y-1">
                  <li>Go to <a href="https://remix.ethereum.org" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Remix IDE</a></li>
                  <li>Create new file with ClientAgentVault code</li>
                  <li>Deploy with parameters above</li>
                </ol>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-1">Method 2: Using Hardhat</p>
                <pre className="text-xs text-slate-600 overflow-x-auto">
{`const vault = await ethers.deployContract(
  "ClientAgentVault",
  [
    "${process.env.NEXT_PUBLIC_SETTLEMENT_TOKEN_ADDRESS}",
    "${aaWalletAddress}"
  ]
);
await vault.waitForDeployment();
console.log("Vault deployed to:", vault.target);`}
                </pre>
              </div>
            </div>
          </div>

          {/* After Deployment */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <p className="text-sm font-semibold text-blue-700 mb-2">After Deployment</p>
            <p className="text-xs text-slate-600 mb-3">
              Once you&apos;ve deployed your vault, enter the address below to start using it:
            </p>
            <button
              onClick={() => {
                const address = prompt('Enter your deployed vault address:');
                if (address && ethers.isAddress(address)) {
                  onDeployed?.(address);
                } else {
                  alert('Invalid address format');
                }
              }}
              className="w-full btn-secondary"
            >
              Enter Deployed Vault Address
            </button>
          </div>

          <button
            onClick={() => setShowManual(false)}
            className="w-full btn-tertiary"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-soft p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Deploy Your ClientAgentVault
          </h3>
          <p className="text-sm text-slate-500 mb-3">
            Your vault address is ready. Deploy it to enable AI agent spending rules and budget management.
          </p>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
            <p className="text-xs text-slate-500 mb-1">Your Vault Address:</p>
            <p className="font-mono text-xs text-blue-600 break-all">
              {calculatedVaultAddress}
            </p>
          </div>

          {error && (
            <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl border border-rose-200 mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleDeploy}
              disabled={loading}
              className="flex-1 btn-secondary"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Deploying...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Deploy Vault</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowManual(true)}
              className="btn-tertiary px-4 py-3"
              title="View manual deployment instructions"
            >
              📖 Guide
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-3 text-center">
            🔐 Secure vault with spending rules for your AI agent
          </p>
        </div>
      </div>
    </div>
  );
}
