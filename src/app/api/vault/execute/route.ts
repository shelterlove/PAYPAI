import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { KITE_CONTRACTS } from '@/types';

const VAULT_ABI = [
  'function executeSpend(uint256 amount, address recipient) external',
  'function checkSpendAllowed(uint256 amount, address provider) external view returns (bool)',
  'function settlementToken() external view returns (address)'
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaultAddress, recipient, amount } = body;

    if (!vaultAddress || !recipient || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(vaultAddress) || !ethers.isAddress(recipient)) {
      return NextResponse.json(
        { success: false, error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY;
    if (!executorPrivateKey) {
      return NextResponse.json(
        { success: false, error: 'Executor not configured on server' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL);
    const signer = new ethers.Wallet(executorPrivateKey, provider);
    const contract = new ethers.Contract(vaultAddress, VAULT_ABI, signer);

    const settlementToken = await contract.settlementToken();
    const tokenContract = new ethers.Contract(
      settlementToken,
      ['function decimals() view returns (uint8)'],
      provider
    );
    let decimals = KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS;
    try {
      decimals = Number(await tokenContract.decimals());
    } catch {
      decimals = KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS;
    }

    const amountWei = ethers.parseUnits(String(amount), decimals);

    const allowed = await contract.checkSpendAllowed(amountWei, recipient);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Spend rejected by vault rules' },
        { status: 403 }
      );
    }

    const tx = await contract.executeSpend(amountWei, recipient);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
