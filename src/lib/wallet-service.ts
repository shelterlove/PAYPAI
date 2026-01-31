import { ethers } from 'ethers';
import { getKiteManager } from './kite';
import { createSignFunction } from './wallet';
import { TransactionRequest, TransactionResult, AAWallet } from '@/types';

/**
 * AA Wallet Service
 * Handles Account Abstraction wallet operations
 */

export class AAWalletService {
  private kiteManager = getKiteManager();
  private sdk = this.kiteManager.getSDK();

  /**
   * Get AA wallet address for a signer
   */
  getAAWalletAddress(signerAddress: string): string {
    return this.sdk.getAccountAddress(signerAddress);
  }

  /**
   * Check if AA wallet is deployed
   */
  async isWalletDeployed(aaWalletAddress: string): Promise<boolean> {
    const config = this.kiteManager.getConfig();
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    try {
      const code = await provider.getCode(aaWalletAddress);
      return code !== '0x' && code !== '0x0';
    } catch (error) {
      console.error('Error checking wallet deployment:', error);
      return false;
    }
  }

  /**
   * Deploy AA wallet (first transaction deploys it automatically)
   */
  async deployWallet(
    signerAddress: string,
    privateKey: string
  ): Promise<TransactionResult> {
    try {
      const signFunction = createSignFunction(privateKey);

      // Send a minimal transaction to deploy the wallet
      // This will trigger the wallet deployment
      const deployRequest: TransactionRequest = {
        target: signerAddress, // Send to self
        value: 0n,
        callData: '0x'
      };

      console.log('Deploying wallet for signer:', signerAddress);
      console.log('Deploy request:', deployRequest);

      const result = await this.sdk.sendUserOperationAndWait(
        signerAddress,
        deployRequest,
        signFunction
      );

      console.log('Deploy result:', result);
      return result;
    } catch (error) {
      console.error('Deploy wallet error:', error);
      return {
        status: {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Send ETH from AA wallet
   */
  async sendETH(
    signerAddress: string,
    recipient: string,
    amount: string,
    privateKey: string
  ): Promise<TransactionResult> {
    try {
      const signFunction = createSignFunction(privateKey);

      const request: TransactionRequest = {
        target: recipient,
        value: ethers.parseEther(amount),
        callData: '0x'
      };

      const result = await this.sdk.sendUserOperationAndWait(
        signerAddress,
        request,
        signFunction
      );

      return result;
    } catch (error) {
      return {
        status: {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Send ERC20 from AA wallet
   */
  async sendERC20(
    signerAddress: string,
    tokenAddress: string,
    recipient: string,
    amount: string,
    privateKey: string,
    tokenDecimals = 18
  ): Promise<TransactionResult> {
    try {
      const signFunction = createSignFunction(privateKey);
      const erc20 = new ethers.Interface(['function transfer(address to, uint256 amount)']);
      const callData = erc20.encodeFunctionData('transfer', [
        recipient,
        ethers.parseUnits(amount, tokenDecimals)
      ]);

      const request: TransactionRequest = {
        target: tokenAddress,
        value: 0n,
        callData
      };

      const result = await this.sdk.sendUserOperationAndWait(
        signerAddress,
        request,
        signFunction
      );

      return result;
    } catch (error) {
      return {
        status: {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Approve ERC20 spending from AA wallet
   */
  async approveERC20(
    signerAddress: string,
    tokenAddress: string,
    spender: string,
    amount: string,
    privateKey: string,
    tokenDecimals = 18,
    useMax = false,
    usePaymaster = false
  ): Promise<TransactionResult> {
    try {
      const signFunction = createSignFunction(privateKey);
      const erc20 = new ethers.Interface(['function approve(address spender, uint256 amount)']);
      const approveAmount = useMax ? ethers.MaxUint256 : ethers.parseUnits(amount, tokenDecimals);
      const callData = erc20.encodeFunctionData('approve', [spender, approveAmount]);

      const request: TransactionRequest = {
        target: tokenAddress,
        value: 0n,
        callData
      };

      if (usePaymaster) {
        const estimate = await this.sdk.estimateUserOperation(signerAddress, request);
        const tokenForPayment = estimate.sponsorshipAvailable
          ? '0x0000000000000000000000000000000000000000'
          : KITE_CONTRACTS.SETTLEMENT_TOKEN;
        const result = await this.sdk.sendUserOperationWithPayment(
          signerAddress,
          request,
          estimate.userOp,
          tokenForPayment,
          signFunction
        );
        return result;
      }

      const result = await this.sdk.sendUserOperationAndWait(
        signerAddress,
        request,
        signFunction
      );

      return result;
    } catch (error) {
      return {
        status: {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Register a supported token in the AA wallet
   */
  async addSupportedToken(
    signerAddress: string,
    tokenAddress: string,
    privateKey: string
  ): Promise<TransactionResult> {
    try {
      const signFunction = createSignFunction(privateKey);
      const aaWalletAddress = this.getAAWalletAddress(signerAddress);
      const accountInterface = new ethers.Interface(['function addSupportedToken(address token)']);
      const callData = accountInterface.encodeFunctionData('addSupportedToken', [tokenAddress]);

      const sdkAny = this.sdk as any;
      const request = { target: aaWalletAddress, value: 0n, callData };
      const userOp = await sdkAny.createUserOperation(
        signerAddress,
        request,
        undefined,
        '0x0000000000000000000000000000000000000000'
      );

      const packAccountGasLimits = (verificationGasLimit: bigint, callGasLimit: bigint) => {
        const uint128Max = (BigInt(1) << BigInt(128)) - BigInt(1);
        if (verificationGasLimit > uint128Max || callGasLimit > uint128Max) {
          throw new Error('Gas limit exceeds uint128 maximum');
        }
        const verificationHex = verificationGasLimit.toString(16).padStart(32, '0');
        const callHex = callGasLimit.toString(16).padStart(32, '0');
        return `0x${verificationHex}${callHex}`;
      };

      // Raise verification gas for addSupportedToken (AA26 mitigation)
      userOp.accountGasLimits = packAccountGasLimits(1_500_000n, 500_000n);
      userOp.preVerificationGas = 1_200_000n;

      const userOpHash = await this.sdk.getUserOpHash(userOp);
      const signature = await signFunction(userOpHash);
      userOp.signature = signature;

      const opHash = await sdkAny.provider.sendUserOperation(userOp, sdkAny.config.entryPoint);
      const status = await this.sdk.pollUserOperationStatus(opHash);
      return { userOpHash: opHash, status };
    } catch (error) {
      return {
        status: {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(signerAddress: string): Promise<AAWallet> {
    const aaWalletAddress = this.getAAWalletAddress(signerAddress);
    const isDeployed = await this.isWalletDeployed(aaWalletAddress);

    return {
      address: aaWalletAddress,
      signerAddress,
      isDeployed
    };
  }

  /**
   * Get ETH balance of AA wallet
   */
  async getBalance(aaWalletAddress: string): Promise<bigint> {
    const config = this.kiteManager.getConfig();
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    return provider.getBalance(aaWalletAddress);
  }

  /**
   * Get native token balance from EOA
   */
  async getSignerBalance(signerAddress: string): Promise<bigint> {
    const config = this.kiteManager.getConfig();
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    return provider.getBalance(signerAddress);
  }
}

// Singleton instance
let walletService: AAWalletService | null = null;

export function getWalletService(): AAWalletService {
  if (!walletService) {
    walletService = new AAWalletService();
  }
  return walletService;
}
