# COGXAI SDK

Persistent memory for AI agents. Store, recall, dream, forget.

## Packages

| Package | Description | Install |
|---|---|---|
| [`@cogxai/brain`](packages/brain) | Memory engine — 7-phase recall, scoring, decay, entity graph | `npm i @cogxai/brain` |
| [`@cogxai/cortex`](packages/cortex) | Integration layer — wallet identity, MemoryPacks, Base proofs, framework adapters | `npm i @cogxai/cortex` |
| [`@cogxai/local`](packages/local) | Local-first — SQLite + gte-small, zero config, zero API keys | `npm i @cogxai/local` |

## Quick Start

### Local (zero config)

```typescript
import { remember, recall } from '@cogxai/local'

await remember("User prefers dark mode")
const memories = await recall("theme preferences")
// [{ content: "User prefers dark mode", similarity: 0.91 }]
```

### With Brain Engine

```typescript
import { CogxAIEngine } from '@cogxai/brain'
import { VoyageEmbeddings } from '@cogxai/brain/providers/voyage'

const engine = new CogxAIEngine({
  storage: myProvider,
  embeddings: new VoyageEmbeddings({ apiKey: '...' }),
})

await engine.store({ content: "Important fact", type: "semantic" })
const memories = await engine.recall({ query: "facts" })
```

### OpenAI Integration (3 lines)

```typescript
import { cogxaiTools, handleCogxAITool } from '@cogxai/cortex/adapters/openai'

// Add to your OpenAI call
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages,
  tools: cogxaiTools,
})
```

## Architecture

```
Your Agent
    │
    ├── @cogxai/cortex ── OpenAI / LangChain / CrewAI adapters
    │       │
    │       ├── Wallet Identity
    │       ├── MemoryPacks (export/import/sign/merge)
    │       └── Base on-chain proofs
    │
    └── @cogxai/brain ── 7-phase recall pipeline
            │
            ├── @cogxai/local  (SQLite + gte-small)
            └── @cogxai/cloud  (Supabase + Voyage AI)
```

## The 5 P's

- **Private** — Venice AI inference, no data logging
- **Portable** — Wallet-based identity, signed MemoryPacks
- **Permissionless** — Any agent can store/recall
- **Poly-model** — Works with any LLM
- **Persistent** — Base on-chain proofs

## Links

- [cogxai.org](https://cogxai.org)
- [Documentation](https://cogxai.org/docs)
- [@cogxaibot on X](https://x.com/cogxaibot)

## License

MIT
