import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaultAddress, privateKey, tokenAddress, amount, recipient } = body;

    if (!vaultAddress || !privateKey || !tokenAddress || !amount || !recipient) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL);
    const signer = new ethers.Wallet(privateKey, provider);
    const vaultInterface = new ethers.Interface([
      'function withdraw(address token, uint256 amount, address recipient) external'
    ]);

    const callData = vaultInterface.encodeFunctionData('withdraw', [
      tokenAddress,
      BigInt(amount),
      recipient
    ]);

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
