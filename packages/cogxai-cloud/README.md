# cogxai-cloud

Cloud providers for [CogxAI](https://cogxai.org) — Supabase storage + cloud sync.

## Install

```bash
npm install cogxai-cloud
```

## Usage

```typescript
import { SupabaseProvider, CloudSync } from 'cogxai-cloud';
import { CogxAIEngine } from 'cogxai-brain';
import { VoyageEmbeddings } from 'cogxai-brain/providers/voyage';

const storage = new SupabaseProvider({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  ownerWallet: 'my-agent-id',
});

const embeddings = new VoyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY,
});

const engine = new CogxAIEngine({ storage, embeddings });
```

## Providers

### SupabaseProvider
Implements `StorageProvider` from `cogxai-brain`. Stores memories in Supabase with pgvector for similarity search.

### CloudSync
Sync memories between local and cloud storage. Push/pull with conflict resolution.

## Part of the CogxAI ecosystem

- [`cogxai-brain`](https://www.npmjs.com/package/cogxai-brain) — Core memory engine
- `cogxai-cloud` — This package. Supabase storage + cloud sync.
- [`cogxai-local`](https://www.npmjs.com/package/cogxai-local) — SQLite + local embeddings
- [`cogxai`](https://www.npmjs.com/package/cogxai) — Full package with MCP server, CLI, SDK, and more.

## License

MIT — [Black-dork](https://cogxai.org)
