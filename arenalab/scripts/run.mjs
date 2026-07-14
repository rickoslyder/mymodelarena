#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runControlMatch, runLiveMatch } from '../src/orchestrator.mjs';

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const manifestPath = option('--manifest');
const outputDirectory = resolve(option('--out-dir') ?? 'artifacts');
let result;
if (manifestPath) {
  const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
  result = await runLiveMatch(manifest);
} else {
  result = await runControlMatch(option('--seed') ?? 'arena-demo-001');
}
await mkdir(outputDirectory, { recursive: true });
const publicPath = resolve(outputDirectory, `${result.runId}.public.json`);
const canonicalPath = resolve(outputDirectory, `${result.runId}.canonical.json`);
await writeFile(publicPath, `${JSON.stringify(result.publicArtifact, null, 2)}\n`);
await writeFile(canonicalPath, `${JSON.stringify(result.canonicalArtifact, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({
  runId: result.runId,
  winner: result.publicArtifact.winner,
  rounds: result.publicArtifact.metrics.rounds,
  chainVerified: result.canonicalArtifact.integrity.verified,
  publicPath,
  canonicalPath,
}, null, 2));
