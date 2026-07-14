# Architecture

## Trust boundaries

ArenaLab separates four responsibilities:

1. **Kernel:** owns authoritative game state, legality, seeded randomness, logical time, visibility, terminal outcomes, and canonical events.
2. **Agent gateway:** owns provider request construction, cancellation, transport retry policy, structured-output normalization, and raw attempt provenance.
3. **Orchestrator:** freezes barriers, dispatches actors concurrently, binds results to observation hashes, applies deterministic fallbacks, and advances the kernel.
4. **Production projection:** consumes public committed events and renders replay frames. It has no write path into the kernel.

## Canonical transition

Every event satisfies:

```text
state(t + 1) = reduce(state(t), event(t))
```

The event contains:

- run and event identifiers;
- contiguous sequence and monotonically increasing logical time;
- event type, actor, visibility, audience, and payload;
- previous canonical event hash;
- pre-transition and post-transition state hashes;
- producer provenance;
- canonical event hash.

Wall time is optional and excluded from the canonical event hash. This allows exact deterministic replay while retaining operational timestamps where required.

## Simultaneous barriers

A barrier is opened from one immutable state hash. The actor set and every observation hash are fixed at that point. Provider calls may complete in any order, but the kernel receives a sorted, complete set of submissions in one commitment event. Missing or invalid submissions are converted to deterministic fallbacks before commitment.

No provider response mutates state directly.

## Information flow

`buildAgentView(state, actorId)` is the only path from global state to a model observation. The view includes:

- the actor's own role;
- Mafia teammate identities only when the actor is Mafia;
- that actor's completed investigations;
- public roster, alive state, eliminations, and transcript;
- the exact legal action contract.

The global state object is never embedded in a prompt. Automated tests walk the observation structure and reject hidden role exposure.

## Provider neutrality

Adapters preserve provider-specific capability rather than pretending every API is identical. All adapters return one normalized raw result with:

- requested and resolved model identifiers;
- adapter version;
- provider request/response identifiers;
- exact request and response bodies, excluding credentials;
- safe response headers;
- usage accounting;
- normalized structured output.

The gateway retries only retryable transport failures. It never retries a semantically invalid response.

## Artifact model

The canonical artifact is the scientific source of truth. The public artifact is generated only after replay verification succeeds. Public events retain canonical event hashes, creating a provenance bridge without revealing secret event payloads.

The browser verifies a second SHA-256 digest covering the complete public artifact with its digest field set to `null` during hashing.

## Extensibility

The v1 code keeps game rules behind the same conceptual interface needed for future plugins:

- initial state;
- required actors/barrier;
- observation projection;
- legal action schema and validation;
- deterministic fallback;
- resolution;
- reducer;
- terminal outcome;
- public projection.

A future WASM plugin boundary can preserve these contracts while moving the kernel implementation to Rust.
