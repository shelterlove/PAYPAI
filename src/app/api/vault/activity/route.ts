import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { createRpcProvider } from '@/lib/rpc';

const VAULT_ABI = [
  'function getSpendingRules() external view returns (tuple(address token, uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] whitelist, address[] blacklist)[])',
  'function settlementToken() external view returns (address)'
];

const SPEND_EVENT_SIG = 'SpendExecuted(address,address,uint256)';

async function findBlockByTimestamp(provider: ethers.JsonRpcProvider, targetTimestamp: number) {
  const latestBlock = await provider.getBlockNumber();
  let low = 0;
  let high = latestBlock;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const block = await provider.getBlock(mid);
    if (!block) {
      break;
    }
    if (block.timestamp < targetTimestamp) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid vault address' }, { status: 400 });
    }

    const timeoutMs = Number(process.env.KITE_RPC_TIMEOUT_MS || '20000');
    const provider = createRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL || '', timeoutMs);
    const code = await provider.getCode(address);
    if (code === '0x' || code === '0x0') {
      return NextResponse.json({ activity: [], error: 'Vault not deployed' }, { status: 200 });
    }

    const contract = new ethers.Contract(address, VAULT_ABI, provider);
    const [rules, settlementToken] = await Promise.all([
      contract.getSpendingRules(),
      contract.settlementToken()
    ]);

    const primaryRule = rules?.[0];
    const tokenAddress = primaryRule?.token && primaryRule?.token !== ethers.ZeroAddress
      ? primaryRule.token
      : settlementToken;

    let tokenSymbol = 'KITE';
    let tokenDecimals = 18;

    if (tokenAddress && tokenAddress !== ethers.ZeroAddress) {
      try {
        const token = new ethers.Contract(
          tokenAddress,
          ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
          provider
        );
        tokenSymbol = await token.symbol();
        tokenDecimals = Number(await token.decimals());
      } catch {
        tokenSymbol = 'KITE';
        tokenDecimals = 18;
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const timeWindow = primaryRule?.timeWindow ? Number(primaryRule.timeWindow) : 0;
    const initialWindowStart = primaryRule?.initialWindowStartTime
      ? Number(primaryRule.initialWindowStartTime)
      : 0;

    let windowStart = initialWindowStart;
    if (timeWindow > 0 && now >= windowStart) {
      const elapsed = now - windowStart;
      const windows = Math.floor(elapsed / timeWindow);
      windowStart = windowStart + windows * timeWindow;
    }

    const fromBlock = windowStart > 0 ? await findBlockByTimestamp(provider, windowStart) : 0;
    const topic = ethers.id(SPEND_EVENT_SIG);
    const logs = await provider.getLogs({
      address,
      fromBlock,
      toBlock: 'latest',
      topics: [topic]
    });

    const iface = new ethers.Interface([
      'event SpendExecuted(address indexed executor, address indexed recipient, uint256 amount)'
    ]);

    const uniqueBlocks = Array.from(new Set(logs.map((log) => log.blockNumber)));
    const blockMap = new Map<number, number>();
    await Promise.all(
      uniqueBlocks.map(async (blockNumber) => {
        const block = await provider.getBlock(blockNumber);
        if (block) {
          blockMap.set(blockNumber, block.timestamp);
        }
      })
    );

    let spentInWindow = 0n;
    const activity = logs
      .map((log) => {
        const parsed = iface.parseLog(log);
        const amount: bigint = parsed.args.amount;
        const recipient: string = parsed.args.recipient;
        const executor: string = parsed.args.executor;
        const timestamp = blockMap.get(log.blockNumber) || 0;
        if (timestamp >= windowStart) {
          spentInWindow += amount;
        }
        return {
          txHash: log.transactionHash,
          recipient,
          executor,
          amount: ethers.formatUnits(amount, tokenDecimals),
          timestamp
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    const budget = primaryRule?.budget ? BigInt(primaryRule.budget) : 0n;
    const remainingBudget = budget > spentInWindow ? budget - spentInWindow : 0n;

    return NextResponse.json({
      tokenAddress,
      tokenSymbol,
      tokenDecimals,
      windowStart,
      spentInWindow: ethers.formatUnits(spentInWindow, tokenDecimals),
      remainingBudget: ethers.formatUnits(remainingBudget, tokenDecimals),
      activity
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch vault activity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
