# cogxai-local

Local-first providers for [CogxAI](https://cogxai.org) — SQLite storage + GTE-Small embeddings. Fully offline, zero API keys.

## Install

```bash
npm install cogxai-local
```

## Usage

```typescript
import { SqliteProvider, GteSmallEmbeddings } from 'cogxai-local';

const storage = new SqliteProvider('./my-agent-memory.db');
const embeddings = new GteSmallEmbeddings(); // ~30MB download on first run

// Use with cogxai-brain
import { CogxAIEngine } from 'cogxai-brain';

const engine = new CogxAIEngine({ storage, embeddings });
await engine.store({ content: "User prefers dark mode", type: "semantic" });
const memories = await engine.recall({ query: "theme preferences" });
```

## Why local?

- **Zero API keys** — no Supabase, no Voyage, no nothing
- **Fully offline** — works on a plane, in a bunker, wherever
- **Fast** — no network latency, sub-millisecond reads
- **Private** — your data never leaves your machine
- **Free** — no usage costs, no rate limits

## Providers

### SqliteProvider
SQLite-backed storage with in-memory vector index. Implements `StorageProvider` from `cogxai-brain`.

### GteSmallEmbeddings
Local ONNX runtime using `Xenova/gte-small` (384 dimensions). Downloads ~30MB model on first run, fully offline after.

## Part of the CogxAI ecosystem

- [`cogxai-brain`](https://www.npmjs.com/package/cogxai-brain) — Core memory engine
- [`cogxai-cloud`](https://www.npmjs.com/package/cogxai-cloud) — Supabase + Voyage providers
- `cogxai-local` — This package. SQLite + local embeddings.
- [`cogxai`](https://www.npmjs.com/package/cogxai) — Full package with MCP server, CLI, SDK, and more.

## License

MIT — [Black-dork](https://cogxai.org)
