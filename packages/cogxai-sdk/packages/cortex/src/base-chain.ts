/**
 * Base on-chain utilities — stub for future EVM contract integration.
 * The main on-chain functionality is in src/core/base-client.ts (ethers.js).
 * This file is a placeholder for the SDK sub-package.
 */

export async function writeOnChainMemo(_memo: string): Promise<string | null> {
  // Use src/core/base-client.ts writeMemo() instead
  return null;
}

export function isOnChainEnabled(): boolean {
  return false;
}
