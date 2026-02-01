'use client';

import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import sparkHackathonLogo from '../../images/spark_ai_hackthon.png';
import kiteAiLogo from '../../images/kite_ai.png';
import ethPandaLogo from '../../images/ETH_Panda.png';
import lxDaoLogo from '../../images/lxdao.svg';
import paypaiLogo from '../../images/PayPai_LOGO.png';

const WalletConnect = dynamic(() => import('@/components/wallet/WalletConnect'), { ssr: false });
const WalletInfo = dynamic(() => import('@/components/wallet/WalletInfo'), { ssr: false });
const AICommand = dynamic(() => import('@/components/ai/AICommand'), { ssr: false });
const VaultManager = dynamic(() => import('@/components/vault/VaultManager'), { ssr: false });

export default function Home() {
  const [privateKey, setPrivateKey] = useState<string>('');
  const [manualAddress, setManualAddress] = useState<string>('');
  const [isWalletDeployed, setIsWalletDeployed] = useState(false);
  const [isWalletFunded, setIsWalletFunded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [vaultAddress, setVaultAddress] = useState('');
  const [vaultExecutorReady, setVaultExecutorReady] = useState(false);
  const [vaultAllowanceApproved, setVaultAllowanceApproved] = useState(false);
  const [useVault, setUseVault] = useState(true);
  const [showSetupSteps, setShowSetupSteps] = useState(true);
  const [stickyTop, setStickyTop] = useState(112);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const { address, isConnected } = useAccount();

  // Wait for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrivateKeyConnect = (address: string, key: string) => {
    console.log('handlePrivateKeyConnect:', { address, key: key ? 'exists' : 'empty' });
    setManualAddress(address);
    setPrivateKey(key);
  };

  const signerAddress = useMemo(() => {
    if (isConnected && address) return address;
    return manualAddress;
  }, [address, isConnected, manualAddress]);

  const effectivePrivateKey = isConnected ? '' : privateKey;
  const networkLabel = useMemo(() => {
    const network = process.env.NEXT_PUBLIC_KITE_NETWORK || 'kite_testnet';
    if (network.toLowerCase().includes('test')) return 'Kite Testnet';
    return network.replace(/_/g, ' ').toUpperCase();
  }, []);

  useEffect(() => {
    if (isConnected) {
      setManualAddress('');
      setPrivateKey('');
    }
  }, [isConnected]);

  useEffect(() => {
    if (signerAddress) {
      setIsWalletDeployed(false);
      setVaultAddress('');
      setVaultExecutorReady(false);
      setVaultAllowanceApproved(false);
    }
  }, [signerAddress]);

  useEffect(() => {
    const measure = () => {
      if (!headerRef.current) return;
      const height = headerRef.current.getBoundingClientRect().height;
      const nextTop = Math.round(height + 24);
      if (Number.isFinite(nextTop) && nextTop > 0) {
        setStickyTop(nextTop);
      }
    };

    const id = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', measure);
    };
  }, [networkLabel, isConnected, manualAddress]);

  // Show loading during SSR
  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#F1F9FB] to-white">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <header className="text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-32 w-32 flex items-center justify-center">
                <Image src={paypaiLogo} alt="PayPai logo" className="h-28 w-28 object-contain" />
              </div>
              <h1 className="paypai-logo text-5xl tracking-tight">
                PayPai
              </h1>
            </div>
            <p className="mt-3 text-base text-slate-500">Loading...</p>
          </header>
        </div>
      </main>
    );
  }

  // Show connect screen if no wallet is connected
  if (!signerAddress) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#F1F9FB] to-white">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <header className="text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-32 w-32 flex items-center justify-center">
                <Image src={paypaiLogo} alt="PayPai logo" className="h-28 w-28 object-contain" />
              </div>
              <h1 className="paypai-logo text-5xl tracking-tight">
                PayPai
              </h1>
            </div>
            <p className="mt-3 text-base text-slate-500">
              AI-powered smart wallet for Kite AI Chain.
            </p>
          </header>

          <div className="mt-10">
            <WalletConnect onPrivateKeyConnect={handlePrivateKeyConnect} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#F1F9FB] to-white text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_top,_rgba(92,213,221,0.24),_transparent_70%)]"></div>
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_top,_rgba(90,57,186,0.18),_transparent_70%)]"></div>
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#F1F9FB] via-white/70 to-transparent"></div>
      </div>
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <header ref={headerRef} className="mb-8 card-soft p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 flex items-center justify-center">
                  <Image src={paypaiLogo} alt="PayPai logo" className="h-20 w-20 object-contain" />
                </div>
                <h1 className="paypai-logo text-4xl tracking-tight">
                  PayPai
                </h1>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Secure AI wallet for Kite Chain.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill bg-[#5CD5DD]/20 text-[#0F89C0]">Wallet Connected</span>
              <span className="pill bg-[#5A39BA]/10 text-[#5A39BA]">{networkLabel}</span>
              <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
              {!isConnected && manualAddress && (
                <button
                  onClick={() => {
                    setManualAddress('');
                    setPrivateKey('');
                    setIsWalletDeployed(false);
                  }}
                  className="btn-danger"
                >
                  Disconnect Dev Key
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <section className="space-y-6">
            <div className="card-soft p-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowSetupSteps((prev) => !prev)}
                  className="flex items-center gap-2 text-left"
                  aria-expanded={showSetupSteps}
                >
                  <span className="text-sm text-slate-500">
                    {showSetupSteps ? '▾' : '▸'}
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">Setup Steps</h2>
                </button>
              </div>
              {showSetupSteps && (
                <div className="relative mt-3 pl-6 text-sm text-slate-700">
                  <div className="absolute left-3 top-1 bottom-1 w-px bg-slate-200"></div>
                  <div className="relative flex items-center justify-between gap-4 py-1.5">
                    <span>1. Deploy AA wallet</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${isWalletDeployed ? 'bg-[#5CD5DD]/20 text-[#0F89C0]' : 'bg-white text-slate-500 border border-[color:var(--pp-border)]'}`}>
                      {isWalletDeployed ? 'Done' : 'Pending'}
                    </span>
                  </div>
                  <div className="relative flex items-center justify-between gap-4 py-1.5">
                    <span>2. Fund your AA wallet</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${isWalletFunded ? 'bg-[#5CD5DD]/20 text-[#0F89C0]' : 'bg-white text-slate-500 border border-[color:var(--pp-border)]'}`}>
                      {isWalletFunded ? 'Done' : 'Pending'}
                    </span>
                  </div>
                  <div className="relative flex items-center justify-between gap-4 py-1.5">
                    <span>3. Create and Authorize Vault</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        vaultAddress && vaultExecutorReady
                          ? 'bg-[#5CD5DD]/20 text-[#0F89C0]'
                          : vaultAddress
                            ? 'bg-[#5A39BA]/10 text-[#5A39BA]'
                            : 'bg-white text-slate-500 border border-[color:var(--pp-border)]'
                      }`}
                    >
                      {vaultAddress && vaultExecutorReady ? 'Done' : vaultAddress ? 'In progress' : 'Pending'}
                    </span>
                  </div>
                  <div className="relative flex items-center justify-between gap-4 py-1.5">
                    <span>4. Approve Vault Allowance</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        vaultAllowanceApproved
                          ? 'bg-[#5CD5DD]/20 text-[#0F89C0]'
                          : 'bg-white text-slate-500 border border-[color:var(--pp-border)]'
                      }`}
                    >
                      {vaultAllowanceApproved ? 'Done' : 'Pending'}
                    </span>
                  </div>
                  <div className="relative flex items-center justify-between gap-4 py-1.5">
                    <span>5. Execute via Agent</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${vaultExecutorReady ? 'bg-[#5A39BA]/10 text-[#5A39BA]' : 'bg-white text-slate-500 border border-[color:var(--pp-border)]'}`}>
                      {vaultExecutorReady ? 'Ready' : 'Locked'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <WalletInfo
              signerAddress={signerAddress}
              privateKey={effectivePrivateKey}
              refreshTrigger={refreshTrigger}
              onDeploymentStatusChange={setIsWalletDeployed}
              onFundingStatusChange={setIsWalletFunded}
            />

            {isWalletDeployed && (
            <VaultManager
              aaWalletAddress={signerAddress}
              privateKey={effectivePrivateKey}
              onVaultReady={(address, executorReady) => {
                setVaultAddress(address);
                setVaultExecutorReady(executorReady);
              }}
              onAllowanceStatusChange={setVaultAllowanceApproved}
              refreshTrigger={refreshTrigger}
              onRefresh={() => setRefreshTrigger(prev => prev + 1)}
              useVault={useVault}
              vaultExecutorReady={vaultExecutorReady}
            />
            )}

            {!isWalletDeployed && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                Deploy your AA wallet to unlock Vault setup and agent execution.
              </div>
            )}
          </section>

          <section className="space-y-6">
            {isWalletDeployed ? (
              <>
                <div
                  className="sticky z-30"
                  style={{ top: stickyTop, '--pp-sticky-top': `${stickyTop}px` } as CSSProperties}
                >
                  <AICommand
                    signerAddress={signerAddress}
                    privateKey={effectivePrivateKey}
                    vaultAddress={vaultAddress}
                    useVault={useVault && vaultExecutorReady}
                    onToggleVault={(value) => setUseVault(value)}
                    vaultToggleDisabled={!vaultExecutorReady}
                    refreshTrigger={refreshTrigger}
                    onTransactionExecuted={() => setRefreshTrigger(prev => prev + 1)}
                  />
                </div>
              </>
            ) : (
              <div className="card p-6 text-sm text-slate-600">
                Deploy your AA wallet to unlock the AI agent.
              </div>
            )}
          </section>
        </div>

        <footer className="mt-12 rounded-2xl border border-[color:var(--pp-border)] bg-white/80 p-6 shadow-[var(--pp-shadow)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">SPARK AI Hackathon</div>
              <p className="mt-1 text-sm text-slate-500">
                感谢赞助方 Kite AI 以及举办方 ETH Panda 与 LX Dao 的支持。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://github.com/CasualHackathon/SPARK-AI-Hackathon"
                target="_blank"
                rel="noreferrer"
                className="h-10 w-auto"
                title="SPARK AI Hackathon"
              >
                <Image src={sparkHackathonLogo} alt="SPARK AI Hackathon" className="h-10 w-auto object-contain" />
              </a>
              <a
                href="https://gokite.ai/"
                target="_blank"
                rel="noreferrer"
                className="h-10 w-auto"
                title="Kite AI"
              >
                <Image src={kiteAiLogo} alt="Kite AI" className="h-10 w-auto object-contain" />
              </a>
              <a
                href="https://ethpanda.org/"
                target="_blank"
                rel="noreferrer"
                className="h-10 w-auto"
                title="ETH Panda"
              >
                <Image src={ethPandaLogo} alt="ETH Panda" className="h-10 w-auto object-contain" />
              </a>
              <a
                href="https://lxdao.io/"
                target="_blank"
                rel="noreferrer"
                className="h-10 w-auto"
                title="LX Dao"
              >
                <Image src={lxDaoLogo} alt="LX Dao" className="h-10 w-auto object-contain" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
