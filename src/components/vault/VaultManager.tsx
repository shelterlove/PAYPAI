'use client';

import { useState, useEffect } from 'react';
import VaultInfo from './VaultInfo';
import VaultConfig from './VaultConfig';
import VaultWithdraw from './VaultWithdraw';
import VaultSetup from './VaultSetup';
import VaultApproval from './VaultApproval';
import SendTransaction from '@/components/wallet/SendTransaction';

interface VaultManagerProps {
  aaWalletAddress: string;
  privateKey: string;
  onVaultReady?: (vaultAddress: string, executorAuthorized: boolean) => void;
  onAllowanceStatusChange?: (approved: boolean) => void;
  refreshTrigger?: number;
  onRefresh?: () => void;
  useVault?: boolean;
  vaultExecutorReady?: boolean;
}

export default function VaultManager({
  aaWalletAddress,
  privateKey,
  onVaultReady,
  onAllowanceStatusChange,
  refreshTrigger,
  onRefresh,
  useVault,
  vaultExecutorReady
}: VaultManagerProps) {
  const [vaultAddress, setVaultAddress] = useState('');
  const [displayAAWallet, setDisplayAAWallet] = useState('');
  const [calculatedAddress, setCalculatedAddress] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [executorAuthorized, setExecutorAuthorized] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<{
    deployed: boolean;
    hasBalance: boolean;
  } | null>(null);

  useEffect(() => {
    // Calculate and check vault address on mount
    checkVaultAddress();
  }, [aaWalletAddress]);

  useEffect(() => {
    if (deploymentStatus?.deployed && vaultAddress) {
      onVaultReady?.(vaultAddress, executorAuthorized);
    }
  }, [deploymentStatus?.deployed, vaultAddress, executorAuthorized, onVaultReady]);

  useEffect(() => {
    if (!deploymentStatus?.deployed) {
      onAllowanceStatusChange?.(false);
    }
  }, [deploymentStatus?.deployed, onAllowanceStatusChange]);

  const checkVaultAddress = async () => {
    setIsChecking(true);
    try {
      // Call API to calculate vault address
      const response = await fetch(`/api/vault/calculate?address=${aaWalletAddress}`);
      const data = await response.json();

      if (data.aaWalletAddress) {
        setDisplayAAWallet(data.aaWalletAddress);
      }

      if (data.vaultAddress) {
        setCalculatedAddress(data.vaultAddress);
        setVaultAddress(data.vaultAddress);
        setDeploymentStatus({
          deployed: data.deployed || false,
          hasBalance: false
        });
      }
    } catch (error) {
      console.error('Error checking vault address:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeployNew = () => {
    alert('Vault deployment feature coming soon!\n\nFor now, you can:\n1. Use Kite&apos;s deployment tools\n2. Enter an existing vault address manually');
  };

  if (isChecking) {
    return (
      <div className="card-soft p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-slate-500">Checking vault status...</span>
        </div>
      </div>
    );
  }

  if (!deploymentStatus?.deployed) {
    return (
      <div className="space-y-6">
        <VaultSetup
          signerAddress={aaWalletAddress}
          privateKey={privateKey}
          onReady={(address) => {
            setVaultAddress(address);
            setDeploymentStatus({ deployed: true, hasBalance: false });
          }}
        />
      </div>
    );
  }

  // Vault is deployed - show management interface
  return (
    <div className="space-y-6">
      <VaultInfo
        vaultAddress={vaultAddress}
        aaWalletAddress={aaWalletAddress}
        privateKey={privateKey}
        onExecutorStatusChange={(authorized) => setExecutorAuthorized(authorized)}
        onAllowanceStatusChange={onAllowanceStatusChange}
        refreshTrigger={refreshTrigger}
      />
      <div className="card-soft p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-700 font-semibold">Debug Settings (Development Only)</div>
            <div className="text-xs text-slate-500">Configure, approve, or withdraw</div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="btn-tertiary text-xs px-3 py-1.5"
          >
            {showAdvanced ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {showAdvanced && (
        <>
          <VaultApproval
            signerAddress={aaWalletAddress}
            privateKey={privateKey}
            vaultAddress={vaultAddress}
            onApproved={() => window.location.reload()}
          />
          <VaultConfig
            aaWalletAddress={aaWalletAddress}
            privateKey={privateKey}
            vaultAddress={vaultAddress}
            onConfigured={() => window.location.reload()}
          />
          <VaultWithdraw
            vaultAddress={vaultAddress}
            aaWalletAddress={aaWalletAddress}
            privateKey={privateKey}
            onWithdrawn={() => window.location.reload()}
          />
          <details className="card-soft p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              Manual transfer (advanced)
            </summary>
            <div className="mt-4">
              <SendTransaction
                signerAddress={aaWalletAddress}
                privateKey={privateKey}
                vaultAddress={vaultAddress}
                useVault={Boolean(useVault && vaultExecutorReady)}
                refreshTrigger={refreshTrigger}
                isWalletDeployed={Boolean(deploymentStatus?.deployed)}
                onTransactionSent={onRefresh}
              />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
