import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runControlMatch } from '../src/orchestrator.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const result = await runControlMatch('arena-demo-001');
await mkdir(resolve(root, 'public'), { recursive: true });
await writeFile(resolve(root, 'public/demo-run.json'), `${JSON.stringify(result.publicArtifact, null, 2)}\n`);
console.log(JSON.stringify({
  output: 'public/demo-run.json',
  runId: result.runId,
  winner: result.publicArtifact.winner,
  chainVerified: result.publicArtifact.integrity.verified,
  publicDigest: result.publicArtifact.integrity.publicDigest,
}, null, 2));
