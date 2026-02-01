import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signerAddress, aaWalletAddress, amount, privateKey } = body;

    if (!signerAddress || !aaWalletAddress || !amount || !privateKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create a signer from the private key
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL);
    const signer = new ethers.Wallet(privateKey, provider);

    // Send transaction from signer to AA wallet
    const tx = await signer.sendTransaction({
      to: aaWalletAddress,
      value: ethers.parseEther(amount)
    });

    // Wait for transaction
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      amount,
      from: signerAddress,
      to: aaWalletAddress
    });

  } catch (error) {
    console.error('Error funding wallet:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fund wallet'
      },
      { status: 500 }
    );
  }
}
