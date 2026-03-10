/**
 * Base (Ethereum L2) client — MEMO WRITES + MEMORY REGISTRY STUBS.
 *
 * SECURITY: This module can only:
 *   1. Write memo data to Base via self-call transactions (hex calldata)
 *   2. Verify EIP-191 signatures
 * It has NO fund transfer, token transfer, or swap capability.
 * The bot wallet is used exclusively for signing memo transactions.
 *
 * Memo approach: Base has no native memo program. Instead we send a
 * self-call transaction (wallet → wallet, value 0) with the memo
 * UTF-8 hex-encoded as calldata. The memo is readable on Basescan
 * under "Input Data" → "UTF-8".
 */

import { ethers } from 'ethers';
import { config } from '../config';
import { createChildLogger } from './logger';
import {
  MEMO_MAX_LENGTH,
  BASESCAN_TX_BASE_URL,
  BASE_CHAIN_ID,
} from '../utils/constants';

const log = createChildLogger('base-client');

const BASE_MAINNET_RPC = 'https://mainnet.base.org';
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

let provider: ethers.JsonRpcProvider;
let botWallet: ethers.Wallet | null = null;

// ---------- Provider / Wallet ----------

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    const rpcUrl = config.base?.rpcUrl || BASE_MAINNET_RPC;
    provider = new ethers.JsonRpcProvider(rpcUrl, BASE_CHAIN_ID);
  }
  return provider;
}

export const getConnection = getProvider;

/** @internal SDK escape hatch — allows Cortex to inject Base config. */
export function _configureBase(rpcUrl: string, privateKey?: string): void {
  provider = new ethers.JsonRpcProvider(rpcUrl);
  if (privateKey) {
    try {
      const raw = privateKey.trim();
      const key = raw.startsWith('0x') ? raw : `0x${raw}`;
      botWallet = new ethers.Wallet(key, provider);
      log.info({ address: botWallet.address }, 'SDK: Bot wallet configured');
    } catch (err) {
      log.error({ err }, 'SDK: Failed to load bot wallet');
    }
  }
}


export function getBotWallet(): ethers.Wallet | null {
  if (!botWallet && config.base?.botWalletPrivateKey) {
    try {
      const raw = config.base.botWalletPrivateKey.trim();
      const key = raw.startsWith('0x') ? raw : `0x${raw}`;
      botWallet = new ethers.Wallet(key, getProvider());
      log.info({ address: botWallet.address }, 'Bot wallet loaded');
    } catch (err) {
      log.error({ err }, 'Failed to load bot wallet');
    }
  }
  return botWallet;
}

// ---------- Memo Writes ----------

/**
 * Write a memo on Base mainnet.
 * Sends a self-call transaction (to === from, value 0) with the memo
 * encoded as hex calldata. Readable on Basescan → Input Data → UTF-8.
 */
export async function writeMemo(memo: string): Promise<string | null> {
  const wallet = getBotWallet();
  if (!wallet) {
    log.error('No bot wallet configured, cannot write memo');
    return null;
  }

  const truncatedMemo = memo.slice(0, MEMO_MAX_LENGTH);
  const calldata = ethers.hexlify(ethers.toUtf8Bytes(truncatedMemo));

  try {
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
      data: calldata,
    });

    const receipt = await tx.wait();
    const hash = receipt?.hash ?? tx.hash;
    log.info({ hash, memoLength: truncatedMemo.length }, 'Memo written on-chain (Base)');
    return hash;
  } catch (err) {
    log.error({ err }, 'Failed to write memo on Base');
    return null;
  }
}

/**
 * Write a memo on Base Sepolia testnet.
 */
export async function writeMemoDevnet(memo: string): Promise<string | null> {
  const wallet = getBotWallet();
  if (!wallet) {
    log.error('No bot wallet configured, cannot write testnet memo');
    return null;
  }

  const truncatedMemo = memo.slice(0, MEMO_MAX_LENGTH);
  const calldata = ethers.hexlify(ethers.toUtf8Bytes(truncatedMemo));

  const sepoliaProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
  const sepoliaWallet = new ethers.Wallet(wallet.privateKey, sepoliaProvider);

  try {
    const tx = await sepoliaWallet.sendTransaction({
      to: sepoliaWallet.address,
      value: 0n,
      data: calldata,
    });

    const receipt = await tx.wait();
    const hash = receipt?.hash ?? tx.hash;
    log.info({ hash, memoLength: truncatedMemo.length }, 'Memo written on Base Sepolia');
    return hash;
  } catch (err) {
    log.error({ err }, 'Failed to write memo on Base Sepolia');
    return null;
  }
}

// ---------- Explorer URLs ----------

export function basescanTxUrl(hash: string): string {
  return `${BASESCAN_TX_BASE_URL}/${hash}`;
}

// ---------- Signature Verification ----------

/**
 * Verify an EIP-191 personal_sign signature.
 */
export function verifySignature(
  message: string,
  signature: string,
  address: string,
): boolean {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

// ---------- On-chain Memory Registry Stubs ----------
// Future EVM contract will replace these.

export function isRegistryEnabled(): boolean {
  return false;
}

export async function initializeRegistry(): Promise<null> {
  return null;
}

export async function registerMemoryOnChain(
  _contentHash: Buffer,
  _memoryType: string,
  _importance: number,
  _memoryId: number,
  _encrypted: boolean,
): Promise<string | null> {
  return null;
}

export async function verifyMemoryOnChain(
  _contentHash: Buffer,
  _authority?: string,
): Promise<boolean> {
  return false;
}
