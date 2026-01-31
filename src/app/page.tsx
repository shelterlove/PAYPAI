'use client';

import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ThemeToggle from '@/components/ThemeToggle';
import sparkHackathonLogo from '../../images/spark_ai_hackthon.png';
import kiteAiLogo from '../../images/kite_ai.png';
import ethPandaLogo from '../../images/ETH_Panda.png';
import lxDaoLogo from '../../images/lxdao.svg';

const WalletConnect = dynamic(() => import('@/components/wallet/WalletConnect'), { ssr: false });
const WalletInfo = dynamic(() => import('@/components/wallet/WalletInfo'), { ssr: false });
const AICommand = dynamic(() => import('@/components/ai/AICommand'), { ssr: false });
const VaultManager = dynamic(() => import('@/components/vault/VaultManager'), { ssr: false });

export default function Home() {
  const [privateKey, setPrivateKey] = useState<string>('');
  const [manualAddress, setManualAddress] = useState<string>('');
  const [isWalletDeployed, setIsWalletDeployed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [vaultAddress, setVaultAddress] = useState('');
  const [vaultExecutorReady, setVaultExecutorReady] = useState(false);
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
      <main className="min-h-screen bg-[url('/grid-noise.svg')] bg-fixed bg-cover" style={{ background: 'var(--pp-bg-gradient)' }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <header className="text-center">
            <h1 className="text-5xl font-semibold text-white tracking-tight drop-shadow-lg">
              PayPai
            </h1>
            <p className="mt-3 text-base text-slate-400">Loading...</p>
          </header>
        </div>
      </main>
    );
  }

  // Show connect screen if no wallet is connected
  if (!signerAddress) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[url('/grid-noise.svg')] bg-fixed bg-cover" style={{ background: 'var(--pp-bg-gradient)' }}>
        <div className="absolute top-6 right-6 z-50">
          <ThemeToggle />
        </div>
        {/* Ambient Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-pp-purple/20 rounded-full blur-[120px] animate-float opacity-60"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pp-cyan/20 rounded-full blur-[100px] animate-float opacity-50" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 w-full max-w-md px-6 animate-fade-in-up">
          <div className="card p-8 sm:p-10 backdrop-blur-2xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
            <header className="text-center mb-10">
              <div className="inline-block mb-4 p-4 rounded-full bg-gradient-to-br from-white/5 to-white/0 border border-white/10 shadow-lg">
                <span className="text-5xl drop-shadow-md filter">💎</span>
              </div>
              <h1 className="text-6xl font-bold tracking-tighter mb-2">
                <span className="text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-white dark:to-pp-cyan drop-shadow-sm">Pay</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-pp-cyan dark:to-pp-purple drop-shadow-sm">Pai</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 font-light tracking-wide">
                AI Agent Wallet for <span className="text-blue-600 dark:text-pp-cyan font-medium">Kite Chain</span>
              </p>
            </header>

            <WalletConnect onPrivateKeyConnect={handlePrivateKeyConnect} />

            <div className="mt-8 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-600 uppercase tracking-widest font-bold">
                Powered by Kite AI • Secured by ERC-4337
              </p>
            </div>
          </div>
        </div>

        {/* Footer decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-white overflow-x-hidden perspective-1000 transition-colors duration-300" style={{ color: 'var(--pp-text-main)' }}>
      {/* Fixed Theme Toggle Button */}
      <div className="fixed top-6 right-6 z-50">
        <div className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 rounded-full p-1 border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300">
          <ThemeToggle />
        </div>
      </div>
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-pp-purple/30 blur-[120px] mix-blend-screen animate-float" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-pp-cyan/20 blur-[100px] mix-blend-screen animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full bg-pp-blue/20 blur-[80px] mix-blend-overlay animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 preserve-3d">
        <header ref={headerRef} className="mb-12 card p-8 backdrop-blur-3xl border-white/30 hover:transform-none">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
            <div>
              <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-white dark:to-pp-cyan drop-shadow-sm">
                PayPai
              </h1>
              <div className="mt-2 text-lg text-slate-600 dark:text-pp-cyan/80 font-medium">
                Secure AI wallet for Kite Chain
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="pill bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/20 dark:text-teal-200 dark:border-teal-500/30">Wallet Connected</span>
              <span className="pill bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30">{networkLabel}</span>
              <div className="glass rounded-xl overflow-hidden shadow-lg">
                <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
              </div>
              {!isConnected && manualAddress && (
                <button
                  onClick={() => {
                    setManualAddress('');
                    setPrivateKey('');
                    setIsWalletDeployed(false);
                  }}
                  className="btn-danger backdrop-blur-md"
                >
                  Disconnect Dev Key
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[450px_1fr] items-start">
          <section className="space-y-8 flex flex-col perspective-1000">
            <div className="card p-6 transform transition-transform duration-500 hover:rotate-x-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowSetupSteps((prev) => !prev)}
                  className="flex items-center gap-3 text-left w-full group"
                  aria-expanded={showSetupSteps}
                >
                  <span className="text-blue-600 dark:text-pp-cyan/70 text-lg transition-transform group-hover:scale-110">
                    {showSetupSteps ? '▾' : '▸'}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-pp-cyan transition-colors">Setup Steps</h2>
                </button>
              </div>
              {showSetupSteps && (
                <div className="relative mt-4 pl-4 space-y-3">
                  <div className="absolute left-[21px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-400/50 dark:from-pp-cyan/50 to-transparent"></div>

                  {[
                    { label: 'Deploy AA wallet', status: isWalletDeployed ? 'Done' : 'Pending', done: isWalletDeployed },
                    { label: 'Create & configure Vault', status: vaultAddress ? 'Done' : 'Pending', done: !!vaultAddress },
                    { label: 'Authorize automation', status: vaultExecutorReady ? 'Done' : 'Pending', done: vaultExecutorReady },
                    { label: 'Execute via Agent', status: vaultExecutorReady ? 'Ready' : 'Locked', done: vaultExecutorReady }
                  ].map((step, idx) => (
                    <div key={idx} className="relative flex items-center justify-between gap-4 py-2 pl-6 group">
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 ${step.done ? 'bg-blue-600 border-blue-600 dark:bg-pp-cyan dark:border-pp-cyan shadow-sm' : 'bg-slate-300 border-slate-400 dark:bg-slate-800 dark:border-slate-600'}`}></div>
                      <span className={`text-sm font-medium ${step.done ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{idx + 1}. {step.label}</span>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${step.done ? 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-pp-cyan/20 dark:text-pp-cyan dark:border-pp-cyan/30' : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'}`}>
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <WalletInfo
              signerAddress={signerAddress}
              privateKey={effectivePrivateKey}
              refreshTrigger={refreshTrigger}
              onDeploymentStatusChange={setIsWalletDeployed}
            />

            {isWalletDeployed && (
              <VaultManager
                aaWalletAddress={signerAddress}
                privateKey={effectivePrivateKey}
                onVaultReady={(address, executorReady) => {
                  setVaultAddress(address);
                  setVaultExecutorReady(executorReady);
                }}
                refreshTrigger={refreshTrigger}
                onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                useVault={useVault}
                vaultExecutorReady={vaultExecutorReady}
              />
            )}

            {!isWalletDeployed && (
              <div className="card border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-5">
                <p className="text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  Deploy your AA wallet to unlock Vault setup and agent execution.
                </p>
              </div>
            )}
          </section>

          <section className="space-y-6 relative">
            {isWalletDeployed ? (
              <>
                <div
                  className="sticky z-30 transition-all duration-300"
                  style={{ top: stickyTop }}
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
              <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6 animate-pulse">
                  <span className="text-4xl">🤖</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Agent Awaiting Authorization</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-sm">Deploy your smart wallet to activate the AI agent capabilities on the Kite Chain.</p>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-12 relative rounded-2xl border border-slate-200 dark:border-transparent bg-white dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 backdrop-blur-md shadow-lg dark:shadow-[0_0_40px_rgba(0,229,255,0.1)] p-8 overflow-hidden">
          {/* Dark theme gradient border */}
          <div className="hidden dark:block absolute inset-0 rounded-2xl bg-gradient-to-r from-pp-cyan/20 via-blue-500/20 to-purple-500/20 -z-10"></div>
          <div className="hidden dark:block absolute inset-[1px] rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 -z-10"></div>

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-pp-cyan dark:to-blue-400">
                SPARK AI Hackathon
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                感谢赞助方 Kite AI 以及举办方 ETH Panda 与 LX Dao 的支持。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://github.com/CasualHackathon/SPARK-AI-Hackathon"
                target="_blank"
                rel="noreferrer"
                className="h-12 w-auto group relative"
                title="SPARK AI Hackathon"
              >
                <div className="absolute inset-0 rounded-lg bg-white/0 dark:bg-white/5 group-hover:bg-white/100 dark:group-hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"></div>
                <Image src={sparkHackathonLogo} alt="SPARK AI Hackathon" className="relative h-12 w-auto object-contain opacity-90 group-hover:opacity-100 dark:opacity-80 dark:group-hover:opacity-100 transition-opacity p-1" />
              </a>
              <a
                href="https://gokite.ai/"
                target="_blank"
                rel="noreferrer"
                className="h-12 w-auto group relative"
                title="Kite AI"
              >
                <div className="absolute inset-0 rounded-lg bg-white/0 dark:bg-white/5 group-hover:bg-white/100 dark:group-hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"></div>
                <Image src={kiteAiLogo} alt="Kite AI" className="relative h-12 w-auto object-contain opacity-90 group-hover:opacity-100 dark:opacity-80 dark:group-hover:opacity-100 transition-opacity p-1" />
              </a>
              <a
                href="https://ethpanda.org/"
                target="_blank"
                rel="noreferrer"
                className="h-12 w-auto group relative"
                title="ETH Panda"
              >
                <div className="absolute inset-0 rounded-lg bg-white/0 dark:bg-white/5 group-hover:bg-white/100 dark:group-hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"></div>
                <Image src={ethPandaLogo} alt="ETH Panda" className="relative h-12 w-auto object-contain opacity-90 group-hover:opacity-100 dark:opacity-80 dark:group-hover:opacity-100 transition-opacity p-1" />
              </a>
              <a
                href="https://lxdao.io/"
                target="_blank"
                rel="noreferrer"
                className="h-12 w-auto group relative"
                title="LX Dao"
              >
                <div className="absolute inset-0 rounded-lg bg-white/0 dark:bg-white/5 group-hover:bg-white/100 dark:group-hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"></div>
                <Image src={lxDaoLogo} alt="LX Dao" className="relative h-12 w-auto object-contain opacity-90 group-hover:opacity-100 dark:opacity-80 dark:group-hover:opacity-100 transition-opacity p-1" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

