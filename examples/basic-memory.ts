/**
 * Basic Memory — Store and recall memories with just Supabase.
 *
 * No embeddings or Anthropic key needed. Retrieval uses keyword + tag scoring.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_KEY=... npx tsx examples/basic-memory.ts
 */

import { Cortex } from 'cogxai';

async function main() {
  const brain = new Cortex({
    supabase: {
      url: process.env.SUPABASE_URL!,
      serviceKey: process.env.SUPABASE_KEY!,
    },
  });

  await brain.init();

  // Store some memories
  await brain.store({
    type: 'episodic',
    content: 'User asked about Base transaction fees and was surprised they were so low.',
    summary: 'User surprised by low Base fees',
    tags: ['base', 'fees', 'user-question'],
    importance: 0.6,
    source: 'example',
  });

  await brain.store({
    type: 'semantic',
    content: 'Base transaction fees are typically 0.000005 ETH (~$0.001) per transaction.',
    summary: 'Base fees are ~$0.001 per tx',
    tags: ['base', 'fees', 'knowledge'],
    importance: 0.8,
    source: 'example',
  });

  // Recall memories about fees
  const memories = await brain.recall({
    query: 'how much do Base transactions cost',
    limit: 5,
  });

  console.log(`Recalled ${memories.length} memories:\n`);
  for (const m of memories) {
    console.log(`[${m.memory_type}] ${m.summary}`);
    console.log(`  importance: ${m.importance} | decay: ${m.decay_factor.toFixed(3)}\n`);
  }

  // Format for an LLM prompt
  const context = brain.formatContext(memories);
  console.log('--- LLM context ---');
  console.log(context);

  brain.destroy();
}

main().catch(console.error);
