import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaultAddress, privateKey, rules } = body;

    if (!vaultAddress || !privateKey || !rules) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL);
    const signer = new ethers.Wallet(privateKey, provider);
    const vaultInterface = new ethers.Interface([
      'function configureSpendingRules((address token, uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] whitelist, address[] blacklist)[] calldata rules) external'
    ]);

    const callData = vaultInterface.encodeFunctionData('configureSpendingRules', [rules]);
    const tx = await signer.sendTransaction({
      to: vaultAddress,
      data: callData
    });
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt?.hash
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
