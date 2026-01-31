'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { kiteTestnetChain } from '@/lib/wagmi';
import { getVaultSalt } from '@/lib/vault-utils';

interface VaultFactoryDeployProps {
  aaWalletAddress: string;
  calculatedVaultAddress: string;
  signerAddress: string;
  privateKey: string;
  onDeployed?: (vaultAddress: string) => void;
}

export default function VaultFactoryDeploy({
  aaWalletAddress,
  calculatedVaultAddress,
  signerAddress,
  privateKey,
  onDeployed
}: VaultFactoryDeployProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [factoryAddress, setFactoryAddress] = useState('');
  const [useManualFactory, setUseManualFactory] = useState(false);

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  const factoryInterface = new ethers.Interface([
    'function deployDeterministic(address admin, address spendingAccount, bytes32 userSalt) external returns (address)'
  ]);

  const handleDeploy = async () => {
    setError('');
    setLoading(true);

    try {
      const factory = factoryAddress || process.env.NEXT_PUBLIC_VAULT_FACTORY;

      if (!factory || !ethers.isAddress(factory)) {
        throw new Error('Invalid factory address. Please deploy the factory first.');
      }

      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasWalletClient) {
        const salt = getVaultSalt(signerAddress);
        const callData = factoryInterface.encodeFunctionData('deployDeterministic', [
          signerAddress,
          aaWalletAddress,
          salt
        ]);

        const hash = await walletClient.sendTransaction({
          account: signerAddress as `0x${string}`,
          to: factory as `0x${string}`,
          data: callData as `0x${string}`,
          value: 0n
        });

        alert(`✅ Deployment transaction sent!\n\nTx Hash: ${hash}\n\nWaiting for confirmation...`);

        let deployedAddress = '';
        for (let i = 0; i < 6; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const infoResponse = await fetch(`/api/vault/calculate?address=${signerAddress}`);
          const info = await infoResponse.json();
          if (info.deployed && info.vaultAddress) {
            deployedAddress = info.vaultAddress;
            break;
          }
        }

        if (deployedAddress) {
          alert(`✅ Vault deployed successfully!\n\nVault Address: ${deployedAddress}`);
          onDeployed?.(deployedAddress);
        } else {
          setError('Deployment pending. Please refresh in a few seconds to confirm.');
        }
      } else if (privateKey && privateKey.length > 0) {
        const response = await fetch('/api/vault/deploy-factory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signerAddress,
            privateKey,
            factoryAddress: factory
          })
        });

        const result = await response.json();

        if (result.success) {
          alert(`✅ Vault deployed successfully!\n\nVault Address: ${result.vaultAddress}\nTransaction: ${result.transactionHash}`);
          onDeployed?.(result.vaultAddress);
        } else {
          throw new Error(result.error || 'Deployment failed');
        }
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy vault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-soft p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
          🏭
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Deploy Vault via Factory
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Use our Factory contract to deploy your vault in one click!
          </p>

          {/* Factory Status */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
            {process.env.NEXT_PUBLIC_VAULT_FACTORY ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-500">Factory Available</span>
                </div>
                <div className="font-mono text-emerald-600 break-all">
                  {process.env.NEXT_PUBLIC_VAULT_FACTORY}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-amber-700 text-xs font-semibold">Factory Not Deployed Yet</span>
                </div>
                <p className="text-xs text-slate-500">
                  Deploy the factory contract first, then use it to deploy vaults.
                </p>
                <button
                  onClick={() => setUseManualFactory(true)}
                  className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs"
                >
                  Deploy Factory Guide
                </button>
              </div>
            )}
          </div>

          {/* Manual Factory Input */}
          {useManualFactory && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
              <label className="block text-xs text-slate-500 mb-2">
                Factory Address (if already deployed):
              </label>
              <input
                type="text"
                value={factoryAddress}
                onChange={(e) => setFactoryAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-slate-700 text-xs font-mono"
              />
            </div>
          )}

          {/* Vault Address Preview */}
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 mb-4">
            <p className="text-xs text-slate-500 mb-1">Your Vault Will Be Deployed To:</p>
            <p className="font-mono text-xs text-blue-600 break-all">
              {calculatedVaultAddress}
            </p>
          </div>

          {error && (
            <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl border border-rose-200 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleDeploy}
            disabled={loading || (!process.env.NEXT_PUBLIC_VAULT_FACTORY && !factoryAddress)}
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
                <span>Deploy Vault Now</span>
              </>
            )}
          </button>

          <p className="text-xs text-slate-500 mt-3 text-center">
            Uses a standard wallet transaction (gas required).
          </p>
        </div>
      </div>
    </div>
  );
}
