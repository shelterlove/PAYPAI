'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClientSignFunction } from '@/lib/wallet-client';
import { kiteTestnetChain } from '@/lib/wagmi';
import { KITE_CONTRACTS } from '@/types';
import { formatAddress } from '@/lib/wallet';
import agentAvatar from '../../../images/agent_profile.png';
import userAvatar from '../../../images/user_profile.png';

type ChatMessage = {
  role: 'user' | 'assistant';
  content?: string;
  kind?: 'confirm' | 'status';
  details?: { label: string; value: string }[];
  status?: 'success' | 'error';
  hash?: string;
};

interface AICommandProps {
  signerAddress: string;
  privateKey: string;
  refreshTrigger?: number;
  onTransactionExecuted?: () => void;
  vaultAddress?: string;
  useVault?: boolean;
  onToggleVault?: (value: boolean) => void;
  vaultToggleDisabled?: boolean;
}

export default function AICommand({
  signerAddress,
  privateKey,
  refreshTrigger,
  onTransactionExecuted,
  vaultAddress,
  useVault,
  onToggleVault,
  vaultToggleDisabled
}: AICommandProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Tell me the payment you want to make. I will parse it and prepare a transaction for review.'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [txResult, setTxResult] = useState<any>(null);
  const [assetType, setAssetType] = useState<'ETH' | 'ERC20'>('ETH');
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('TOKEN');
  const [tokenDecimals, setTokenDecimals] = useState('18');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [lastConfirmed, setLastConfirmed] = useState<{ recipient: string; amount: string; token?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  const vaultMode = Boolean(useVault && vaultAddress);
  const explorerBase = kiteTestnetChain.blockExplorers?.default.url;

  useEffect(() => {
    if (vaultMode) {
      setAssetType('ERC20');
      setTokenAddress(KITE_CONTRACTS.SETTLEMENT_TOKEN);
      setTokenSymbol(process.env.NEXT_PUBLIC_SETTLEMENT_TOKEN_SYMBOL || 'USDT');
      setTokenDecimals(String(KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS));
    }
  }, [vaultMode]);

  useEffect(() => {
    if (!parsedResult || vaultMode) return;
    const token = (parsedResult.parsed?.token || 'ETH').toUpperCase();
    if (token === 'ETH') {
      setAssetType('ETH');
      setTokenSymbol('ETH');
      return;
    }

    setAssetType('ERC20');
    setTokenSymbol(token);
    if (token === 'KITE') {
      setTokenAddress(KITE_CONTRACTS.SETTLEMENT_TOKEN);
      setTokenDecimals(String(KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS));
    }
  }, [parsedResult, vaultMode]);

  const assistantMessages = useMemo(() => messages, [messages]);

  const toPlainMessages = (items: ChatMessage[]) =>
    items
      .map((message) => {
        if (message.kind) {
          return null;
        }
        if (message.content) {
          return { role: message.role, content: message.content };
        }
        return null;
      })
      .filter(Boolean) as Array<{ role: 'user' | 'assistant'; content: string }>;

  const buildConfirmationMessage = (parsed: any) => {
    const tokenLabel = (parsed?.token || (vaultMode ? tokenSymbol : assetType === 'ETH' ? 'ETH' : tokenSymbol)) as string;
    const recipient = parsed?.recipient ? formatAddress(parsed.recipient, 6) : '—';
    const amount = parsed?.amount ? `${parsed.amount}` : '—';
    const tokenAddr = tokenAddress ? formatAddress(tokenAddress, 6) : '—';
    return {
      role: 'assistant' as const,
      kind: 'confirm' as const,
      content: 'Please confirm. Reply "yes" to send or "no" to cancel.',
      details: [
        { label: 'Recipient', value: recipient },
        { label: 'Amount', value: amount },
        { label: 'Token Symbol', value: tokenLabel },
        { label: 'Token Address', value: tokenAddr }
      ]
    };
  };

  const formatHash = (hash: string) => {
    if (!hash || hash.length <= 12) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore copy errors
    }
  };

  const isRepeatIntent = (text: string) =>
    /(repeat|again|same as before|last transaction|previous transaction)/i.test(text);

  const isActionIntent = (text: string) =>
    /(send|transfer|pay|approve|swap|withdraw)/i.test(text) ||
    /0x[a-fA-F0-9]{40}/.test(text) ||
    /\b\d+(\.\d+)?\b/.test(text);

  const applyEdits = (text: string) => {
    if (!parsedResult?.parsed) return { updated: false, message: '', parsed: null };

    let updated = false;
    const nextParsed = { ...parsedResult.parsed };

    const amountMatch =
      text.match(/(?:amount|amt|set amount|change amount|make it)\s*(?:to|=)?\s*([0-9]*\.?[0-9]+)/i) ||
      text.match(/(?:amount)\s*([0-9]*\.?[0-9]+)/i);
    if (amountMatch?.[1]) {
      nextParsed.amount = amountMatch[1];
      updated = true;
    }

    const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch && /recipient|to|address/i.test(text)) {
      nextParsed.recipient = addressMatch[0];
      updated = true;
    }

    const tokenAddressMatch = text.match(/token\s*(?:address)?\s*(0x[a-fA-F0-9]{40})/i);
    if (tokenAddressMatch?.[1]) {
      setTokenAddress(tokenAddressMatch[1]);
      setAssetType('ERC20');
      nextParsed.token = tokenSymbol;
      updated = true;
    }

    const tokenSymbolMatch = text.match(/(?:token|use)\s+([A-Za-z0-9]{2,10})/i);
    if (tokenSymbolMatch?.[1] && !tokenSymbolMatch[1].startsWith('0x')) {
      const symbol = tokenSymbolMatch[1].toUpperCase();
      setTokenSymbol(symbol);
      setAssetType(symbol === 'ETH' ? 'ETH' : 'ERC20');
      nextParsed.token = symbol;
      updated = true;
    }

    if (updated) {
      setParsedResult({ ...parsedResult, parsed: nextParsed });
      setMessages((prev) => removeLatestConfirm(prev));
      return { updated: true, message: 'Updated the transaction details.', parsed: nextParsed };
    }
    return { updated: false, message: '', parsed: null };
  };

  const removeLatestConfirm = (items: ChatMessage[]) => {
    const next = [...items];
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if (next[i]?.kind === 'confirm') {
        next.splice(i, 1);
        break;
      }
    }
    return next;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const trimmed = input.trim();
    const normalized = trimmed.toLowerCase();

    if (awaitingConfirmation) {
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setInput('');

      const editResult = applyEdits(trimmed);
      if (editResult.updated) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: editResult.message },
          buildConfirmationMessage(editResult.parsed)
        ]);
        return;
      }

      const yesWords = ['yes', 'y', 'confirm', 'ok', 'okay', 'sure', 'go ahead', 'proceed', 'send', 'yep', 'yup', 'no problem', 'no worries', 'sounds good'];
      const noWords = ['no', 'n', 'cancel', 'stop', 'abort', 'nevermind'];

      if (yesWords.some((word) => normalized.includes(word))) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Executing the transaction now.' }]);
        setAwaitingConfirmation(false);
        await handleExecute();
      } else if (noWords.some((word) => normalized.includes(word))) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Cancelled. You can describe a new payment.' }]);
        setAwaitingConfirmation(false);
        setParsedResult(null);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Please reply with "yes" to confirm, "no" to cancel, or say "change amount to 0.5".' }
        ]);
      }
      return;
    }

    if (isRepeatIntent(trimmed) && lastConfirmed) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        buildConfirmationMessage(lastConfirmed)
      ]);
      setParsedResult({ parsed: lastConfirmed, transaction: null });
      setAwaitingConfirmation(true);
      setInput('');
      return;
    }

    const nextMessages = [...assistantMessages, { role: 'user' as const, content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setIsTyping(true);
    setError('');
    setTxResult(null);
    setParsedResult(null);

    try {
      const payloadMessages = toPlainMessages(nextMessages).slice(-8);
      const mode = isActionIntent(trimmed) ? 'auto' : 'chat';
      const response = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages, mode })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || 'Failed to parse command';
        setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }]);
        setError(errorMsg);
        return;
      }

      if (mode === 'chat' && result.status !== 'chat') {
        const reply = result.reply || 'Let me know if you want to send a payment.';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        setAwaitingConfirmation(false);
        return;
      }

      if (result.status === 'ready') {
        setParsedResult({
          parsed: result.parsed,
          transaction: result.transaction
        });
        setMessages((prev) => [...prev, buildConfirmationMessage(result.parsed)]);
        setAwaitingConfirmation(true);
      } else if (result.status === 'chat') {
        const reply = result.reply || 'How can I help you?';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        setAwaitingConfirmation(false);
      } else {
        const reply = result.reply || 'Tell me more.';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to parse command';
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }]);
      setError(errorMsg);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleExecute = async () => {
    if (!parsedResult?.parsed) return;

    setError('');
    setLoading(true);

    try {
      const recipient = parsedResult.parsed?.recipient || parsedResult.transaction?.target;
      if (!recipient || !ethers.isAddress(recipient)) {
        throw new Error('Invalid recipient address');
      }

      const parsedAmount = parseFloat(parsedResult.parsed?.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount');
      }

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (vaultMode) {
        if (!tokenAddress || tokenAddress.toLowerCase() !== KITE_CONTRACTS.SETTLEMENT_TOKEN.toLowerCase()) {
          throw new Error('Vault execution only supports settlement token transfers.');
        }

        const response = await fetch('/api/vault/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vaultAddress,
            recipient,
            amount: parsedResult.parsed.amount
          })
        });

        const result = await response.json();

        if (result.success) {
          setTxResult({
            success: true,
            hash: result.transactionHash
          });
          onTransactionExecuted?.();
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              kind: 'status',
              status: 'success',
              hash: result.transactionHash
            }
          ]);
          setLastConfirmed({
            recipient,
            amount: parsedResult.parsed.amount,
            token: parsedResult.parsed.token || tokenSymbol
          });
          setParsedResult(null);
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
              amount: parsedResult.parsed.amount,
              privateKey
            })
          });

          const result = await response.json();

          if (result.status?.status === 'success') {
            setTxResult({
              success: true,
              hash: result.status.transactionHash
            });
            onTransactionExecuted?.();
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                kind: 'status',
                status: 'success',
                hash: result.status.transactionHash
              }
            ]);
            setLastConfirmed({
              recipient,
              amount: parsedResult.parsed.amount,
              token: parsedResult.parsed.token || tokenSymbol
            });
            setParsedResult(null);
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
              amount: parsedResult.parsed.amount,
              privateKey,
              tokenAddress,
              tokenDecimals: parseInt(tokenDecimals, 10) || 18
            })
          });

          const result = await response.json();

          if (result.status?.status === 'success') {
            setTxResult({
              success: true,
              hash: result.status.transactionHash
            });
            onTransactionExecuted?.();
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                kind: 'status',
                status: 'success',
                hash: result.status.transactionHash
              }
            ]);
            setLastConfirmed({
              recipient,
              amount: parsedResult.parsed.amount,
              token: parsedResult.parsed.token || tokenSymbol
            });
            setParsedResult(null);
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
            value: ethers.parseEther(String(parsedResult.parsed.amount)),
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
            ethers.parseUnits(parsedResult.parsed.amount, decimals)
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
          setTxResult({
            success: true,
            hash: result.status.transactionHash
          });
          onTransactionExecuted?.();
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              kind: 'status',
              status: 'success',
              hash: result.status.transactionHash
            }
          ]);
          setLastConfirmed({
            recipient,
            amount: parsedResult.parsed.amount,
            token: parsedResult.parsed.token || tokenSymbol
          });
          setParsedResult(null);
        } else {
          throw new Error(result.status?.reason || 'Transaction failed');
        }
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute transaction';
      setError('');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMsg,
          kind: 'status',
          status: 'error'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!messagesEndRef.current) return;
    const id = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  return (
    <div
      id="agent-console"
      className="card flex flex-col min-h-[calc(100vh-var(--pp-sticky-top)-24px)] max-h-[calc(100vh-var(--pp-sticky-top))]"
    >
      <div className="flex items-center justify-between gap-3 mb-4 p-6 pb-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full animate-pulse bg-pp-cyan shadow-[0_0_10px_#00E5FF]"></div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-pp-purple">
            AI Agent
          </h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-b-[28px] pointer-events-none"></div>
        <div className="flex-1 overflow-auto p-6 space-y-6 relative z-10 custom-scrollbar">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''} animate-slide-in`}>
              {message.role === 'assistant' && (
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
                  <Image
                    src={agentAvatar}
                    alt="Agent avatar"
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-3xl px-6 py-4 text-sm leading-relaxed backdrop-blur-md shadow-lg transition-transform hover:scale-[1.01] ${message.role === 'assistant'
                  ? message.kind === 'confirm'
                    ? 'border border-pp-purple/40 bg-pp-purple/10 text-white'
                    : message.kind === 'status'
                      ? message.status === 'success'
                        ? 'border border-emerald-500/40 bg-emerald-900/40 text-emerald-100'
                        : 'border border-rose-500/40 bg-rose-900/40 text-rose-100'
                      : 'border border-white/10 bg-white/10 text-white/90'
                  : 'border border-pp-cyan/30 bg-gradient-to-br from-pp-cyan/20 to-pp-blue/20 text-white rounded-tr-sm'
                  }`}
              >
                {message.kind === 'confirm' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                      <span className="text-lg">⚡</span>
                      <span className="text-xs uppercase tracking-[0.2em] text-pp-violet font-bold">Transaction Review</span>
                    </div>
                    {message.content && (
                      <div className="text-white/80">
                        {message.content}
                      </div>
                    )}
                    {message.details && (
                      <div className="space-y-2 bg-black/20 rounded-xl p-3">
                        {message.details.map((detail) => (
                          <div key={detail.label} className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">{detail.label}</span>
                            <span className="font-mono text-pp-cyan">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <div className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded">Reply "Yes" to confirm</div>
                    </div>
                  </div>
                ) : message.kind === 'status' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-1 border-b border-white/10">
                      <span className="text-lg">{message.status === 'success' ? '✅' : '❌'}</span>
                      <span className="text-xs uppercase tracking-[0.2em] font-bold opacity-90">
                        {message.status === 'success' ? 'Confirmed' : 'Failed'}
                      </span>
                    </div>
                    {message.status === 'success' && message.hash ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs text-white/70">Transaction successfully executed on Kite Chain.</div>
                        <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/5">
                          <span className="text-slate-400 text-xs">Hash</span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-pp-cyan text-xs">{formatHash(message.hash)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(message.hash!)}
                              className="opacity-50 hover:opacity-100 text-white transition-opacity"
                              title="Copy"
                            >
                              ⧉
                            </button>
                            {explorerBase && (
                              <a
                                href={`${explorerBase}/tx/${message.hash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="opacity-50 hover:opacity-100 text-white transition-opacity"
                                title="View on explorer"
                              >
                                ↗
                              </a>
                            )}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-rose-100">{message.content}</div>
                    )}
                  </div>
                ) : (
                  message.content
                )}
              </div>
              {message.role === 'user' && (
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-pp-cyan/30 shadow-lg">
                  <Image
                    src={userAvatar}
                    alt="User avatar"
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex items-start gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white/20">
                <Image src={agentAvatar} alt="Agent" width={40} height={40} />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-white/5 border border-white/10">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-pp-cyan/50 animate-bounce [animation-delay:-0.2s]"></span>
                  <span className="h-2 w-2 rounded-full bg-pp-cyan/50 animate-bounce [animation-delay:-0.1s]"></span>
                  <span className="h-2 w-2 rounded-full bg-pp-cyan/50 animate-bounce"></span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-md relative z-20 rounded-b-[28px]">
          {assetType === 'ERC20' && !vaultMode && (
            <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
              <div className="text-xs uppercase tracking-[0.16em] text-pp-cyan/80 font-semibold">
                Token details (optional)
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Token Address</label>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-pp-cyan/50 focus:outline-none"
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Symbol</label>
                  <input
                    type="text"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-pp-cyan/50 focus:outline-none"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Decimals</label>
                  <input
                    type="number"
                    value={tokenDecimals}
                    onChange={(e) => setTokenDecimals(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-pp-cyan/50 focus:outline-none"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="relative flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask to send ETH or tokens..."
              className="flex-1 w-full px-5 py-4 bg-slate-100 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/30 focus:outline-none focus:border-blue-500 dark:focus:border-pp-cyan/50 focus:ring-1 focus:ring-blue-500/20 dark:focus:ring-pp-cyan/20 font-medium transition-all"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-pp-primary-gradient text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
              aria-label="Send"
            >
              {loading ? (
                <span className="block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <span className="text-xl">➤</span>
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {[
              'Send 0.001 ETH to 0x1234...',
              'Transfer 0.01 USDT to my friend',
              'Pay 0.005 KITE',
              'Send 15 USDT to 0xabcd...'
            ].map(txt => (
              <button
                key={txt}
                type="button"
                onClick={() => setInput(txt)}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                {txt}
              </button>
            ))}
          </div>

          {useVault && vaultAddress && (
            <p className="text-xs text-pp-cyan mt-3 text-center border-t border-white/5 pt-2">
              <span className="mr-1">🔒</span> Vault mode active: Settlement tokens only.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
