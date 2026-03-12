// ============================================================
// SUPABASE STORAGE PROVIDER
//
// Implements @cogxai/brain's StorageProvider interface backed by
// Supabase (PostgreSQL + pgvector). This is the cloud backend
// extracted from the CogxAI bot.
//
// Features:
//   - Vector search via match_memories RPC
//   - Fragment-level vector search via match_memory_fragments RPC
//   - Entity graph (entities, entity_mentions, entity_relations)
//   - Memory links with bond-typed traversal
//   - Batch decay, access tracking, importance boosting
//   - Owner wallet scoping for multi-tenant
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Types (matching @cogxai/brain interfaces) ─────────────────

export type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'self_model';

export interface BrainMemory {
  id: string;
  uuid?: string;
  memory_type: MemoryType;
  content: string;
  summary: string;
  tags: string[];
  concepts: string[];
  emotional_valence: number;
  importance: number;
  access_count: number;
  source: string;
  source_id?: string;
  related_user?: string;
  related_entity?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  last_accessed: string;
  decay_factor: number;
  owner_wallet?: string;
  compacted?: boolean;
  compacted_into?: string;
  base_signature?: string;
  _score?: number;
  _vector_sim?: number;
}

export interface Scope {
  user_id?: string;
  agent_id?: string;
  session_id?: string;
  run_id?: string;
  owner_wallet?: string;
}

export interface MemoryLink {
  source_id: string;
  target_id: string;
  link_type: string;
  strength: number;
}

// ── Config ───────────────────────────────────────────────────

export interface SupabaseProviderConfig {
  url: string;
  serviceKey: string;
  /** Default owner wallet for scoping */
  ownerWallet?: string;
}

// ── Provider ─────────────────────────────────────────────────

export class SupabaseProvider {
  readonly name = 'supabase';
  private db: SupabaseClient;
  private ownerWallet: string | null;

  constructor(config: SupabaseProviderConfig) {
    this.db = createClient(config.url, config.serviceKey);
    this.ownerWallet = config.ownerWallet ?? null;
  }

  private getWallet(scope?: Scope): string | null {
    return scope?.owner_wallet ?? this.ownerWallet;
  }

  private scopeQuery<T>(query: T, scope?: Scope): T {
    const wallet = this.getWallet(scope);
    if (wallet) return (query as any).eq('owner_wallet', wallet);
    return query;
  }

  // ── Insert ───────────────────────────────────────────────

  async insert(memory: Omit<BrainMemory, '_score' | '_vector_sim'>): Promise<BrainMemory> {
    const { data, error } = await this.db
      .from('memories')
      .insert({
        hash_id: memory.id,
        memory_type: memory.memory_type,
        content: memory.content,
        summary: memory.summary,
        tags: memory.tags,
        concepts: memory.concepts,
        emotional_valence: memory.emotional_valence,
        importance: memory.importance,
        source: memory.source,
        source_id: memory.source_id || null,
        related_user: memory.related_user || null,
        related_wallet: memory.related_entity || null,
        metadata: memory.metadata,
        owner_wallet: memory.owner_wallet ?? this.ownerWallet,
        decay_factor: memory.decay_factor,
      })
      .select('id, hash_id')
      .single();

    if (error) throw new Error(`Insert failed: ${error.message}`);
    return { ...memory, id: memory.id };
  }

  // ── Get ──────────────────────────────────────────────────

  async getById(id: string, scope?: Scope): Promise<BrainMemory | null> {
    let query = this.db.from('memories').select('*').eq('hash_id', id);
    query = this.scopeQuery(query, scope);
    const { data } = await query.single();
    return data ? this.rowToBrain(data) : null;
  }

  async getByIds(ids: string[], scope?: Scope): Promise<BrainMemory[]> {
    if (ids.length === 0) return [];
    let query = this.db.from('memories').select('*').in('hash_id', ids);
    query = this.scopeQuery(query, scope);
    const { data } = await query;
    return (data || []).map((r: any) => this.rowToBrain(r));
  }

  // ── Update / Delete ──────────────────────────────────────

  async update(id: string, patch: Partial<BrainMemory>, scope?: Scope): Promise<void> {
    const updates: Record<string, any> = {};
    if (patch.importance !== undefined) updates.importance = patch.importance;
    if (patch.decay_factor !== undefined) updates.decay_factor = patch.decay_factor;
    if (patch.access_count !== undefined) updates.access_count = patch.access_count;
    if (patch.last_accessed !== undefined) updates.last_accessed = patch.last_accessed;
    if (patch.summary !== undefined) updates.summary = patch.summary;
    if (Object.keys(updates).length === 0) return;

    let query = this.db.from('memories').update(updates).eq('hash_id', id);
    query = this.scopeQuery(query, scope);
    await query;
  }

  async delete(id: string, scope?: Scope): Promise<boolean> {
    let query = this.db.from('memories').delete().eq('hash_id', id);
    query = this.scopeQuery(query, scope);
    const { error } = await query;
    return !error;
  }

  async clear(scope?: Scope): Promise<void> {
    const wallet = this.getWallet(scope);
    if (wallet) {
      await this.db.from('memories').delete().eq('owner_wallet', wallet);
    } else {
      throw new Error('Cannot clear all memories without scope (safety)');
    }
  }

  // ── Query: Importance ────────────────────────────────────

  async queryByImportance(opts: {
    limit: number; min_decay?: number; types?: MemoryType[]; tags?: string[];
    related_user?: string; related_entity?: string; scope?: Scope;
  }): Promise<BrainMemory[]> {
    let query = this.db
      .from('memories')
      .select('*')
      .gte('decay_factor', opts.min_decay ?? 0.1)
      .not('source', 'in', '("demo","demo-maas")')
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(opts.limit);

    query = this.scopeQuery(query, opts.scope);
    if (opts.types?.length) query = query.in('memory_type', opts.types);
    if (opts.related_user) query = query.eq('related_user', opts.related_user);
    if (opts.related_entity) query = query.eq('related_wallet', opts.related_entity);
    if (opts.tags?.length) query = query.overlaps('tags', opts.tags);

    const { data } = await query;
    return (data || []).map((r: any) => this.rowToBrain(r));
  }

  // ── Query: Text Search ───────────────────────────────────

  async queryByText(opts: {
    keywords: string[]; limit: number; min_decay?: number;
    types?: MemoryType[]; scope?: Scope;
  }): Promise<BrainMemory[]> {
    if (opts.keywords.length === 0) return [];

    let query = this.db
      .from('memories')
      .select('*')
      .gte('decay_factor', opts.min_decay ?? 0.1)
      .not('source', 'in', '("demo","demo-maas")')
      .or(opts.keywords.map(k => `summary.ilike.%${k}%`).join(','))
      .order('importance', { ascending: false })
      .limit(opts.limit);

    query = this.scopeQuery(query, opts.scope);
    if (opts.types?.length) query = query.in('memory_type', opts.types);

    const { data } = await query;
    return (data || []).map((r: any) => this.rowToBrain(r));
  }

  // ── Query: By Source ─────────────────────────────────────

  async queryBySource(opts: {
    source: string; limit?: number; min_decay?: number;
    types?: MemoryType[]; scope?: Scope;
  }): Promise<BrainMemory[]> {
    let query = this.db
      .from('memories')
      .select('*')
      .eq('source', opts.source)
      .gte('decay_factor', opts.min_decay ?? 0.1);

    query = this.scopeQuery(query, opts.scope);
    if (opts.types?.length) query = query.in('memory_type', opts.types);

    const { data } = await query.limit(opts.limit ?? 100);
    return (data || []).map((r: any) => this.rowToBrain(r));
  }

  // ── Vector Search ────────────────────────────────────────

  async vectorSearch(opts: {
    embedding: number[]; threshold: number; limit: number;
    types?: MemoryType[]; scope?: Scope;
  }): Promise<Array<{ id: string; similarity: number }>> {
    const { data, error } = await this.db.rpc('match_memories', {
      query_embedding: JSON.stringify(opts.embedding),
      match_threshold: opts.threshold,
      match_count: opts.limit,
      filter_types: opts.types || null,
      filter_user: null,
      min_decay: 0.1,
      filter_owner: this.getWallet(opts.scope) || null,
    });

    if (error || !data) return [];

    return (data as any[]).map((r: any) => ({
      id: r.hash_id || `legacy-${r.id}`,
      similarity: r.similarity,
    }));
  }

  async fragmentSearch(opts: {
    embedding: number[]; threshold: number; limit: number; scope?: Scope;
  }): Promise<Array<{ memory_id: string; similarity: number }>> {
    const { data, error } = await this.db.rpc('match_memory_fragments', {
      query_embedding: JSON.stringify(opts.embedding),
      match_threshold: opts.threshold,
      match_count: opts.limit,
      filter_owner: this.getWallet(opts.scope) || null,
    });

    if (error || !data) return [];

    return (data as any[]).map((r: any) => ({
      memory_id: r.hash_id || `legacy-${r.memory_id}`,
      similarity: r.max_similarity,
    }));
  }

  // ── Embedding Storage ────────────────────────────────────

  async storeEmbedding(memory_id: string, embedding: number[]): Promise<void> {
    // Find numeric ID from hash_id
    const { data } = await this.db
      .from('memories')
      .select('id')
      .eq('hash_id', memory_id)
      .single();

    if (data) {
      await this.db
        .from('memories')
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', data.id);
    }
  }

  // ── Batch Operations ─────────────────────────────────────

  async batchTrackAccess(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    // Get numeric IDs
    const { data } = await this.db
      .from('memories')
      .select('id')
      .in('hash_id', ids);

    if (data && data.length > 0) {
      const numericIds = data.map((r: any) => r.id);
      await this.db.rpc('batch_boost_memory_access', { memory_ids: numericIds });
    }
  }

  async batchDecay(opts: { type: MemoryType; rate: number; min_decay: number }): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.db.rpc('batch_decay_memories', {
      decay_type: opts.type,
      decay_rate: opts.rate,
      min_decay: opts.min_decay,
      cutoff,
    });

    return (data as number) || 0;
  }

  async boostImportance(id: string, amount: number, max: number): Promise<void> {
    const { data } = await this.db
      .from('memories')
      .select('id')
      .eq('hash_id', id)
      .single();

    if (data) {
      try {
        await this.db.rpc('boost_memory_importance', {
          memory_id: data.id,
          boost_amount: amount,
          max_importance: max,
        });
      } catch {} // Non-critical
    }
  }

  // ── Links ────────────────────────────────────────────────

  async upsertLink(link: MemoryLink): Promise<void> {
    // Resolve hash IDs to numeric IDs
    const { data: src } = await this.db.from('memories').select('id').eq('hash_id', link.source_id).single();
    const { data: tgt } = await this.db.from('memories').select('id').eq('hash_id', link.target_id).single();

    if (src && tgt) {
      await this.db.from('memory_links').upsert({
        source_id: src.id,
        target_id: tgt.id,
        link_type: link.link_type,
        strength: link.strength,
      }, { onConflict: 'source_id,target_id,link_type' });
    }
  }

  async getLinkedMemories(seed_ids: string[], min_strength: number, limit: number, scope?: Scope): Promise<Array<{ memory_id: string; link_type: string; strength: number }>> {
    // Resolve hash IDs
    const { data: rows } = await this.db.from('memories').select('id, hash_id').in('hash_id', seed_ids);
    if (!rows || rows.length === 0) return [];

    const numericIds = rows.map((r: any) => r.id);
    const { data: linked } = await this.db.rpc('get_linked_memories', {
      seed_ids: numericIds,
      min_strength,
      max_results: limit,
      filter_owner: this.getWallet(scope) || null,
    });

    if (!linked) return [];

    // Resolve back to hash IDs
    const memIds = (linked as any[]).map((l: any) => l.memory_id);
    const { data: memRows } = await this.db.from('memories').select('id, hash_id').in('id', memIds);
    const idToHash = new Map((memRows || []).map((r: any) => [r.id, r.hash_id]));

    return (linked as any[]).map((l: any) => ({
      memory_id: idToHash.get(l.memory_id) || `legacy-${l.memory_id}`,
      link_type: l.link_type,
      strength: l.strength,
    }));
  }

  async boostLinkStrength(ids: string[], amount: number): Promise<number> {
    const { data: rows } = await this.db.from('memories').select('id').in('hash_id', ids);
    if (!rows || rows.length < 2) return 0;

    const numericIds = rows.map((r: any) => r.id);
    const { data } = await this.db.rpc('boost_link_strength', {
      memory_ids: numericIds,
      boost_amount: amount,
    });

    return (data as number) || 0;
  }

  // ── Count ────────────────────────────────────────────────

  async count(scope?: Scope): Promise<number> {
    let query = this.db.from('memories').select('*', { count: 'exact', head: true });
    query = this.scopeQuery(query, scope);
    const { count } = await query;
    return count || 0;
  }

  // ── Row conversion ───────────────────────────────────────

  private rowToBrain(row: any): BrainMemory {
    return {
      id: row.hash_id || `legacy-${row.id}`,
      uuid: row.uuid,
      memory_type: row.memory_type,
      content: row.content,
      summary: row.summary,
      tags: row.tags || [],
      concepts: row.concepts || [],
      emotional_valence: row.emotional_valence || 0,
      importance: row.importance,
      access_count: row.access_count,
      source: row.source || 'unknown',
      source_id: row.source_id,
      related_user: row.related_user,
      related_entity: row.related_wallet,
      metadata: row.metadata || {},
      created_at: row.created_at,
      last_accessed: row.last_accessed,
      decay_factor: row.decay_factor,
      owner_wallet: row.owner_wallet,
      compacted: row.compacted,
      compacted_into: row.compacted_into,
      base_signature: row.base_signature,
    };
  }
}
