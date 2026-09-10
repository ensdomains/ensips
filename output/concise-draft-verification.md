# Concise ENSIP verification

Task: `correct-native-token-zero-address` (continued; no competing task or draft).

Rewrote the existing `ensips/x.md` in place from baseline `e7331fb7ec527428b0d2c74a87dfcce2bc9b2e17`.
Whole-file whitespace-delimited word counts, including frontmatter, headings, code and tables (`wc -w` / Python `str.split`): **2,894 → 1,010 words**, **34.9% retained**, **65.1% removed**. Target was approximately one-third.

Removed tutorial examples, command walkthroughs, and repeated rationale. Consolidated registry validation into framing pseudocode and a standard/ID/address table; consolidated parsing, routing, and security requirements. Retained the repository-required Motivation heading.

Verification:

- `pnpm --dir app build`: passed; `app/dist/ensip/x.html` generated. Existing outdated Browserslist data warning is nonfatal.
- `python3 output/check-payment-vectors.py`: passed; independent five-argument ABI and Keccak checks agree with cast; 24 malformed/duplicate payloads rejected, plus both native full-address preference rejections. Existing executable vectors remain available despite removing tutorial examples from the ENSIP.
- `git diff --check`: passed.
- Compared the concise specification against corrected `MultichainTokenRegistry.sol` at registry HEAD `5d251c79f89daab8fcca7eb1dc85630e60d87b25`: ABI tuple order, exact hash preimage, raw/order/duplicate preservation, array lengths, native 20-zero-byte address and ID zero, ERC-20 ID zero, opaque future standards, strict v1 framing, EIP-155 canonical references/address lengths, first-event/block behavior, duplicate no-op, block-zero existence and unknown getter all retained.
- Reviewed preference requirements: exact ENSIP-24 key; concatenated empty-address Chain Identifiers; complete-record validation; byte/semantic duplicates; unknown namespace versus unknown version behavior; ordered unavailable-chain skipping; explicit-choice precedence; failure/empty behavior; no silent hash aliasing; client authentication and chain-specific recipients; backwards compatibility and focused security retained.

Only documentation changed. No push, publication, deployment, manager restart, or agent restart.
