import { NextRequest, NextResponse } from 'next/server';
import { getWalletService } from '@/lib/wallet-service';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      signerAddress,
      tokenAddress,
      spender,
      amount,
      privateKey,
      tokenDecimals,
      useMax,
      usePaymaster
    } = body;

    if (!signerAddress || !tokenAddress || !spender || !privateKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(signerAddress) || !ethers.isAddress(tokenAddress) || !ethers.isAddress(spender)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    if (!useMax) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: 'Invalid amount' },
          { status: 400 }
        );
      }
    }

    const decimals = Number.isFinite(Number(tokenDecimals)) ? Number(tokenDecimals) : 18;

    const walletService = getWalletService();
    const result = await walletService.approveERC20(
      signerAddress,
      tokenAddress,
      spender,
      amount || '0',
      privateKey,
      decimals,
      Boolean(useMax),
      Boolean(usePaymaster)
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error approving ERC20:', error);
    return NextResponse.json(
      {
        error: 'Failed to approve ERC20',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
