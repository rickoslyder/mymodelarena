#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyEventChain } from '../src/core.mjs';
import { reduceMafiaEvent } from '../src/mafia.mjs';
import { verifyPublicDigest } from '../src/orchestrator.mjs';

const file = process.argv[2];
if (!file) throw new Error('Usage: npm run verify -- <artifact.json>');
const artifact = JSON.parse(await readFile(resolve(file), 'utf8'));
if (artifact.events && artifact.initialState) {
  const verification = verifyEventChain(artifact.runId, artifact.initialState, artifact.events, reduceMafiaEvent);
  const expected = artifact.integrity;
  const valid = verification.verified
    && verification.chainHead === expected.chainHead
    && verification.finalStateHash === expected.finalStateHash;
  console.log(JSON.stringify({ valid, ...verification }, null, 2));
  if (!valid) process.exitCode = 1;
} else {
  const valid = verifyPublicDigest(artifact) && artifact.integrity.verified;
  console.log(JSON.stringify({ valid, runId: artifact.runId, publicDigest: artifact.integrity.publicDigest }, null, 2));
  if (!valid) process.exitCode = 1;
}
