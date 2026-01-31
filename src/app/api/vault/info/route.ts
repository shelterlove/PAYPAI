import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { KITE_CONTRACTS } from '@/types';
import { createRpcProvider } from '@/lib/rpc';

const VAULT_ABI = [
  'function getSpendingRules() external view returns (tuple(address token, uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] whitelist, address[] blacklist)[])',
  'function settlementToken() external view returns (address)',
  'function spendingAccount() external view returns (address)',
  'function owner() external view returns (address)',
  'function isExecutor(address executor) external view returns (bool)',
  'function currentBudget() external view returns (uint256)'
];

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid vault address' },
        { status: 400 }
      );
    }

    const timeoutMs = Number(process.env.KITE_RPC_TIMEOUT_MS || '20000');
    const provider = createRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL || '', timeoutMs);
    const code = await provider.getCode(address);
    if (code === '0x' || code === '0x0') {
      return NextResponse.json({
        deployed: false,
        vault: null,
        spendingRules: [],
        tokenBalance: '0',
        tokenMeta: {
          symbol: 'KITE',
          decimals: KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS
        },
        spendingAccount: '',
        allowance: '0',
        executor: {
          address: process.env.NEXT_PUBLIC_EXECUTOR_ADDRESS || '',
          authorized: false
        },
        error: 'Vault not deployed at this address'
      });
    }
    const contract = new ethers.Contract(address, VAULT_ABI, provider);

    const [settlementToken, spendingAccount, admin, balance, spendingRules] = await Promise.all([
      contract.settlementToken(),
      contract.spendingAccount(),
      contract.owner(),
      provider.getBalance(address),
      contract.getSpendingRules()
    ]);
    let currentBudgetRaw = 0n;
    try {
      currentBudgetRaw = await contract.currentBudget();
    } catch {
      currentBudgetRaw = 0n;
    }

    let tokenBalance = 0n;
    let tokenSymbol = 'KITE';
    let tokenDecimals = KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS;
    if (settlementToken && settlementToken !== ethers.ZeroAddress) {
      const tokenContract = new ethers.Contract(
        settlementToken,
        [
          'function balanceOf(address) view returns (uint256)',
          'function allowance(address owner, address spender) view returns (uint256)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)'
        ],
        provider
      );

      try {
        tokenBalance = spendingAccount
          ? await tokenContract.balanceOf(spendingAccount)
          : 0n;
      } catch {
        tokenBalance = 0n;
      }

      try {
        tokenSymbol = await tokenContract.symbol();
      } catch {
        tokenSymbol = 'KITE';
      }

      try {
        tokenDecimals = Number(await tokenContract.decimals());
      } catch {
        tokenDecimals = KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS;
      }
    }

    const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY;
    const executorAddress = executorPrivateKey
      ? new ethers.Wallet(executorPrivateKey).address
      : process.env.NEXT_PUBLIC_EXECUTOR_ADDRESS || '';

    let executorAuthorized = false;
    if (executorAddress) {
      try {
        executorAuthorized = await contract.isExecutor(executorAddress);
      } catch {
        executorAuthorized = false;
      }
    }

    const safeRules = (spendingRules || []).map((rule: any) => ({
      token: rule.token || settlementToken,
      timeWindow: rule.timeWindow?.toString?.() ?? String(rule.timeWindow),
      budget: rule.budget?.toString?.() ?? String(rule.budget),
      initialWindowStartTime: rule.initialWindowStartTime?.toString?.() ?? String(rule.initialWindowStartTime),
      whitelist: rule.whitelist || [],
      blacklist: rule.blacklist || []
    }));

    let allowance = 0n;
    if (settlementToken && spendingAccount) {
      try {
        const tokenContract = new ethers.Contract(
          settlementToken,
          ['function allowance(address owner, address spender) view returns (uint256)'],
          provider
        );
        allowance = await tokenContract.allowance(spendingAccount, address);
      } catch {
        allowance = 0n;
      }
    }

    return NextResponse.json({
      deployed: true,
      vault: {
        settlementToken,
        spendingAccount,
        admin,
        balance: ethers.formatEther(balance)
      },
      spendingRules: safeRules,
      tokenBalance: ethers.formatUnits(tokenBalance, tokenDecimals),
      currentBudget: ethers.formatUnits(currentBudgetRaw, tokenDecimals),
      allowance: ethers.formatUnits(allowance, tokenDecimals),
      allowanceRaw: allowance.toString(),
      tokenMeta: {
        symbol: tokenSymbol,
        decimals: tokenDecimals
      },
      executor: {
        address: executorAddress,
        authorized: executorAuthorized
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch vault info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
