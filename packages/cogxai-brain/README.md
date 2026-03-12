# cogxai-brain

Cognitive memory engine for AI agents. The core of [CogxAI](https://cogxai.org) — extracted as a standalone, provider-agnostic package.

## What is this?

`cogxai-brain` is the memory engine that powers CogxAI. It handles:

- **Multi-type memory** — episodic, semantic, procedural, self_model
- **Scoring & ranking** — vector similarity, importance, decay, recency, Hebbian reinforcement
- **Entity extraction** — automatic entity and concept detection
- **Memory linking** — typed bonds between related memories
- **Provider-agnostic** — bring your own storage and embeddings

## Install

```bash
npm install cogxai-brain
```

## Quick Start

```typescript
import { CogxAIEngine } from 'cogxai-brain';
import type { StorageProvider, EmbeddingProvider } from 'cogxai-brain';

// Bring your own providers
const engine = new CogxAIEngine({
  storage: myStorageProvider,
  embeddings: myEmbeddingProvider,
});

// Store a memory
await engine.store({
  content: "Auth bug was caused by expired JWT refresh token",
  type: "procedural",
  tags: ["auth", "debugging"],
  importance: 0.8,
});

// Recall relevant memories
const memories = await engine.recall({
  query: "authentication issues",
  limit: 5,
});
```

## Provider Interface

Implement these interfaces to connect any storage or embedding backend:

```typescript
interface StorageProvider {
  store(memory: Memory): Promise<string>;
  recall(options: RecallOptions): Promise<Memory[]>;
  get(id: string): Promise<Memory | null>;
  update(id: string, patch: Partial<Memory>): Promise<void>;
  delete(id: string): Promise<boolean>;
  stats(): Promise<MemoryStats>;
}

interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<(number[] | null)[]>;
  readonly dimensions: number;
}
```

## Available Providers

- **[cogxai-cloud](https://www.npmjs.com/package/cogxai-cloud)** — Supabase + Voyage AI (production)
- **[cogxai-local](https://www.npmjs.com/package/cogxai-local)** — SQLite + GTE-Small (offline, zero config)

## Memory Types

| Type | Purpose | Decay Rate |
|------|---------|------------|
| `episodic` | Events, conversations | Fast |
| `semantic` | Facts, knowledge | Slow |
| `procedural` | How-to, patterns | Very slow |
| `self_model` | Self-awareness | Very slow |

## Scoring

Memories are ranked by a weighted combination of:
- **Vector similarity** to the query
- **Importance** (0-1, with Hebbian reinforcement)
- **Recency** (time-decayed)
- **Decay factor** (type-dependent)
- **Access count** (frequently recalled memories rank higher)

## Part of the CogxAI ecosystem

- `cogxai-brain` — This package. The memory engine.
- `cogxai-cloud` — Supabase + Voyage providers.
- `cogxai-local` — SQLite + local embeddings.
- `cogxai` — [Full package](https://www.npmjs.com/package/cogxai) with MCP server, CLI, SDK, dream cycles, and more.

## License

MIT — [Black-dork](https://cogxai.org)
