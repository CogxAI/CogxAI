import type { MemoryType, Memory, MemorySummary, StoreMemoryOptions, RecallOptions, MemoryStats } from '../core/memory';
import type { MemoryLinkType, MemoryConcept } from '../utils/constants';

export interface CortexConfig {
  /** Supabase connection. Required for self-hosted mode. Mutually exclusive with `hosted`. */
  supabase?: {
    url: string;
    serviceKey: string;
  };

  /** Hosted mode — memories stored on COGXAI infrastructure. Mutually exclusive with `supabase`. */
  hosted?: {
    /** API key from `npx cogxai register` or POST /api/cortex/register. */
    apiKey: string;
    /** API base URL. Defaults to 'https://cogxai.org'. */
    baseUrl?: string;
  };

  /** Anthropic API config. Required for dream cycles and LLM importance scoring. Self-hosted only. */
  anthropic?: {
    apiKey: string;
    model?: string;
  };

  /** Embedding provider config. Optional — falls back to keyword-only retrieval. Self-hosted only. */
  embedding?: {
    provider: 'voyage' | 'openai';
    apiKey: string;
    model?: string;
    dimensions?: number;
  };

  /** Owner wallet address (Base public key). Tags all memories with ownership. */
  ownerWallet?: string;

  /** Base on-chain commit config. Optional — memories won't be committed on-chain. Self-hosted only. */
  base?: {
    rpcUrl?: string;
    botWalletPrivateKey?: string;
    /** Contract address for the on-chain memory registry. Optional — falls back to memo writes. */
    memoryRegistryContract?: string;
  };

  /** Client-side encryption config. Optional — memories stored plaintext if not provided. Self-hosted only. */
  encryption?: {
    /** EVM private key (hex string with/without 0x, or 32-byte Uint8Array). Used to derive encryption key via HKDF. */
    privateKey: string | Uint8Array;
  };
}

export interface DreamOptions {
  /** Custom handler for emergence output (replaces posting to X). */
  onEmergence?: (text: string) => Promise<void>;
}

// Re-export all public types
export type {
  MemoryType,
  Memory,
  MemorySummary,
  StoreMemoryOptions,
  RecallOptions,
  MemoryStats,
  MemoryLinkType,
  MemoryConcept,
};
