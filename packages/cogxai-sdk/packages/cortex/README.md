# @cogxai/cortex

The integration layer. Private. Portable. Permissionless. Poly-model. Persistent.

Cortex connects [COGXAI Brain](../cogxai-core) to the world: wallet identity, signed MemoryPacks, on-chain proofs, and framework adapters.

## Quick Start

```typescript
import { createPack, verifyPackIntegrity, packToMarkdown } from '@cogxai/cortex'
import { cogxaiTools, handleCogxAITool } from '@cogxai/cortex/adapters/openai'

// Export memories as a signed pack
const pack = createPack({
  wallet: '5vK6WRCq...',
  name: 'My Agent',
  memories: [...],
  secret: 'my-signing-key',
})

// Verify integrity
verifyPackIntegrity(pack) // true

// Share as markdown
console.log(packToMarkdown(pack))
```

## Features

### Wallet Identity
Every agent is identified by a wallet address. Memories are scoped to wallets.

```typescript
import { generateMemoryUUID, generateAgentId } from '@cogxai/cortex'

// Deterministic — same inputs always produce the same UUID
const uuid = generateMemoryUUID(wallet, content, timestamp)
```

### MemoryPacks
Self-contained, signed memory bundles. Like Git commits for memory.

```typescript
import { createPack, mergePacks, packFromJSON } from '@cogxai/cortex'

// Create
const pack = createPack({ wallet, memories, connections, secret })

// Merge two packs (deduplicates by UUID)
const merged = mergePacks(packA, packB)

// JSON round-trip
const json = packToJSON(pack)
const restored = packFromJSON(json)
```

### On-Chain Proofs (Base)
Commit memory hashes to Base for provable existence and ownership.

```typescript
import { commitPackToChain, verifyOnChainProof } from '@cogxai/cortex/base'

const proof = await commitPackToChain(pack, {
  rpcUrl: 'https://api.mainnet.base.com',
  privateKey: '...',
})
// proof.tx = Base transaction signature
```

### OpenAI Function Calling
Drop CogxAI into any OpenAI agent in 3 lines:

```typescript
import { cogxaiTools, handleCogxAITool } from '@cogxai/cortex/adapters/openai'

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages,
  tools: cogxaiTools,  // remember, recall, forget
})

// Handle tool calls
for (const call of response.choices[0].message.tool_calls) {
  const result = await handleCogxAITool(call, engine)
}
```

### LangChain / LangGraph
Works as a drop-in memory backend:

```typescript
import { CogxAIMemory } from '@cogxai/cortex/adapters/langchain'

const memory = new CogxAIMemory(engine)
// Automatically loads relevant memories before each LLM call
// Automatically saves interactions after each response
```

## Architecture

```
@cogxai/cortex
├── src/
│   ├── index.ts          — Public exports
│   ├── identity.ts       — Wallet-based agent identity
│   ├── pack.ts           — MemoryPack create/sign/verify/merge
│   ├── base.ts         — On-chain proofs (secp256k1, memo)
│   └── adapters/
│       ├── openai.ts     — OpenAI function calling tools
│       └── langchain.ts  — LangChain memory + LangGraph checkpointer
```

## The 5 P's

| Principle | How |
|---|---|
| **Private** | Venice AI inference, no data logging |
| **Portable** | Wallet-based identity, signed MemoryPacks |
| **Permissionless** | Any agent can store/recall, no gatekeepers |
| **Poly-model** | Works with any LLM (OpenAI, Anthropic, local) |
| **Persistent** | Base on-chain proofs, survives model changes |

## Packages

| Package | What |
|---|---|
| `@cogxai/brain` | Memory engine (7-phase recall, scoring, decay) |
| **`@cogxai/cortex`** | **Integration layer (this package)** |
| `@cogxai/local` | SQLite + gte-small (zero config) |
| `@cogxai/cloud` | Supabase + Voyage AI |

## License

MIT
