# Threat model

## Protected assets

- Hidden roles, private investigations, team messages, and unreleased actions.
- Provider credentials and administrative configuration.
- Canonical event order, payloads, state hashes, and experiment manifest.
- Model identity/version provenance.
- Publication integrity and operator-intervention records.

## Primary threats and controls

| Threat | Control |
|---|---|
| Hidden-state prompt leakage | Per-agent view construction; global state is never sent to a model; structural tests. |
| Arrival-order bias | Frozen barriers and sorted atomic commitment. |
| Retry-until-good behavior | Semantic retry count fixed at zero; invalid output becomes an explicit fallback. |
| Silent model substitution | Manifest preflight requires substitution to be forbidden. |
| Floating model aliases | Non-scripted agents require immutable version semantics. |
| Prompt injection by another player | Player text is serialized inside an untrusted-data delimiter; system instructions are compiled separately. |
| Secret exfiltration through the public UI | Public artifact excludes research/private/team events and raw provider artifacts. |
| Event editing or reordering | Hash chain plus pre/post state hashes and exact replay. |
| Provider key leakage | Credentials exist only in request headers; stored headers are allow-listed and redacted. |
| Paid API abuse | Public endpoint runs only local scripted controls; live-provider execution is CLI/server-side only. |
| Cross-site script injection | UI renders all experiment content with `textContent`; CSP disallows inline scripts and third-party origins. |
| Resource exhaustion | Seed length, roster size, rounds, barriers, output length, retry count, and request deadlines are bounded. |

## Residual risks

Provider-side model drift cannot be eliminated; exact snapshots, resolved model IDs, adapter versions, and canary runs reduce ambiguity. A provider can still behave nondeterministically under the same nominal configuration. ArenaLab records this as experimental variability rather than attempting to conceal it.

The in-memory v1 web function is intended for deterministic control runs, not durable research custody. Canonical live-run artifacts should be written to controlled storage with access policy, retention, and checksums before production research use.
