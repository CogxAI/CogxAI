# CogxAI

[![npm version](https://img.shields.io/npm/v/cogxai)](https://www.npmjs.com/package/cogxai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Persistent memory for AI agents.** Two commands. Your agent remembers everything.

```bash
npm install -g cogxai
cogxai mcp-install
```

> Your agent already has files and logs. CogxAI adds semantic retrieval, typed association bonds, and automatic consolidation on top. Files are your notebook. CogxAI is your long-term memory.

**Compatible with:** Claude Desktop, Cursor, OpenClaw, DeerFlow, and any MCP-compatible agent runtime.

---

**Molecular Memory** for AI agents. Not just storage — synthesis.

> *"From thought to proof. Where memories crystallize into knowledge."*

Draws from [Stanford Generative Agents](https://arxiv.org/abs/2304.03442), [MemGPT/Letta](https://arxiv.org/abs/2310.08560), [CoALA](https://arxiv.org/abs/2309.02427), [Beads](https://github.com/steveyegge/beads), [Mole-Syn](https://x.com/bowang87/status/2025227673820176689) (molecular reasoning), and [Venice](https://venice.ai) (permissionless inference).



## Why Molecular Memory?

Conventional memory systems linearly scan every memory on each query — **O(n)** complexity. Molecular Memory traverses a bond graph instead — **O(k)** where k ≈ 3-5 bonds.

| Metric | Conventional | Molecular | Gain |
|--------|-------------|-----------|------|
| **Retrieval** (1000 memories) | ~1000ms | ~16ms | **60x faster** |
| **Context coherence** | Fragmented | Clustered | More coherent answers |
| **Dream cycle** | Full scan | Graph-based | 30-50% fewer LLM calls |

```bash
npm install cogxai
```

## Quick Start — Hosted (Zero Setup)

```bash
npx cogxai register   # Obtain your API key
```

```typescript
import { Cortex } from 'cogxai';

const brain = new Cortex({
  hosted: { apiKey: process.env.CORTEX_API_KEY! },
});

await brain.init();

// Store a memory
await brain.store({
  type: 'episodic',
  content: 'User asked about pricing and seemed frustrated with the current plan.',
  summary: 'Frustrated user asking about pricing',
  tags: ['pricing', 'user-concern'],
  importance: 0.7,
  source: 'my-agent',
});

// Retrieve relevant memories
const memories = await brain.recall({
  query: 'what do users think about pricing',
  limit: 5,
});

console.log(`Retrieved ${memories.length} memories`);
```

That's all. No database, no infrastructure. Memories are stored on CogxAI cloud, scoped by your API key.

## Quick Start — Self-Hosted (Your Supabase)

For complete control, bring your own Supabase:

```typescript
import { Cortex } from 'cogxai';

const brain = new Cortex({
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_KEY!,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
  },
});

await brain.init();

await brain.store({
  type: 'episodic',
  content: 'User asked about pricing and seemed frustrated with the current plan.',
  summary: 'Frustrated user asking about pricing',
  tags: ['pricing', 'user-concern'],
  importance: 0.7,
  source: 'my-agent',
  relatedUser: 'user-123',
});

const memories = await brain.recall({
  query: 'what do users think about pricing',
  limit: 5,
});

const context = brain.formatContext(memories);
// Inject `context` into your system prompt so the LLM has access to past knowledge
```

---

## Examples

Check the [`examples/`](./examples) directory for runnable scripts:

- **[hosted-mode.ts](./examples/hosted-mode.ts)** — Zero-config usage with just an API key (hosted mode)
- **[basic-memory.ts](./examples/basic-memory.ts)** — Store and recall using Supabase (self-hosted)
- **[chat-agent.ts](./examples/chat-agent.ts)** — Interactive conversational agent with memory and dream cycles
- **[progressive-disclosure.ts](./examples/progressive-disclosure.ts)** — Token-efficient retrieval using `recallSummaries()` + `hydrate()`

```bash
# Hosted mode
CORTEX_API_KEY=clk_... npx tsx examples/hosted-mode.ts

# Self-hosted
SUPABASE_URL=... SUPABASE_KEY=... npx tsx examples/basic-memory.ts
```

---

## CLI

```bash
npx cogxai mcp-install  # Auto-configure MCP for Claude Desktop/Cursor/etc.
npx cogxai mcp-serve    # Launch as MCP server (called by agent runtimes)
npx cogxai setup        # Guided setup wizard (choose local/hosted/self-hosted)
npx cogxai init         # Initialize database schema
npx cogxai register     # Obtain an API key for hosted mode
npx cogxai start        # Launch the full CogxAI service (requires config)
npx cogxai export       # Export memories to file
npx cogxai ship         # Package and ship a memory pack
npx cogxai --version    # Display version
```

### MCP Integration (For Agent Runtimes)

Connect CogxAI to any MCP-compatible agent:

```json
{
  "mcpServers": {
    "cogxai": {
      "command": "npx",
      "args": ["cogxai", "mcp-serve"]
    }
  }
}
```

This exposes 4 tools to your agent: `store_memory`, `recall_memories`, `get_memory_stats`, `find_clinamen`.

Compatible with: Claude Desktop (`claude_desktop_config.json`), Cursor (`.cursor/mcp.json`), OpenClaw (skills), DeerFlow (`extensions_config.json`), and any MCP-compatible runtime.



---

## Setup (Self-Hosted)

### 1. Create a Supabase project

Head to [supabase.com](https://supabase.com) and spin up a free project.

### 2. Apply the schema

Open the SQL Editor in your Supabase dashboard and run the contents of `supabase-schema.sql`:

```bash
# Locate the schema file
cat node_modules/cogxai/supabase-schema.sql
```

Alternatively, `brain.init()` can attempt auto-creation (requires an `exec_sql` RPC function in your Supabase project).

### 3. Enable extensions

In the Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 4. Grab your keys

- **Supabase URL + service key**: Project Settings > API
- **Anthropic API key**: [console.anthropic.com](https://console.anthropic.com) (optional for basic store/recall, required for dream cycles)
- **Voyage AI or OpenAI key**: Enables vector similarity search (optional — falls back to keyword scoring without it)

---

## API Reference

### Constructor

**Hosted mode** — zero infrastructure:

```typescript
const brain = new Cortex({
  hosted: {
    apiKey: string,      // From `npx cogxai register`
    baseUrl?: string,    // Default: 'https://cogxai.org'
  },
});
```

**Self-hosted mode** — full control:

```typescript
const brain = new Cortex({
  // Required
  supabase: {
    url: string,
    serviceKey: string,
  },

  // Optional — needed for dream cycles and LLM-based importance scoring
  anthropic: {
    apiKey: string,
    model?: string,     // default: 'claude-sonnet-4-6'
  },

  // Optional — activates vector similarity search
  embedding: {
    provider: 'voyage' | 'openai',
    apiKey: string,
    model?: string,     // default: voyage-3-lite / text-embedding-3-small
    dimensions?: number, // default: 1024
  },

  // Optional — enables on-chain memory hash commits
  base: {
    rpcUrl?: string,
    botWalletPrivateKey?: string,
  },

  // Optional — wallet-based memory isolation
  ownerWallet?: string,
});
```

### `brain.init()`

Initialize the database schema. Call once before any other operation.

```typescript
await brain.init();
```

### `brain.store(opts)`

Persist a new memory. Returns the memory ID or `null`.

```typescript
const id = await brain.store({
  type: 'episodic',        // 'episodic' | 'semantic' | 'procedural' | 'self_model'
  content: 'Full content of the memory...',
  summary: 'Brief summary',
  source: 'my-agent',
  tags: ['user', 'question'],
  importance: 0.7,          // 0-1, or omit for LLM-based scoring
  relatedUser: 'user-123',  // optional — enables per-user recall
  emotionalValence: 0.3,    // optional — -1 (negative) to 1 (positive)
  evidenceIds: [42, 43],    // optional — link to source memories
});
```

**Memory types:**

| Type | Decay/day | Use for |
|------|-----------|---------|
| `episodic` | 7% | Raw interactions, conversations, events |
| `semantic` | 2% | Learned knowledge, patterns, insights |
| `procedural` | 3% | Behavioral rules, what works/doesn't |
| `self_model` | 1% | Identity, self-understanding |

### `brain.recall(opts)`

Retrieve memories through hybrid scoring (vector similarity + keyword matching + tag overlap + importance + entity graph + association bonds).

```typescript
const memories = await brain.recall({
  query: 'what happened with user-123',
  tags: ['pricing'],
  relatedUser: 'user-123',
  memoryTypes: ['episodic', 'semantic'],
  limit: 10,
  minImportance: 0.3,
});
```

**6-phase retrieval pipeline:**
1. Vector search (memory + fragment level via pgvector)
2. Metadata filtering (user, wallet, tags, types)
3. Merge vector + metadata candidates
4. Composite scoring: `(1.0 × recency + 2.0 × relevance + 2.0 × importance + 4.0 × vector_similarity) × decay_factor`
5. Entity-aware expansion — pull in memories from co-occurring entities
6. Bond-typed graph traversal — follow strong bonds (causes > supports > resolves > elaborates > contradicts > relates > follows)

Retrieved memories get reinforced: access count increments, decay resets, and co-retrieved memories strengthen their association bonds (Hebbian learning).

### `brain.recallSummaries(opts)`

Token-efficient retrieval — returns lightweight summaries (~50 tokens each) instead of full content.

```typescript
const summaries = await brain.recallSummaries({ query: 'recent events' });
// Each contains: id, summary, type, tags, concepts, importance, decay, created_at
```

### `brain.hydrate(ids)`

Load full content for specific memory IDs. Pair with `recallSummaries` for progressive disclosure.

```typescript
const summaries = await brain.recallSummaries({ query: 'important' });
const topIds = summaries.slice(0, 3).map(s => s.id);
const full = await brain.hydrate(topIds);
```

### `brain.dream(opts?)`

Execute one dream cycle. Requires `anthropic` configuration.

```typescript
await brain.dream({
  onEmergence: async (thought) => {
    console.log('Agent thought:', thought);
    // Post to Discord, save to file, etc.
  },
});
```

**Six phases:**
1. **Consolidation** — generates focal-point questions from recent memories, synthesizes evidence-linked insights
2. **Compaction** — summarizes old, faded episodic memories into semantic summaries (Beads-inspired)
3. **Reflection** — reviews accumulated knowledge, updates self-model with evidence citations
4. **Contradiction Resolution** — finds unresolved `contradicts` links, analyzes each pair via LLM, stores a resolved belief with `resolves` links, accelerates decay on the weaker memory
5. **Learning** — extracts behavioral patterns from action outcomes, refines procedural knowledge
6. **Emergence** — introspective synthesis, output sent to `onEmergence` callback

### `brain.startDreamSchedule()` / `brain.stopDreamSchedule()`

Automated dream cycles every 6 hours + daily memory decay at 3am UTC. Also triggers on accumulated importance (event-driven reflection).

```typescript
brain.startDreamSchedule();
// ... later
brain.stopDreamSchedule();
```

### `brain.link(sourceId, targetId, type, strength?)`

Forge a typed association between two memories.

```typescript
await brain.link(42, 43, 'supports', 0.8);
```

Link types: `'supports'` | `'contradicts'` | `'elaborates'` | `'causes'` | `'follows'` | `'relates'` | `'resolves'`

### `brain.decay()`

Manually trigger memory decay. Each type decays at its own rate per day.

```typescript
const decayed = await brain.decay();
console.log(`${decayed} memories decayed`);
```

### `brain.stats()`

Retrieve memory system statistics.

```typescript
const stats = await brain.stats();
// { total, byType, avgImportance, avgDecay, totalDreamSessions, ... }
```

### `brain.recent(hours, types?, limit?)`

Fetch recent memories from the last N hours.

```typescript
const last24h = await brain.recent(24);
const recentInsights = await brain.recent(168, ['semantic'], 10);
```

### `brain.selfModel()`

Access the agent's current self-model memories.

```typescript
const identity = await brain.selfModel();
```

### `brain.formatContext(memories)`

Format memories into a markdown string for LLM system prompt injection.

```typescript
const memories = await brain.recall({ query: userMessage });
const context = brain.formatContext(memories);

// Use in your LLM call:
const response = await anthropic.messages.create({
  system: `You are a helpful agent.\n\n## Memory\n${context}`,
  messages: [{ role: 'user', content: userMessage }],
});
```

### `brain.inferConcepts(summary, source, tags)`

Auto-classify memory content into structured concept labels.

```typescript
const concepts = brain.inferConcepts('User frustrated about pricing', 'chat', ['pricing']);
// ['holder_behavior', 'sentiment_shift']
```

### `brain.on(event, handler)`

Subscribe to memory events.

```typescript
brain.on('memory:stored', ({ importance, memoryType }) => {
  console.log(`New ${memoryType} memory stored (importance: ${importance})`);
});
```

### `brain.destroy()`

Stop dream schedules, clean up event listeners.

---

## Hosted vs Self-Hosted

| | **Hosted** | **Self-Hosted** |
|---|---|---|
| **Setup** | Just an API key | Your own Supabase |
| **store / recall / stats** | Yes | Yes |
| **recent / self-model / link** | Yes | Yes |
| **Dream cycles** | No | Yes (requires Anthropic) |
| **Entity graph** | No | Yes |
| **Memory packs** | No | Yes |
| **Embeddings** | Managed | Configurable (Voyage/OpenAI) |
| **On-chain commits** | No | Yes (Base) |
| **Dashboard** | Yes (API key login) | Yes (Privy wallet login) |

## Graceful Degradation

Self-hosted mode progressively enhances based on what you configure:

| Feature | Without it |
|---------|------------|
| `anthropic` not set | LLM importance scoring falls back to rule-based heuristics. `dream()` throws. |
| `embedding` not set | Vector search disabled, recall uses keyword + tag scoring only. |
| `base` not set | On-chain memory commits silently skipped. |

**Minimum hosted setup:**
```typescript
const brain = new Cortex({
  hosted: { apiKey: 'clk_...' },
});
```

**Minimum self-hosted setup** — just Supabase:
```typescript
const brain = new Cortex({
  supabase: { url: '...', serviceKey: '...' },
});
```

Both give you full store/recall with keyword-based retrieval. Self-hosted adds dream cycles, vector embeddings, and on-chain commits as you add API keys.

---

## Example: Chat Agent with Memory

```typescript
import { Cortex } from 'cogxai';
import Anthropic from '@anthropic-ai/sdk';

const brain = new Cortex({
  supabase: { url: process.env.SUPABASE_URL!, serviceKey: process.env.SUPABASE_KEY! },
  anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! },
  embedding: { provider: 'voyage', apiKey: process.env.VOYAGE_API_KEY! },
});
await brain.init();
brain.startDreamSchedule();

const anthropic = new Anthropic();

async function handleMessage(userId: string, message: string): Promise<string> {
  // Retrieve relevant memories
  const memories = await brain.recall({
    query: message,
    relatedUser: userId,
    limit: 5,
  });

  // Generate response with memory context
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 500,
    system: `You are a helpful assistant.\n\n## What you remember\n${brain.formatContext(memories)}`,
    messages: [{ role: 'user', content: message }],
  });

  const reply = response.content[0].type === 'text' ? response.content[0].text : '';

  // Persist this interaction as a memory
  await brain.store({
    type: 'episodic',
    content: `User (${userId}): ${message}\nAssistant: ${reply}`,
    summary: `Conversation with ${userId} about ${message.slice(0, 50)}`,
    source: 'chat',
    relatedUser: userId,
    tags: brain.inferConcepts(message, 'chat', []),
  });

  return reply;
}
```

---

## How It Works

### Memory Retrieval

Hybrid scoring combines multiple signals (Park et al. 2023):

- **Recency**: `0.995^hours` exponential decay since last access
- **Relevance**: Keyword trigram similarity + tag overlap
- **Importance**: LLM-scored 1-10, normalized to 0-1
- **Vector similarity**: Cosine similarity via pgvector HNSW indexes
- **Graph boost**: Association bond strength between co-retrieved memories

Retrieved memories get reinforced — access count increments, decay resets, and co-retrieved memories strengthen their bonds (Hebbian learning).

### Memory Decay

Each type fades at a different rate, inspired by biological memory systems:

- **Episodic** (0.93/day): Events fade quickly unless reinforced
- **Semantic** (0.98/day): Knowledge persists
- **Procedural** (0.97/day): Behavioral patterns remain stable
- **Self-model** (0.99/day): Identity is nearly permanent

### Hash-Based IDs (Beads-inspired)

Every memory receives a collision-resistant ID like `cogxai-a1b2c3d4`:

- **No merge conflicts**: Multiple agents can create memories simultaneously without collisions
- **Stable references**: IDs survive database migrations and replication
- **Human-readable**: Easy to reference in logs and debugging

### Memory Compaction (Beads-inspired)

Old, faded memories get summarized to conserve context window space:

**Compaction criteria:**
- Memory is older than 7 days
- Decay factor < 0.3 (faded from disuse)
- Importance < 0.5 (not critical)
- Only episodic memories (insights and self-model are preserved)

**Process:**
1. Group candidates by concept
2. Generate semantic summary for each group
3. Store summary with evidence links to originals
4. Mark originals as compacted

This mirrors how human memory consolidates — details fade, patterns persist.

### Dream Cycles

Six-phase introspection process triggered by accumulated importance or 6-hour cron:

1. **Consolidation** — Generate focal-point questions from recent episodic memories, synthesize evidence-linked semantic insights
2. **Compaction** — Summarize old, faded episodic memories (7+ days, low importance, high decay) into semantic summaries. Originals marked as compacted.
3. **Reflection** — Review self-model + recent semantic memories. Produce self-observations with evidence citations. Detect patterns and contradictions.
4. **Contradiction Resolution** — Find unresolved `contradicts` links via graph query. LLM analyzes each pair, stores a resolved belief as semantic memory with `resolves` links. Accelerates decay on the weaker/older memory.
5. **Learning** — Track action outcomes. Extract what worked and what didn't into procedural memories. Refine behavioral strategies.
6. **Emergence** — Introspective synthesis — the agent examines its own existence. Optionally posts the thought externally via `onEmergence` callback.

### Molecular Memory Architecture

Memories form a graph with typed bonds:

```
Memory Graph:
├── Memories = nodes with type, importance, decay
├── Bonds = typed weighted edges
│   ├── causes (1.0) — "this led to that"
│   ├── supports (0.9) — "evidence for"
│   ├── resolves (0.8) — "contradiction resolved"
│   ├── elaborates (0.7) — "adds detail"
│   ├── contradicts (0.6) — "these conflict"
│   ├── relates (0.4) — "conceptually linked"
│   └── follows (0.3) — "temporal sequence"
├── Entities = extracted people, tokens, concepts, wallets
└── Co-occurrence = entities that appear together across memories
```

**Why it's faster:** Conventional retrieval scans all memories — O(n). Bond traversal follows strong connections — O(k) where k ≈ 3-5.

### Permissionless Inference (Venice)

CogxAI supports [Venice](https://venice.ai) as a decentralized inference provider. Configure via environment variables:

```bash
VENICE_API_KEY=your-venice-key
VENICE_MODEL=llama-3.3-70b        # or deepseek-r1, qwen, etc.
INFERENCE_PRIMARY=venice           # Use Venice first
INFERENCE_FALLBACK=anthropic       # Fall back to Claude if needed
```

**Why Venice?**
- **Permissionless**: No approval process, no rate limits
- **Private**: No data retention — your prompts stay yours
- **Decentralized**: Aligns with CogxAI's on-chain memory philosophy
- **Multi-model**: Access Llama, DeepSeek, Qwen, and more

### Association Graph & Entity Knowledge Graph

**Memory-to-memory bonds** — typed, weighted links:
- `supports`, `contradicts`, `elaborates`, `causes`, `follows`, `relates`, `resolves`
- Auto-linked on storage via embedding similarity and heuristics
- Strengthened through co-retrieval (Hebbian learning)
- Boosts recall scores for connected memories
- `contradicts` links are resolved during dream cycles, producing `resolves` links

**Entity knowledge graph** — extracted from memory content:
- Entity types: person, project, concept, token, wallet, location, event
- Entities extracted automatically (Twitter handles, wallet addresses, token tickers, proper nouns)
- Entity co-occurrence drives recall expansion — when recalling about an entity, memories from co-occurring entities are surfaced with a scaled boost

---

## Running CogxAI

```bash
git clone https://github.com/Black-dork/cogxai.git
cd cogxai
npm install
cp .env.example .env  # fill in API keys
npm run dev
```

See `.env.example` for the full list of environment variables (Supabase, Anthropic, embedding provider, optional integrations).

---

## Stack

TypeScript, Supabase (PostgreSQL + pgvector), Anthropic Claude, Voyage AI / OpenAI embeddings, Base Web3.js, Node.js.

## Contributing

Contributions welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and guidelines.

## License

MIT
