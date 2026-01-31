import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getWalletService } from '@/lib/wallet-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signerAddress, tokenAddress, privateKey } = body;

    if (!signerAddress || !tokenAddress || !privateKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(signerAddress) || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const walletService = getWalletService();
    const result = await walletService.addSupportedToken(
      signerAddress,
      tokenAddress,
      privateKey
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error registering supported token:', error);
    return NextResponse.json(
      {
        error: 'Failed to register token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
