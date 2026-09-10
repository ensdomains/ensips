---
title: Token Payment Preferences
description: Ordered payment chain preferences keyed by immutable multichain token snapshots
contributors:
  - premm.eth
ensip:
  created: '2026-09-10'
  status: draft
---

# ENSIP-X: Token Payment Preferences

## Abstract

An ENS name and token alone do not tell a sender which chain the recipient prefers for payment.
This proposal lets recipients publish ordered per-token chain preferences through ENSIP-24 records.
Preferences are keyed by immutable multichain token snapshot hashes, identifying specific token representations without relying on ambiguous symbols.

## Motivation

ENS resolves chain-specific addresses, while ERC-7828 expresses destinations with an explicitly supplied chain.
Neither tells a sender which chain the recipient prefers when the payment starts with a bare ENS name and a token.
Per-token preferences fill this gap, letting senders consider suitable chains in the recipient's preferred order while respecting explicit sender choices.

## Specification

MUST, MUST NOT, SHOULD, and MAY are normative per RFC 2119 and RFC 8174.

### Registry

Token symbols are neither unique nor sufficient to associate deployments across chains; a single contract address identifies only one chain-specific representation.
The registry permits anyone to register an immutable snapshot grouping the representations asserted for a token and derives the `bytes32` fingerprint used in the ENSIP-24 `payment-preference[<multichainTokenHash>]` key.
The canonical registry defined by this ENSIP will be deployed on Ethereum L1/mainnet (chain ID 1); clients MUST identify it by the mainnet address specified here.
**Editorial note: canonical mainnet address pending deployment; replace this note with that address before finalization.**
The current Sepolia (chain ID 11155111) registry at `0xDDB3e5B88F00C7b79f799AB7cafa4b09Ef5f38Cc` is the test/reference deployment, not the canonical production registry.
The canonical registry MUST implement the following nonpayable registration and retrieval ABI and the hashing, validation, and immutability rules below:

```solidity
struct Token {
    string name;
    string symbol;
    bytes[] contracts;
    uint256[] standards;
    uint256[] ids;
    uint256 registrationBlock;
}
function registerMultichainToken(string calldata name, string calldata symbol,
    bytes[] calldata contracts, uint256[] calldata standards, uint256[] calldata ids)
    external returns (bytes32 tokenHash);
function getMultichainToken(bytes32 tokenHash)
    external view returns (Token memory);
event MultichainTokenRegistered(bytes32 indexed multichainTokenHash, string name, string symbol, bytes[] contracts, uint256[] standards, uint256[] ids);
error TokenNotFound(bytes32 tokenHash);
```

The hash MUST be exactly:

```solidity
keccak256(abi.encode(name, symbol, contracts, standards, ids))
```

Encode five arguments of types `(string,string,bytes[],uint256[],uint256[])`, not one tuple or packed data; exclude selector, block, caller, and deployment details. Canonically re-encode decoded arguments; use Keccak-256, not SHA3-256.

Registries MUST allow permissionless, fee-free registration; preserve raw strings (including empty/invalid UTF-8), array order, and duplicates; and require equal, nonzero array lengths. Each index identifies one representation. Registration order is not preference order.

First registration MUST store arguments and `block.number`, emit the complete inputs in `MultichainTokenRegistered`, and return the hash. Only `multichainTokenHash` MUST be indexed; both strings and all arrays MUST remain unindexed and reproduce the exact registration arguments so indexers can reconstruct the snapshot and recompute its hash from the log. The log supplies the registration block; `Token.registrationBlock` MUST retain it in storage and the getter. Duplicates MUST return it without mutation or another event. Existence MUST support block zero; unknown getters MUST revert `TokenNotFound`. Invalid input MUST revert atomically. Registries MUST be immutable, without ownership, administration, upgrades, mutable validation, privileged registration, editing, deletion, replacement, or transfer. Registration requires no external calls.

### Representation validation

Every `contracts` entry MUST be one complete binary [ERC-7930](https://eips.ethereum.org/EIPS/eip-7930) Interoperable Address:

```text
version[2]=0x0001 || chainType[2] || r[1] || reference[r] || a[1] || address[a]
require r > 0, a > 0, totalLength == 6+r+a
if chainType == 0x0000: require r <= 32, reference[0] != 0, a == 20
```

Lengths are unsigned bytes; reject truncation, trailing bytes, chainless entries, and every other version regardless of compatibility bits. EIP-155 references encode positive chain IDs in minimal big-endian form. Other namespaces receive framing validation only; registrants SHOULD use canonical encodings and clients MUST validate namespace semantics.

Standards MUST remain `uint256`, never enums:

| Standard | Meaning | ID | Address |
| --- | --- | --- | --- |
| 0 | Native value transfer | Zero | Exactly 20 zero bytes |
| 20 | ERC-20 | Zero | Nonempty |
| 721, 6909, 1155 | Corresponding ERC | Any uint256 | Nonempty |
| Other nonzero | Opaque extension | Any uint256 | Nonempty |

These rules MUST be enforced. Standard 0 determines native semantics; its zero address is an asset sentinel, never a recipient. Empty-address native registrations are invalid; wrapped assets use their actual contracts. Assigned meanings MUST NOT change. Extensions MUST assign unused permanent values and define address/ID semantics, requiring zero for ID-less standards. Supporting clients MUST enforce these additional rules; unknown standards MUST NOT be routed.

### ENS record and parsing

For the normalized name's node, query [ENSIP-24](./24.md) `data(bytes32 node,string key)`:

```text
payment-preference[<multichainTokenHash>]
value = C1 || C2 || ... || Cn
```

The case-sensitive key MUST contain lowercase `0x` plus exactly 64 hex digits, literal brackets, and no spaces. No text-record or symbol fallback exists. Each `Ci` MUST be a version-1 ERC-7930 Chain Identifier: the framing above with `a=0`, including that byte. The payload has no outer encoding, count, delimiter, or textual hex wrapper. Earlier entries rank higher.

Clients MUST validate the entire payload before use: advance by `6+r`, enforce bounds, version, nonempty reference, zero address length, and EIP-155 reference rules above. Writers MUST use canonical namespace encodings; clients MUST validate supported namespaces. Byte-identical `(chainType,reference)` duplicates and semantic duplicates in supported namespaces MUST be rejected and MUST NOT be written. Unknown namespaces MAY be skipped as unavailable after framing validation; unsupported known chains are also unavailable. Malformation, duplicates, unsupported versions, or exceeded resource limits MUST discard the whole result, never retain a prefix. Clients SHOULD document byte/count and resolution limits.

### Snapshot and client requirements

Hashes fingerprint snapshots, not canonical enduring identities. Metadata, representation, ID, or ordering changes produce distinct snapshots without automatic supersession or aliasing. Clients MUST NOT transfer preferences between hashes. ENS owners must update keys deliberately.

Clients MUST resolve production snapshots from the canonical Ethereum L1 registry identified above, verify its code conforms to this specification, and recompute snapshot hashes. A matching hash from another registry MUST NOT substitute for canonical registration: code or validation rules may differ even though the hash preimage excludes deployment details. Clients MUST authenticate the intended representation independently (including when several share a chain) and match candidate chains to it. Missing canonical snapshots are unresolved.

Clients MUST skip chains absent from the snapshot and SHOULD consider usable chains in preference order subject to sender constraints. Explicit sender choices, including ERC-7828 chains, MUST NOT be overridden. Empty/missing records, unsupported ENSIP-24, resolver errors, and unusable results supply no preference, prohibition, authorization, or default. Clients SHOULD distinguish failures diagnostically. With no suitable candidate, require explicit alternatives or report no route; fallback MUST NOT be presented as recipient preference.

## Backwards Compatibility

Existing resolver profiles and ERC-7828 destinations remain unchanged. ENSIP-24 needs no new method. Existing ENS authorization controls preference publication independently of permissionless registration; absent preferences retain ordinary selection flows.

## Security Considerations

Hashes prove integrity assuming collision resistance, not authenticity or economic equivalence. Symbols, metadata, contracts, and resolver responses are untrusted; clients MUST handle deceptive or invalid display data safely. Immutable snapshots do not freeze remote contracts. Registration blocks describe only the host chain, not remote inspection times.

Before transactions, clients MUST verify chain support, asset authenticity, standard/ID semantics, chain-specific recipients, and transaction safety; never reuse an Ethereum recipient merely because address lengths match. Routes require independent liquidity, bridge, balance, fee, allowance, slippage, and delivery checks as applicable. Preferences authorize neither bridging, approvals, nor asset substitution. Clients SHOULD display destination, recipient, asset/ID, amount, and bridge operations for confirmation and revalidate mutable ENS/routing assumptions before signing. Bound untrusted work; account for stale caches, RPC/resolver integrity, ownership changes, and reorganizations.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
