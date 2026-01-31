import { ethers } from 'ethers';

export function createRpcProvider(rpcUrl: string, timeoutMs = 20000) {
  const request = new ethers.FetchRequest(rpcUrl);
  request.timeout = timeoutMs;
  return new ethers.JsonRpcProvider(request);
}
