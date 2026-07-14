# Security policy

## Supported version

ArenaLab v1.x receives security fixes.

## Reporting

Please report suspected hidden-information leaks, credential exposure, event-chain bypasses, public/private artifact boundary failures, or remote-code vulnerabilities privately to the repository owner. Do not include real provider credentials or private research artifacts in a public issue.

## Secret handling

- Never commit `.env` files or API keys.
- Use deployment secret stores and least-privilege provider keys.
- The public Vercel function intentionally does not invoke paid providers.
- Canonical live-run artifacts may contain prompts and model outputs; store them as restricted research data.

## Deployment hardening

The included configuration sets CSP, no-sniff, referrer, permissions, and frame-ancestor controls. Review headers again when adding third-party telemetry, fonts, TTS, or media services; do not weaken CSP globally to make one integration work.
