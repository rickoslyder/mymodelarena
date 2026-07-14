# Contributing

1. Create a focused branch.
2. Preserve deterministic behavior: never introduce wall-clock reads, unordered iteration, network timing, or ambient randomness into kernel transitions.
3. Add a failing test for every kernel, visibility, retry, or artifact-boundary bug.
4. Run `npm run check` and `npm run soak -- 250`.
5. Document any manifest, event, decision, or artifact schema change.

A change to game rules, provider normalization, visibility, fallback behavior, or model policy is experimentally material and must be versioned rather than silently substituted.
