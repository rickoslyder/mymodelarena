# ArenaLab

ArenaLab is a deterministic, replayable platform for multi-model game experiments. This repository contains the production-quality **v1 vertical slice**: a hardened Mafia environment, a provider-neutral agent gateway, scientific/private and broadcast/public artifacts, a replay console, CLI tooling, tests, CI, Docker, and Vercel deployment configuration.

It implements the highest-leverage portion of the broader ArenaLab PRD without pretending the entire multi-game roadmap is already complete.

## What is complete

- Deterministic, event-sourced Mafia kernel for 5–12 agents.
- Seeded role assignment, deterministic tie-breaking, and logical time.
- Frozen simultaneous barriers whose outcomes do not depend on API response order.
- Typed per-agent observations; hidden roles are never passed through a global prompt and then redacted.
- Provider adapters for OpenAI Responses, Anthropic Messages/tool use, Gemini `generateContent`, generic OpenAI-compatible APIs, and deterministic scripted controls.
- Strict structured decisions and game-native action validation.
- Idempotent transport retries only. Semantic failures are never silently resampled.
- Explicit deterministic fallbacks with reason codes and provenance.
- Hash-chained canonical events with pre-state and post-state hashes.
- Exact replay verification and tamper detection.
- Separate canonical/private and public/broadcast artifacts.
- Browser-side public artifact digest verification.
- Responsive read-only replay UI.
- Node test suite, seeded matrix test, soak runner, CI, and deployment hardening.

## Architecture

```text
Experiment manifest
        │ preflight
        ▼
ArenaOrchestrator ─────── AgentGateway ─────── Provider adapters
        │                      │                    │
        │ frozen views         │ raw provenance     │ OpenAI
        │                      │                    │ Anthropic
        │                      │                    │ Gemini
        ▼                      │                    │ compatible APIs
Deterministic Mafia kernel ◄───┘
        │
        ├── canonical event chain + private observations + raw provider artifacts
        │
        └── read-only public projection ──► replay UI / broadcast / publication
```

The production renderer never writes authoritative game state. A public frame must reference canonical event hashes, but it cannot access private observations or provider secrets.

## Quick start

Requires Node.js 22 or newer. There are no runtime dependencies.

```bash
npm test
npm run build
npm start
```

Open `http://localhost:4310`.

Generate both artifacts from the CLI:

```bash
npm run demo -- --seed experiment-001 --out-dir artifacts
```

Verify either artifact:

```bash
npm run verify -- artifacts/<run-id>.canonical.json
npm run verify -- artifacts/<run-id>.public.json
```

Run a larger deterministic reliability matrix:

```bash
npm run soak -- 1000
```

## Artifact boundary

The CLI writes two files:

- `*.canonical.json`: manifest, initial private state, complete event chain, provider attempts, private actions, and replay receipt. Treat this as research data; the CLI creates it with owner-only permissions where the platform supports that mode.
- `*.public.json`: roster, public events, replay frames, aggregate failure metrics, and integrity receipt. This is safe for the web surface and publication after normal project review.

The public API exposes only deterministic scripted control matches. Paid provider execution is deliberately local/server-side and requires an explicit manifest plus environment variables.

## Running live models

1. Copy `.env.example` to `.env` in your own secret manager or shell; do not commit credentials.
2. Create a manifest with six agents. Each non-scripted agent must declare an immutable model version semantic such as `provider_snapshot` or `immutable_digest`.
3. Run:

```bash
OPENAI_API_KEY=... ANTHROPIC_API_KEY=... GEMINI_API_KEY=... \
  npm run demo -- --manifest examples/live-manifest.template.json --out-dir artifacts
```

Supported `provider` values:

- `openai`
- `anthropic`
- `gemini`
- `openai-compatible` (requires a programmatic adapter configuration; see `src/orchestrator.mjs`)
- `scripted`

The included template intentionally contains placeholder model IDs. Replace every placeholder with an exact provider snapshot or immutable deployment identifier before running.

## Experimental invariants

1. **Authoritative state is deterministic.** Provider latency and response arrival order cannot change the transition result.
2. **Visibility is structural.** Every observation is built for one actor from the authoritative state.
3. **A response is bound to an observation.** Barrier ID, actor ID, and observation hash are included in the request ID and submission metadata.
4. **Transport and semantics are separate.** A network retry repeats the same request. A malformed decision is recorded and deterministically replaced; the model is not asked again.
5. **Every event is replayable.** Sequence, logical time, previous-event hash, pre-state hash, post-state hash, and canonical record hash are verified.
6. **Publication is non-authoritative.** The browser receives only a public projection and can independently verify its digest.

## Provider implementation notes

- OpenAI uses the Responses API with strict JSON Schema under `text.format`.
- Anthropic forces exactly one `submit_decision` tool call with an `input_schema`.
- Gemini uses `responseMimeType: application/json` plus `responseSchema`.
- OpenAI-compatible providers use Chat Completions JSON Schema when enabled and must be validated with provider-specific canaries.

No adapter stores authentication headers in artifacts.

## Vercel

The project is Vercel-ready:

- Static UI under `public/`.
- Public functions under `api/`.
- Security headers and function duration in `vercel.json`.
- No environment variables are required for the control deployment.

When deploying this repository as the `arenalab/` subdirectory of a larger GitHub repository, set the Vercel **Root Directory** to `arenalab`.

## Development and release gates

```bash
npm run check
npm run soak -- 250
```

A release is blocked if replay verification fails, any hidden-information test fails, a semantic failure causes a retry, public output includes private event types, provider secrets appear in artifacts, or the web build cannot generate a self-verifying control artifact.

See [Architecture](docs/ARCHITECTURE.md), [Threat model](docs/THREAT_MODEL.md), [Operations](docs/OPERATIONS.md), and [Security policy](SECURITY.md).

## Roadmap boundary

The next major increments from the full PRD are durable run storage, distributed workflow orchestration, WASM game-plugin isolation, a visual experiment builder, hierarchical real-time controllers, broadcast/TTS automation, balanced multi-run analysis, human annotation, and additional games. The v1 interfaces are designed so those additions do not require replacing the deterministic kernel or provider gateway.

## License

MIT
