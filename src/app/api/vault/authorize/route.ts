import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const VAULT_ABI = [
  'function setExecutor(address executor, bool allowed) external'
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaultAddress, privateKey, executor } = body;

    if (!vaultAddress || !privateKey || !executor) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(vaultAddress) || !ethers.isAddress(executor)) {
      return NextResponse.json(
        { success: false, error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL);
    const signer = new ethers.Wallet(privateKey, provider);
    const vaultInterface = new ethers.Interface(VAULT_ABI);
    const callData = vaultInterface.encodeFunctionData('setExecutor', [
      executor,
      true
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
