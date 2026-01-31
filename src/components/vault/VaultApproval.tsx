'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { kiteTestnetChain } from '@/lib/wagmi';
import { createWalletClientSignFunction } from '@/lib/wallet-client';
import { getKiteManager } from '@/lib/kite';
import { KITE_CONTRACTS } from '@/types';

interface VaultApprovalProps {
  signerAddress: string;
  privateKey: string;
  vaultAddress: string;
  onApproved?: () => void;
  presetTokenAddress?: string;
}

export default function VaultApproval({ signerAddress, privateKey, vaultAddress, onApproved, presetTokenAddress }: VaultApprovalProps) {
  const [amount, setAmount] = useState('1000');
  const [approveMax, setApproveMax] = useState(true);
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('TOKEN');
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [allowance, setAllowance] = useState('0');
  const [spendingAccount, setSpendingAccount] = useState('');
  const [derivedAA, setDerivedAA] = useState('');
  const [aaDeployed, setAaDeployed] = useState(false);
  const [fundAmount, setFundAmount] = useState('100');
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState('');
  const [fundTxHash, setFundTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUserOpHash, setLastUserOpHash] = useState('');
  const [lastSignature, setLastSignature] = useState('');
  const [lastSignMethod, setLastSignMethod] = useState<'personal_sign' | 'eth_sign' | ''>('');
  const [lastErrorDetails, setLastErrorDetails] = useState('');
  const [lastFailureStage, setLastFailureStage] = useState('');
  const [lastRecoveredPrefixed, setLastRecoveredPrefixed] = useState('');
  const [lastRecoveredRaw, setLastRecoveredRaw] = useState('');
  const [lastWalletAccount, setLastWalletAccount] = useState('');
  const [bundlerUrl, setBundlerUrl] = useState('');
  const [disablePaymaster, setDisablePaymaster] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerTxHash, setRegisterTxHash] = useState('');

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  const fetchInfo = async () => {
    try {
      setRefreshing(true);
      const [vaultRes, walletRes] = await Promise.all([
        fetch(`/api/vault/info?address=${vaultAddress}`),
        fetch(`/api/wallet/info?address=${signerAddress}`)
      ]);

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        if (walletData?.wallet?.address) {
          setDerivedAA(walletData.wallet.address);
        }
        if (typeof walletData?.wallet?.isDeployed === 'boolean') {
          setAaDeployed(walletData.wallet.isDeployed);
        }
      }

      const response = vaultRes;
      if (!response.ok) return;
      const data = await response.json();
      if (!presetTokenAddress && data?.vault?.settlementToken) setTokenAddress(data.vault.settlementToken);
      if (data?.vault?.spendingAccount) setSpendingAccount(data.vault.spendingAccount);
      if (data?.tokenMeta?.symbol) setTokenSymbol(data.tokenMeta.symbol);
      if (Number.isFinite(Number(data?.tokenMeta?.decimals))) {
        setTokenDecimals(Number(data.tokenMeta.decimals));
      }
      if (data?.allowance) setAllowance(data.allowance);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (vaultAddress) {
      fetchInfo();
    }
  }, [vaultAddress]);

  useEffect(() => {
    if (!presetTokenAddress) return;
    setTokenAddress(presetTokenAddress);
    setTokenSymbol('TOKEN');

    const loadTokenMeta = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL);
        const token = new ethers.Contract(
          presetTokenAddress,
          [
            'function decimals() view returns (uint8)',
            'function symbol() view returns (string)'
          ],
          provider
        );
        let decimals = 18;
        try {
          decimals = Number(await token.decimals());
        } catch {
          decimals = 18;
        }
        let symbol = 'TOKEN';
        try {
          symbol = await token.symbol();
        } catch {
          symbol = 'TOKEN';
        }
        setTokenDecimals(decimals);
        setTokenSymbol(symbol);
      } catch {
        setTokenDecimals(18);
        setTokenSymbol('TOKEN');
      }
    };

    loadTokenMeta();
  }, [presetTokenAddress]);

  useEffect(() => {
    try {
      const config = getKiteManager().getConfig();
      if (config?.bundlerUrl) {
        setBundlerUrl(config.bundlerUrl);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleApprove = async () => {
    setError('');
    setTxHash('');
    setLastUserOpHash('');
    setLastSignature('');
    setLastSignMethod('');
    setLastErrorDetails('');
    setLastFailureStage('');
    setLastRecoveredPrefixed('');
    setLastRecoveredRaw('');
    setLastWalletAccount('');
    setLoading(true);

    try {
      if (!ethers.isAddress(vaultAddress)) {
        throw new Error('Invalid vault address');
      }
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      if (!approveMax) {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error('Invalid amount');
        }
      }

      if (!aaDeployed) {
        throw new Error('AA wallet not deployed. Deploy it first.');
      }
      if (derivedAA && spendingAccount && derivedAA.toLowerCase() !== spendingAccount.toLowerCase()) {
        throw new Error('Vault spending account does not match your AA wallet. Redeploy the vault.');
      }

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasPrivateKey) {
        const response = await fetch('/api/wallet/approve-erc20', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signerAddress,
            tokenAddress,
            spender: vaultAddress,
            amount,
            privateKey,
            tokenDecimals,
            useMax: approveMax,
            usePaymaster: !disablePaymaster
          })
        });

        const result = await response.json();
        if (result.status?.status === 'success') {
          setTxHash(result.status.transactionHash || '');
          onApproved?.();
        } else {
          throw new Error(result.status?.reason || 'Approval failed');
        }
      } else if (hasWalletClient) {
        if (walletClient.chain && walletClient.chain.id !== kiteTestnetChain.id) {
          throw new Error('Wrong network. Switch MetaMask to Kite Testnet.');
        }
        if (walletClient.account?.address && walletClient.account.address.toLowerCase() !== signerAddress.toLowerCase()) {
          throw new Error('Connected wallet does not match the signer address. Switch accounts.');
        }
        const { getKiteManager } = await import('@/lib/kite');
        const sdk = getKiteManager().getSDK();
        const erc20 = new ethers.Interface(['function approve(address spender, uint256 amount)']);
        const approveAmount = approveMax ? ethers.MaxUint256 : ethers.parseUnits(amount, tokenDecimals);
        const callData = erc20.encodeFunctionData('approve', [
          vaultAddress,
          approveAmount
        ]);

        const getErrorMessage = (err: unknown) => {
          if (err instanceof Error) return err.message;
          if (typeof err === 'string') return err;
          if (err && typeof err === 'object') {
            const anyErr = err as { message?: string; details?: { message?: string } };
            return anyErr.details?.message || anyErr.message || 'Unknown error';
          }
          return 'Unknown error';
        };

        const isAA33 = (message: string) => message.includes('AA33');

        const buildHashHex = (hash: Uint8Array | string) => {
          if (typeof hash === 'string') {
            return hash.startsWith('0x') ? hash : `0x${hash}`;
          }
          return `0x${Array.from(hash)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')}`;
        };

        const signWithWalletClient = () => async (hash: Uint8Array | string) => {
          const hashHex = buildHashHex(hash);
          let sig = '';
          sig = await createWalletClientSignFunction(walletClient, signerAddress)(hash);
          setLastSignMethod('personal_sign');
          console.log('[VaultApproval] personal_sign userOpHash:', hashHex);
          setLastUserOpHash(hashHex);
          setLastSignature(sig);
          try {
            setLastWalletAccount(walletClient.account?.address || '');
            const prefixed = ethers.verifyMessage(ethers.getBytes(hashHex), sig);
            setLastRecoveredPrefixed(prefixed);
            const raw = ethers.recoverAddress(hashHex, sig);
            setLastRecoveredRaw(raw);
          } catch {
            // ignore recovery errors
          }
          return sig;
        };

        const signWithEthSign = () => async (hash: Uint8Array | string) => {
          const hashHex = buildHashHex(hash);
          const ethereum = (window as typeof window & { ethereum?: { request?: (args: { method: string; params?: unknown[] }) => Promise<string> } }).ethereum;
          if (!ethereum?.request) {
            throw new Error('eth_sign not available in this wallet');
          }
          const sig = await ethereum.request({
            method: 'eth_sign',
            params: [signerAddress, hashHex]
          });
          setLastSignMethod('eth_sign');
          setLastUserOpHash(hashHex);
          setLastSignature(sig);
          try {
            setLastWalletAccount(walletClient.account?.address || '');
            const raw = ethers.recoverAddress(hashHex, sig);
            setLastRecoveredRaw(raw);
          } catch {
            // ignore recovery errors
          }
          return sig;
        };

        const paymasterOverride = disablePaymaster
          ? '0x0000000000000000000000000000000000000000'
          : undefined;

        const attemptApprove = async () => {
          return sdk.sendUserOperationAndWait(
            signerAddress,
            {
              target: tokenAddress,
              value: 0n,
              callData
            },
            signWithWalletClient(),
            undefined,
            paymasterOverride
          );
        };

        const sdkAny = sdk as any;
        const request = { target: tokenAddress, value: 0n, callData };
        const sendWithoutEstimate = async (signFn: (hash: Uint8Array | string) => Promise<string>, stageLabel: string) => {
          const userOp = await sdkAny.createUserOperation(
            signerAddress,
            request,
            undefined,
            paymasterOverride
          );
          const userOpHash = await sdk.getUserOpHash(userOp);
          const signature = await signFn(userOpHash);
          userOp.signature = signature;
          const opHash = await sdkAny.provider.sendUserOperation(userOp, sdkAny.config.entryPoint);
          const status = await sdk.pollUserOperationStatus(opHash);
          return { userOpHash: opHash, status, stage: stageLabel };
        };

        let lastReason = '';

        const runAttempt = async (fn: () => Promise<any>, stage: string) => {
          try {
            const res = await fn();
            if (res?.status?.reason) {
              lastReason = res.status.reason;
              setLastErrorDetails(res.status.reason);
            }
            return res;
          } catch (err) {
            const message = getErrorMessage(err);
            lastReason = message;
            setLastErrorDetails(message);
            setLastFailureStage(stage);
            return { status: { status: 'failed', reason: message } };
          }
        };

        const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
        let result: any;

        if (!disablePaymaster) {
          const paymasterFlow = async () => {
            const estimate = await sdk.estimateUserOperation(signerAddress, request);
            const tokenForPayment = estimate.sponsorshipAvailable
              ? ZERO_ADDRESS
              : KITE_CONTRACTS.SETTLEMENT_TOKEN;
            return sdk.sendUserOperationWithPayment(
              signerAddress,
              request,
              estimate.userOp,
              tokenForPayment,
              signWithWalletClient()
            );
          };

          result = await runAttempt(paymasterFlow, 'paymaster-flow');
        } else {
          result = await runAttempt(() => attemptApprove(), 'estimate+personal_sign');
          if (result?.status?.status !== 'success' && isAA33(result?.status?.reason || lastReason)) {
            result = await runAttempt(() => sendWithoutEstimate(signWithWalletClient(), 'no-estimate+personal_sign'), 'no-estimate+personal_sign');
          }
          if (result?.status?.status !== 'success' && isAA33(result?.status?.reason || lastReason)) {
            result = await runAttempt(() => sendWithoutEstimate(signWithEthSign(), 'no-estimate+eth_sign'), 'no-estimate+eth_sign');
          }
        }

        if (result?.status?.status === 'success') {
          setTxHash(result.status.transactionHash || '');
          onApproved?.();
        } else {
          throw new Error(result?.status?.reason || 'Approval failed');
        }
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleFund = async () => {
    setFundError('');
    setFundTxHash('');
    setFunding(true);

    try {
      if (!spendingAccount || !ethers.isAddress(spendingAccount)) {
        throw new Error('Spending account not available');
      }
      if (!aaDeployed) {
        throw new Error('AA wallet not deployed. Deploy it first.');
      }
      if (derivedAA && spendingAccount && derivedAA.toLowerCase() !== spendingAccount.toLowerCase()) {
        throw new Error('Vault spending account does not match your AA wallet.');
      }
      if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      const parsedAmount = parseFloat(fundAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount');
      }

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasPrivateKey) {
        const response = await fetch('/api/wallet/send-erc20-eoa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signerAddress,
            recipient: spendingAccount,
            amount: fundAmount,
            privateKey,
            tokenAddress,
            tokenDecimals
          })
        });

        const result = await response.json();
        if (result.success) {
          setFundTxHash(result.transactionHash || '');
          fetchInfo();
        } else {
          throw new Error(result.error || 'Funding failed');
        }
      } else if (hasWalletClient) {
        if (walletClient.account?.address && walletClient.account.address.toLowerCase() !== signerAddress.toLowerCase()) {
          throw new Error('Connected wallet does not match the signer address. Switch accounts.');
        }
        if (walletClient.chain && walletClient.chain.id !== kiteTestnetChain.id) {
          throw new Error('Wrong network. Switch MetaMask to Kite Testnet.');
        }

        const erc20 = new ethers.Interface(['function transfer(address to, uint256 amount)']);
        const callData = erc20.encodeFunctionData('transfer', [
          spendingAccount,
          ethers.parseUnits(fundAmount, tokenDecimals)
        ]);

        const hash = await walletClient.sendTransaction({
          account: signerAddress as `0x${string}`,
          to: tokenAddress as `0x${string}`,
          data: callData as `0x${string}`,
          value: 0n
        });

        setFundTxHash(hash);
        fetchInfo();
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setFundError(err instanceof Error ? err.message : 'Failed to fund AA wallet');
    } finally {
      setFunding(false);
    }
  };

  const handleRegisterToken = async () => {
    setRegisterError('');
    setRegisterTxHash('');
    setRegistering(true);

    try {
      const settlementToken = KITE_CONTRACTS.SETTLEMENT_TOKEN;
      if (!ethers.isAddress(settlementToken)) {
        throw new Error('Settlement token not configured');
      }
      if (!spendingAccount || !ethers.isAddress(spendingAccount)) {
        throw new Error('AA wallet address not available');
      }
      if (!aaDeployed) {
        throw new Error('AA wallet not deployed. Deploy it first.');
      }

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasPrivateKey) {
        const response = await fetch('/api/wallet/add-supported-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signerAddress,
            tokenAddress: settlementToken,
            privateKey
          })
        });
        const result = await response.json();
        if (result.status?.status === 'success') {
          setRegisterTxHash(result.status.transactionHash || '');
        } else {
          throw new Error(result.status?.reason || 'Register token failed');
        }
      } else if (hasWalletClient) {
        if (walletClient.chain && walletClient.chain.id !== kiteTestnetChain.id) {
          throw new Error('Wrong network. Switch MetaMask to Kite Testnet.');
        }
        if (walletClient.account?.address && walletClient.account.address.toLowerCase() !== signerAddress.toLowerCase()) {
          throw new Error('Connected wallet does not match the signer address. Switch accounts.');
        }

        const sdk = getKiteManager().getSDK();
        const sdkAny = sdk as any;
        const accountInterface = new ethers.Interface(['function addSupportedToken(address token)']);
        const callData = accountInterface.encodeFunctionData('addSupportedToken', [settlementToken]);
        const signFn = createWalletClientSignFunction(walletClient, signerAddress);

        const userOp = await sdkAny.createUserOperation(
          signerAddress,
          { target: spendingAccount, value: 0n, callData },
          undefined,
          '0x0000000000000000000000000000000000000000'
        );

        const packAccountGasLimits = (verificationGasLimit: bigint, callGasLimit: bigint) => {
          const uint128Max = (BigInt(1) << BigInt(128)) - BigInt(1);
          if (verificationGasLimit > uint128Max || callGasLimit > uint128Max) {
            throw new Error('Gas limit exceeds uint128 maximum');
          }
          const verificationHex = verificationGasLimit.toString(16).padStart(32, '0');
          const callHex = callGasLimit.toString(16).padStart(32, '0');
          return `0x${verificationHex}${callHex}`;
        };

        userOp.accountGasLimits = packAccountGasLimits(1_500_000n, 500_000n);
        userOp.preVerificationGas = 1_200_000n;

        const userOpHash = await sdk.getUserOpHash(userOp);
        const signature = await signFn(userOpHash);
        userOp.signature = signature;
        const opHash = await sdkAny.provider.sendUserOperation(userOp, sdkAny.config.entryPoint);
        const status = await sdk.pollUserOperationStatus(opHash);

        if (status?.status === 'success') {
          setRegisterTxHash(status.transactionHash || '');
        } else {
          throw new Error(status?.reason || 'Register token failed');
        }
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Register token failed');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div id="vault-approval" className="card-soft p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Approve Vault Spending</h2>
          <p className="text-sm text-slate-500 mt-1">
            Approving lets the vault spend from your AA wallet within your spending rules.
          </p>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
          <div>
            <div className="text-sm text-slate-500 mb-1">Token</div>
            <div className="text-sm font-mono text-blue-600 break-all">{tokenAddress || 'Loading...'}</div>
          </div>
          {vaultAddress && (
            <div>
              <div className="text-sm text-slate-500 mb-1">Vault Address</div>
              <div className="text-sm font-mono text-blue-600 break-all">{vaultAddress}</div>
            </div>
          )}
          {spendingAccount && (
            <div>
              <div className="text-sm text-slate-500 mb-1">Wallet Address</div>
              <div className="text-sm font-mono text-blue-600 break-all">{spendingAccount}</div>
            </div>
          )}
        </div>

        {derivedAA && spendingAccount && derivedAA.toLowerCase() !== spendingAccount.toLowerCase() && (
          <div className="text-amber-700 text-xs bg-amber-50 p-3 rounded-xl border border-amber-200">
            Vault spending account does not match your AA wallet. Please redeploy the vault.
          </div>
        )}

        {!aaDeployed && (
          <div className="text-amber-700 text-xs bg-amber-50 p-3 rounded-xl border border-amber-200">
            AA wallet not deployed yet. Deploy it before approving.
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <input
            id="approve-max"
            type="checkbox"
            checked={approveMax}
            onChange={(e) => setApproveMax(e.target.checked)}
          />
          <label htmlFor="approve-max">Follow the spending rules</label>
        </div>

        {!approveMax && (
          <div>
            <label className="block text-sm text-slate-500 mb-2">
              Allowance Amount ({tokenSymbol})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono text-sm"
              disabled={loading}
            />
          </div>
        )}

        <p className="text-xs text-slate-500">
          Vault can only spend tokens that your AA wallet has approved. You can revoke or change later.
        </p>

        {error && (
          <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl border border-rose-200">
            {error}
          </div>
        )}

        {txHash && (
          <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <div className="font-semibold mb-1">Approval Sent!</div>
            <div className="font-mono text-xs break-all">Hash: {txHash}</div>
          </div>
        )}

        <button
          onClick={handleApprove}
          disabled={loading || !tokenAddress || !aaDeployed || (derivedAA && spendingAccount && derivedAA.toLowerCase() !== spendingAccount.toLowerCase())}
          className="w-full btn-primary"
        >
          {loading ? 'Approving...' : 'Approve Vault'}
        </button>

        {(lastUserOpHash || lastSignature || lastErrorDetails || lastFailureStage || lastRecoveredPrefixed || lastRecoveredRaw) && (
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-semibold text-slate-700 mb-1">Debug (AA33)</div>
            {lastFailureStage && (
              <div>Stage: <span className="text-blue-600">{lastFailureStage}</span></div>
            )}
            {bundlerUrl && (
              <div>Bundler URL: <span className="text-blue-600">{bundlerUrl}</span></div>
            )}
            <div>Paymaster: <span className="text-blue-600">{disablePaymaster ? 'disabled' : 'enabled'}</span></div>
            {lastSignMethod && (
              <div>Method: <span className="text-blue-600">{lastSignMethod}</span></div>
            )}
            {lastWalletAccount && (
              <div>Wallet Account: <span className="text-blue-600">{lastWalletAccount}</span></div>
            )}
            {lastUserOpHash && (
              <div className="font-mono break-all">userOpHash: {lastUserOpHash}</div>
            )}
            {lastSignature && (
              <div className="font-mono break-all">signature: {lastSignature.slice(0, 18)}…</div>
            )}
            {lastRecoveredPrefixed && (
              <div className="font-mono break-all">recovered (prefixed): {lastRecoveredPrefixed}</div>
            )}
            {lastRecoveredRaw && (
              <div className="font-mono break-all">recovered (raw): {lastRecoveredRaw}</div>
            )}
            {lastErrorDetails && (
              <div className="font-mono break-all">error: {lastErrorDetails}</div>
            )}
          </div>
        )}

        
      </div>
    </div>
  );
}
