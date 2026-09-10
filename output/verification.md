# ENSIP draft verification

Task: ens-payment-preferences-registry.

- Repository: `/Users/nxt3d/projects/ensips`.
- Canonical remote: `upstream`, `https://github.com/ensdomains/ensips.git`.
- Live `git ls-remote --symref upstream HEAD` identified `refs/heads/master`, not `main`.
- Freshly fetched base: `d5b4904c725e096eb2cf5f820fd0e2b834bec371`.
- New worktree: `/Users/nxt3d/projects/ensips-payment-preferences-snapshots`.
- New branch: `ensip/payment-preferences-snapshots`.
- Draft: `ensips/x.md`, using repository convention for an unassigned ENSIP.
- Existing `master`, `payment-preferences`, and all prior worktrees preserved. Original checkout had untracked `.claude/` and `reference/`; neither was modified.

Validation:

- `pnpm install --frozen-lockfile` and `pnpm build` in `app/`: passed; rendered `app/dist/ensip/x.html`.
- `git diff --check`: passed.
- `python3 output/check-payment-vectors.py`: passed. Five-argument ABI encoding independently compared between `eth_abi` and Foundry `cast`; Keccak compared between `eth_hash` and `cast`. The native Ether two-chain vector uses 704 bytes and hashes to `0xf332c247f877c8ea23f819db95b69763e5b0fea0939486567189146115119ce4`.
- Binary reference checks: correct examples, empty list, opaque namespace framing; 24 malformed/duplicate payloads rejected, including malformed suffixes and both future-version high-bit classes.
- Seniordev source/spec conformance review: no correctness blockers. Report: `/Users/nxt3d/projects/multichain-token-registry/output/conformance-review.md`.

The small Python parser is a framing/example checker, not a production wallet router. It intentionally does not implement arbitrary namespace semantic alias detection or external route verification.

Primary references checked: ERC-7930, ERC-7828, EIP-155 CAIP-350 profile, and canonical mainline ENSIP-24. No GitHub repository, branch, or pull request was published.
