// ============================================================
// @cogxai/cloud — Supabase storage + Voyage AI + cloud sync
//
// Usage:
//   import { SupabaseProvider, CloudSync } from '@cogxai/cloud'
//   import { CogxAIEngine } from '@cogxai/brain'
//   import { VoyageEmbeddings } from '@cogxai/brain/providers/voyage'
//
//   // Cloud-backed engine
//   const engine = new CogxAIEngine({
//     storage: new SupabaseProvider({ url, serviceKey, ownerWallet }),
//     embeddings: new VoyageEmbeddings({ apiKey }),
//   })
//
//   // Sync local ↔ cloud
//   const sync = new CloudSync({ supabaseUrl, supabaseKey, wallet })
//   await sync.push(localMemories)
//   const { memories } = await sync.pull()
// ============================================================

export { SupabaseProvider, type SupabaseProviderConfig } from './supabase-provider.js';
export { CloudSync, type SyncConfig, type SyncResult, type PushResult, type PullResult, type SyncableMemory } from './sync.js';
