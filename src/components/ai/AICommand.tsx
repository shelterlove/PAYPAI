'use client';

import { useEffect, useRef, useState, memo } from 'react';
import Image from 'next/image';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClientSignFunction } from '@/lib/wallet-client';
import { kiteTestnetChain } from '@/lib/wagmi';
import { KITE_CONTRACTS } from '@/types';
import { formatAddress } from '@/lib/wallet';
import agentAvatar from '../../../images/agent_profile.png';
import userAvatar from '../../../images/user_profile.png';
import agentAvatarDark from '../../../images/agent_profile_dark.jpg';
import userAvatarDark from '../../../images/user_profile_dark.jpg';

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
  onTransactionExecuted?: () => void;
  vaultAddress?: string;
  useVault?: boolean;
  onToggleVault?: (value: boolean) => void;
  vaultToggleDisabled?: boolean;
}

function AICommand({
  signerAddress,
  privateKey,
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
  const [namedRecipients, setNamedRecipients] = useState<Record<string, string>>({});
  const [pendingRecipientName, setPendingRecipientName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  const vaultMode = Boolean(useVault && vaultAddress);
  const explorerBase = kiteTestnetChain.blockExplorers?.default.url;

  useEffect(() => {
    const updateTheme = () => {
      if (typeof document === 'undefined') return;
      setIsDarkMode(document.documentElement.classList.contains('theme-dark'));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  const extractAddress = (text: string) => text.match(/0x[a-fA-F0-9]{40}/)?.[0];

  const extractName = (text: string) => {
    const match = text.match(/\b(?:to|for)\s+([a-zA-Z][a-zA-Z0-9_-]{1,20})\b/i);
    return match?.[1];
  };

  const extractNameFromReply = (text: string) => {
    const match =
      text.match(/\b([A-Z][a-z]+)'s wallet address\b/) ||
      text.match(/\b([A-Z][a-z]+) wallet address\b/) ||
      text.match(/\bfor ([A-Z][a-z]+)\b/);
    return match?.[1];
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

    const messageAddress = extractAddress(trimmed);
    const nameMention = extractName(trimmed);

    if (messageAddress && nameMention) {
      setNamedRecipients((prev) => ({ ...prev, [nameMention.toLowerCase()]: messageAddress }));
      setPendingRecipientName(null);
    }

    let processed = trimmed;
    if (!messageAddress && nameMention && namedRecipients[nameMention.toLowerCase()]) {
      processed = `${trimmed} (${namedRecipients[nameMention.toLowerCase()]})`;
    } else if (messageAddress && pendingRecipientName && !nameMention) {
      setNamedRecipients((prev) => ({ ...prev, [pendingRecipientName.toLowerCase()]: messageAddress }));
      processed = `${pendingRecipientName} ${messageAddress}`;
      setPendingRecipientName(null);
    }

    const nextMessages = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setIsTyping(true);
    setError('');
    setTxResult(null);
    setParsedResult(null);

    try {
      const payloadMessages = toPlainMessages(nextMessages).slice(-8);
      if (payloadMessages.length && processed !== trimmed) {
        payloadMessages[payloadMessages.length - 1].content = processed;
      }
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
        setPendingRecipientName(null);
      } else if (result.status === 'chat') {
        const reply = result.reply || 'How can I help you?';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        setAwaitingConfirmation(false);
        setPendingRecipientName(null);
      } else {
        const reply = result.reply || 'Tell me more.';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        const candidateName = extractNameFromReply(reply);
        setPendingRecipientName(candidateName ? candidateName : null);
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
    const id = requestAnimationFrame(() => {
      if (!messagesContainerRef.current) return;
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  return (
    <div
      id="agent-console"
      className="card-soft p-6 flex flex-col min-h-[calc(100vh-var(--pp-sticky-top)-24px)] max-h-[calc(100vh-var(--pp-sticky-top))]"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-[color:var(--pp-accent)]"></div>
          <h2 className="text-xl font-semibold text-slate-900">
            AI Agent
          </h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="rounded-2xl border border-[color:var(--pp-chat-card-border)] bg-[color:var(--pp-chat-card-bg)] shadow-[var(--pp-shadow)] flex-1 flex flex-col min-h-0">
          <div ref={messagesContainerRef} className="flex-1 overflow-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && (
                  <div
                    className={`h-9 w-9 rounded-full overflow-hidden shadow-sm ${
                      isDarkMode
                        ? 'bg-[#1F2A44] ring-1 ring-white/20'
                        : 'bg-[var(--pp-gradient)] ring-1 ring-white/70'
                    }`}
                  >
                    <Image
                      src={isDarkMode ? agentAvatarDark : agentAvatar}
                      alt="Agent avatar"
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    message.role === 'assistant'
                      ? message.kind === 'confirm'
                        ? 'border border-[color:var(--pp-confirm-border)] bg-[color:var(--pp-confirm-bg)] text-[color:var(--pp-confirm-text)]'
                        : message.kind === 'status'
                          ? message.status === 'success'
                            ? 'border border-[color:var(--pp-success-border)] bg-[color:var(--pp-success-bg)] text-[color:var(--pp-success-text)]'
                            : 'border border-[color:var(--pp-error-border)] bg-[color:var(--pp-error-bg)] text-[color:var(--pp-error-text)]'
                          : 'border border-slate-200 bg-slate-50 text-slate-600'
                      : 'border border-[color:var(--pp-user-border)] bg-[color:var(--pp-user-bg)] text-[color:var(--pp-user-text)]'
                  }`}
                >
                  {message.kind === 'confirm' ? (
                    <div className="space-y-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-accent font-semibold">
                        Transaction Review
                      </div>
                      {message.content && (
                        <div className="text-sm text-slate-700">
                          {message.content}
                        </div>
                      )}
                      {message.details && (
                        <div className="space-y-2">
                          {message.details.map((detail) => (
                            <div key={detail.label} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm theme-dark:bg-slate-900/60">
                              <span className="text-slate-500">{detail.label}</span>
                              <span className="font-mono text-slate-700">{detail.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : message.kind === 'status' ? (
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-[0.16em] font-semibold">
                        {message.status === 'success' ? 'Transaction Confirmed' : 'Transaction Failed'}
                      </div>
                      {message.status === 'success' && message.hash ? (
                        <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm theme-dark:bg-slate-900/60">
                          <span className="text-slate-500">Hash</span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-slate-700">{formatHash(message.hash)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(message.hash!)}
                              className="btn-tertiary px-2 py-0.5 text-xs"
                              title="Copy"
                            >
                              ⧉
                            </button>
                            {explorerBase && (
                              <a
                                href={`${explorerBase}/tx/${message.hash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-tertiary px-2 py-0.5 text-xs"
                                title="View on explorer"
                              >
                                ↗
                              </a>
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm">{message.content}</div>
                      )}
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
                {message.role === 'user' && (
                  <div
                    className={`h-9 w-9 rounded-full overflow-hidden shadow-sm ${
                      isDarkMode
                        ? 'bg-[#1B2438] ring-1 ring-white/20'
                        : 'bg-slate-200 ring-1 ring-white/70'
                    }`}
                  >
                    <Image
                      src={isDarkMode ? userAvatarDark : userAvatar}
                      alt="User avatar"
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-full overflow-hidden shadow-sm ${
                    isDarkMode
                      ? 'bg-[#1F2A44] ring-1 ring-white/20'
                      : 'bg-[var(--pp-gradient)] ring-1 ring-white/70'
                  }`}
                >
                  <Image
                    src={isDarkMode ? agentAvatarDark : agentAvatar}
                    alt="Agent avatar"
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.2s]"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.1s]"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-4 space-y-3 bg-white/80">
            {assetType === 'ERC20' && !vaultMode && (
              <div className="rounded-2xl border border-[color:var(--pp-border)] bg-white/90 p-4 shadow-[var(--pp-shadow)] space-y-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-600 font-semibold">
                  Token details (optional)
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Token Address</label>
                  <input
                    type="text"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono text-xs"
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Token Name / Symbol</label>
                    <input
                      type="text"
                      value={tokenSymbol}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Decimals</label>
                    <input
                      type="number"
                      value={tokenDecimals}
                      onChange={(e) => setTokenDecimals(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}
            <label className="block text-sm text-slate-500">
              Message
            </label>
            <div className="flex flex-wrap gap-2">
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
                placeholder="Send 0.001 USDT to 0x... or 10 USDT to 0x..."
                className="flex-1 min-w-[220px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="btn-secondary"
                aria-label="Send"
              >
                {loading ? '...' : '➤'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <button type="button" onClick={() => setInput('Send 0.001 USDT to 0x1234...')} className="pill bg-slate-100 text-slate-600">
                Send 0.001 USDT to 0x1234…
              </button>
              <button type="button" onClick={() => setInput('Transfer 0.01 USDT to my friend')} className="pill bg-slate-100 text-slate-600">
                Transfer 0.01 USDT to my friend
              </button>
              <button type="button" onClick={() => setInput('Pay 0.005 USDT for subscription')} className="pill bg-slate-100 text-slate-600">
                Pay 0.005 USDT for subscription
              </button>
              <button type="button" onClick={() => setInput('Send 15 USDT to 0xabcd...')} className="pill bg-slate-100 text-slate-600">
                Send 15 USDT to 0xabcd…
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(AICommand);
