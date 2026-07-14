# Validation record

Validation date: 2026-07-14

This record applies to ArenaLab v1.0.0 and the repository tree introduced by pull request #1.

## Local release gate

The following commands completed successfully on Node.js 22:

```bash
npm run check
npm run soak -- 500
```

Results:

- 16/16 automated tests passed.
- The deterministic build generated a completed, replay-verified public control artifact.
- 500/500 seeded matches terminated within the configured bounds.
- 500 unique seeds produced 500 unique canonical event-chain heads.
- Every canonical artifact replayed to its recorded final state hash.

## Adversarial coverage

The test suite verifies:

1. canonical JSON stability across object insertion order;
2. same-seed reproducibility and different-seed divergence;
3. simultaneous barrier independence from response arrival order;
4. structural hidden-role isolation;
5. rejection of mechanically illegal actions;
6. event-payload tamper detection;
7. public/private artifact separation and public digest verification;
8. no semantic retry after malformed output;
9. byte-equivalent transport retry inputs;
10. OpenAI Responses strict JSON Schema request construction;
11. Anthropic forced single-tool request construction;
12. Gemini JSON response-schema request construction;
13. prompt-injection isolation for player-authored text;
14. manifest preflight rejection of semantic retries, substitution, and floating aliases;
15. bounded termination and replay across a 25-seed matrix.

## HTTP and browser checks

The local service was exercised through its actual HTTP interface:

- `/` rendered the replay console.
- `/api/health` returned `200` and scripted-control-only provider mode.
- `/api/demo` returned a completed, replay-verified artifact.
- invalid/empty seeds returned a validation error.
- CSP, no-sniff, referrer, permissions, and opener headers were present.

The UI was rendered and inspected at 1440px desktop and 390px mobile widths. There were no JavaScript console errors, six agents rendered, all metrics/replay/transcript/integrity surfaces were present, and neither viewport had horizontal overflow.

A static sink scan found no use of `innerHTML`, `outerHTML`, `document.write`, or `eval` in the public application.

## Remote gate

GitHub Actions `ArenaLab CI` completed successfully for the pull-request head, including:

- clean `npm ci`;
- syntax checks;
- all 16 tests;
- deterministic public-artifact generation;
- a 250-run soak.

The repository also contains pre-existing, repository-wide workflows for the legacy client/server application. On this PR they reported failures in the untouched legacy client TypeScript build and dependency audit. The ArenaLab diff adds no files under `client/` or `server/`; those failures are therefore tracked separately and were not masked by weakening either workflow.

## Release verdict

ArenaLab v1 satisfies its declared vertical-slice release gates: deterministic authoritative transitions, structural visibility control, replay/tamper verification, explicit failure provenance, provider-contract tests, public/private separation, responsive read-only UX, and bounded operation. Live third-party model behavior remains provider-dependent and requires exact model identifiers plus project-specific canary runs before scientific publication.
