// ============================================================
// CLOUD SYNC — Push/pull MemoryPacks to Supabase
//
// This is the bridge between local and cloud:
//   - push(): Local → Cloud (upload MemoryPack, upsert memories)
//   - pull(): Cloud → Local (download MemoryPack for a wallet)
//   - sync(): Bidirectional (push local changes, pull remote changes)
//
// All synced memories retain their UUIDs for merge deduplication.
// Sync is conflict-free: same UUID = same memory, skip.
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────

export type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'self_model';

export interface SyncableMemory {
  uuid: string;
  content: string;
  summary: string;
  type: MemoryType;
  importance: number;
  tags: string[];
  concepts: string[];
  source: string;
  created_at: string;
  access_count: number;
  decay_factor: number;
  owner_wallet: string;
  metadata?: Record<string, unknown>;
}

export interface SyncConfig {
  supabaseUrl: string;
  supabaseKey: string;
  wallet: string;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  skipped: number;
  errors: string[];
}

export interface PushResult {
  uploaded: number;
  skipped: number;
  errors: string[];
}

export interface PullResult {
  downloaded: number;
  total_remote: number;
}

// ── Cloud Sync ───────────────────────────────────────────────

export class CloudSync {
  private db: SupabaseClient;
  private wallet: string;

  constructor(config: SyncConfig) {
    this.db = createClient(config.supabaseUrl, config.supabaseKey);
    this.wallet = config.wallet;
  }

  /**
   * Push local memories to cloud.
   * Skips memories that already exist (by UUID).
   */
  async push(memories: SyncableMemory[], embedFn?: (text: string) => Promise<number[]>): Promise<PushResult> {
    let uploaded = 0, skipped = 0;
    const errors: string[] = [];

    // Get existing UUIDs in cloud
    const { data: existing } = await this.db
      .from('memories')
      .select('hash_id')
      .eq('owner_wallet', this.wallet);

    const existingSet = new Set((existing || []).map((r: any) => r.hash_id));

    for (const mem of memories) {
      if (existingSet.has(mem.uuid)) {
        skipped++;
        continue;
      }

      try {
        // Generate embedding if function provided
        let embedding: number[] | null = null;
        if (embedFn) {
          try { embedding = await embedFn(mem.summary); } catch {}
        }

        const { error } = await this.db.from('memories').insert({
          hash_id: mem.uuid,
          memory_type: mem.type,
          content: mem.content,
          summary: mem.summary,
          tags: mem.tags,
          concepts: mem.concepts || [],
          importance: mem.importance,
          source: mem.source,
          owner_wallet: this.wallet,
          created_at: mem.created_at,
          access_count: mem.access_count,
          decay_factor: mem.decay_factor,
          metadata: mem.metadata || {},
          embedding: embedding ? JSON.stringify(embedding) : null,
        });

        if (error) {
          if (error.code === '23505') { skipped++; } // duplicate
          else { errors.push(`${mem.uuid.slice(0, 8)}: ${error.message}`); }
        } else {
          uploaded++;
        }
      } catch (err) {
        errors.push(`${mem.uuid.slice(0, 8)}: ${(err as Error).message}`);
      }
    }

    return { uploaded, skipped, errors };
  }

  /**
   * Pull memories from cloud for this wallet.
   * Returns all memories as SyncableMemory format.
   */
  async pull(opts?: {
    since?: string;          // ISO timestamp, only pull memories created after this
    types?: MemoryType[];
    limit?: number;
    minImportance?: number;
  }): Promise<{ memories: SyncableMemory[]; total: number }> {
    let query = this.db
      .from('memories')
      .select('*', { count: 'exact' })
      .eq('owner_wallet', this.wallet)
      .order('created_at', { ascending: true });

    if (opts?.since) query = query.gte('created_at', opts.since);
    if (opts?.types?.length) query = query.in('memory_type', opts.types);
    if (opts?.minImportance) query = query.gte('importance', opts.minImportance);
    if (opts?.limit) query = query.limit(opts.limit);

    const { data, count } = await query;

    const memories: SyncableMemory[] = (data || []).map((r: any) => ({
      uuid: r.hash_id || `legacy-${r.id}`,
      content: r.content,
      summary: r.summary,
      type: r.memory_type,
      importance: r.importance,
      tags: r.tags || [],
      concepts: r.concepts || [],
      source: r.source || 'unknown',
      created_at: r.created_at,
      access_count: r.access_count,
      decay_factor: r.decay_factor,
      owner_wallet: r.owner_wallet,
      metadata: r.metadata,
    }));

    return { memories, total: count || memories.length };
  }

  /**
   * Bidirectional sync: push local, pull remote, deduplicate.
   */
  async sync(
    localMemories: SyncableMemory[],
    embedFn?: (text: string) => Promise<number[]>,
  ): Promise<SyncResult> {
    // Push local → cloud
    const pushResult = await this.push(localMemories, embedFn);

    // Pull cloud → local (get UUIDs we don't have locally)
    const localUUIDs = new Set(localMemories.map(m => m.uuid));
    const { memories: remoteMemories } = await this.pull();
    const newFromCloud = remoteMemories.filter(m => !localUUIDs.has(m.uuid));

    return {
      pushed: pushResult.uploaded,
      pulled: newFromCloud.length,
      skipped: pushResult.skipped,
      errors: pushResult.errors,
    };
  }

  /**
   * Get sync status: how many memories exist locally vs cloud.
   */
  async status(localCount: number): Promise<{
    local: number;
    cloud: number;
    synced: boolean;
  }> {
    const { count } = await this.db
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('owner_wallet', this.wallet);

    const cloudCount = count || 0;
    return {
      local: localCount,
      cloud: cloudCount,
      synced: localCount === cloudCount,
    };
  }

  /**
   * Delete a memory from cloud by UUID.
   */
  async deleteRemote(uuid: string): Promise<boolean> {
    const { error } = await this.db
      .from('memories')
      .delete()
      .eq('hash_id', uuid)
      .eq('owner_wallet', this.wallet);

    return !error;
  }

  /**
   * Get the Supabase client for direct access (advanced use).
   */
  getClient(): SupabaseClient {
    return this.db;
  }
}
