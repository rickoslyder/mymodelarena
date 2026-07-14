# Operations

## Local release procedure

```bash
npm run check
npm run soak -- 250
npm run demo -- --seed release-candidate --out-dir artifacts
npm run verify -- artifacts/<run-id>.canonical.json
npm run verify -- artifacts/<run-id>.public.json
```

Inspect the UI at desktop and mobile widths. Confirm the public artifact contains no `barrier_committed`, `secret_resolved`, `roles_assigned`, prompt, provider response, or credential fields.

## Failure taxonomy

- `transport`: network, retryable timeout/status, or provider infrastructure failure.
- `semantic`: malformed structured output or game-illegal action.
- `timed_out`: request exceeded the manifest decision deadline.
- `refused`: provider explicitly refused the request.
- `unavailable`: authentication, exhausted transport attempts, or provider outage.
- `cancelled`: operator or upstream cancellation.

Each failure is attached to the actor submission. A deterministic fallback is visible in aggregate metrics and canonical provenance.

## Incident response

1. Stop publication; do not edit canonical artifacts.
2. Preserve manifest, canonical artifact, environment/version metadata, and deployment logs.
3. Re-run `scripts/verify.mjs` against the preserved artifact.
4. Distinguish kernel-integrity failure from provider/transport failure.
5. If the event chain fails, invalidate the run and investigate before any rerun.
6. If a provider failed, retain the run unless the preregistered exclusion policy says otherwise; never silently substitute a model.
7. Branch a new manifest for any changed model, policy, adapter, rule, or retry setting.

## SLOs for this vertical slice

- 100% exact replay verification for published runs.
- 0 known hidden-information leaks.
- 0 semantic retries.
- 0 provider credentials in stored artifacts.
- Public control API p95 below the hosting function timeout.
- All supported seeds terminate within the bounded round/barrier limits.
