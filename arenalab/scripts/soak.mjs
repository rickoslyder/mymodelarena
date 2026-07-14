#!/usr/bin/env node
import { runControlMatch } from '../src/orchestrator.mjs';

const runs = Number(process.argv[2] ?? 100);
if (!Number.isSafeInteger(runs) || runs < 1 || runs > 10_000) throw new TypeError('Run count must be 1–10000');
const winners = {};
const chains = new Set();
for (let index = 0; index < runs; index += 1) {
  const result = await runControlMatch(`soak-${index}`);
  if (!result.canonicalArtifact.integrity.verified) throw new Error(`Replay failed for seed soak-${index}`);
  chains.add(result.canonicalArtifact.integrity.chainHead);
  winners[result.publicArtifact.winner] = (winners[result.publicArtifact.winner] ?? 0) + 1;
}
console.log(JSON.stringify({ runs, uniqueEventChains: chains.size, winners }, null, 2));
