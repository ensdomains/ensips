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

This proposal defines an ENSIP-24 data record through which an ENS name publishes an ordered list of preferred payment chains for a particular token snapshot. A permissionless, immutable, admin-free registry stores token metadata and chain-specific asset representations under a deterministic `multichainTokenHash`. The record key includes this hash rather than a token symbol. The value directly concatenates ERC-7930 Chain Identifiers, in preference order.

## Motivation

A sender who knows only `name.eth` and the token to send still needs to select a destination chain. ENS may resolve a different recipient address on each chain. Address resolution supplies an address after a chain is chosen; it does not express which chain the recipient prefers. [ERC-7828](https://eips.ethereum.org/EIPS/eip-7828) allows an explicit destination such as `name.eth@ethereum`, but that requires a chain choice already to have been made.

Recipients should be able to express, for example:

- USDC: Base first, Ethereum second.
- ETH: Ethereum first, Arbitrum second.

Token symbols are neither unique nor sufficient to authenticate an asset. The preference key therefore identifies an exact snapshot of metadata and asset representations. Registrations make no assertion that listed contracts are authentic, equivalent, redeemable, or controlled by the same issuer.

## Specification

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL are to be interpreted as described in RFC 2119 and RFC 8174.

### Token snapshot interface

A conforming registry MUST expose the following ABI. The Solidity struct determines the getter's tuple component order; it is not the registration hash preimage.

```solidity
struct Token {
    string name;
    string symbol;
    bytes[] contracts;
    uint256[] standards;
    uint256[] ids;
    uint256 registrationBlock;
}

function registerMultichainToken(
    string calldata name,
    string calldata symbol,
    bytes[] calldata contracts,
    uint256[] calldata standards,
    uint256[] calldata ids
) external returns (bytes32 multichainTokenHash);

function getMultichainToken(bytes32 multichainTokenHash)
    external view returns (Token memory token);

event MultichainTokenRegistered(
    bytes32 indexed multichainTokenHash,
    uint256 registrationBlock
);
```

Index `i` in the three arrays describes one asset representation: an interoperable address, a token standard identifier, and a token ID. All three array lengths MUST be equal and greater than zero. A token with one representation uses arrays of length one. Array order is significant to the fingerprint but MUST NOT be interpreted as payment preference order. Repeated entries are allowed and retained exactly; this registry does not normalize or deduplicate snapshots. Multiple representations on one chain are possible. A client MUST independently select and authenticate the intended representation rather than assuming the first is correct.

`name` and `symbol` are untrusted descriptive strings, not lookup keys. Empty strings are allowed. Their exact ABI string bytes MUST be retained without trimming, case folding, Unicode normalization, or other transformation. The registry does not validate UTF-8; clients MUST handle invalid or deceptive display data safely.

### Hashing and immutability

For valid arguments the hash MUST be exactly:

```solidity
keccak256(abi.encode(name, symbol, contracts, standards, ids))
```

The ABI types, in order, are `(string,string,bytes[],uint256[],uint256[])`. The preimage is the standard Solidity ABI encoding of these **five arguments**, including dynamic offsets, lengths, and padding. It is not packed encoding, JSON, UTF-8 hexadecimal text, calldata with a function selector, or the encoding of a single dynamic tuple argument. It excludes `registrationBlock`, caller, registry address, registry chain ID, and transaction details. ABI decoding followed by canonical re-encoding defines the fingerprint even if incoming calldata has a different decodable layout. Keccak-256 is used, not NIST SHA3-256.

The first successful registration MUST store the arguments exactly, store `block.number` as `registrationBlock`, emit `MultichainTokenRegistered`, and return the hash. Anyone MAY register, without payment to the registry or authorization. Registry methods are nonpayable. A subsequent registration with the same hash MUST return that hash without changing any snapshot field or emitting another registration event. First-registration block numbers may differ between registry deployments for the same hash. Existence MUST be tracked independently of a nonzero block number, so registration at block zero is supported. An unknown getter hash MUST revert with `TokenNotFound(bytes32)`.

A registry MUST NOT permit editing, deleting, replacing, or transferring a registration. It MUST NOT have an owner, administrator, upgrade mechanism, mutable validation policy, or privileged registration path. Invalid registration arguments MUST revert atomically before storage or events change. No external token call or cross-chain query is needed for registration. As with other content-addressed systems, the binding assumes Keccak-256 collision resistance.

The hash is a **point-in-time fingerprint, not a canonical enduring token identity**. A new deployment, migration, added chain, corrected metadata, reordered list, or changed ID creates another snapshot and usually another hash. No hash is automatically superseded or aliased. Existing ENS records remain keyed to their original snapshot until the ENS record owner updates them. Clients MUST NOT silently apply a preference for one hash to another hash, even if both have the same symbol.

This proposal does not designate a global registry address or registry host chain. Clients MUST configure which immutable registry deployment(s) they query, verify the implementation, and recompute returned snapshot hashes. Identical arguments have identical hashes across deployments; availability and registration block are deployment-specific. A missing snapshot is unresolved, not proof of invalidity or authenticity. A testnet reference deployment is not a production trust anchor.

### Stable token standard identifiers and native assets

The ABI type of every standard identifier is permanently `uint256`; implementations MUST NOT use a Solidity enum in this interface or hash preimage. The following values are assigned:

| Value | Meaning | ID rule | Address rule |
| --- | --- | --- | --- |
| `0` | Native asset used for the chain's native value transfers | MUST be zero | ERC-7930 Interoperable Address: 20-byte all-zero address |
| `20` | ERC-20 | MUST be zero | Nonempty contract address |
| `721` | ERC-721 | Token ID, including zero | Nonempty contract address |
| `6909` | ERC-6909 | Token ID, including zero | Nonempty contract address |
| `1155` | ERC-1155 | Token ID, including zero | Nonempty contract address |

Standard `0` is an explicit extension defined by this proposal, not an ERC number. Although the array is named `contracts`, its native entries use a chain-specific zero address as the native-asset sentinel. Native ETH on Ethereum is `(0x000100000101140000000000000000000000000000000000000000, 0, 0)`; native ETH on Arbitrum One is `(0x0001000002a4b1140000000000000000000000000000000000000000, 0, 0)`. Native entries MUST contain exactly 20 all-zero address bytes and standard `0`; an empty address component is invalid for registration. The zero address is an asset sentinel, not a payment recipient. Wrapped ETH is a separate ERC-20 representation with its actual contract address, standard `20`, and ID `0`. Grouping different chains' native currencies in one snapshot does not establish economic equivalence.

The five assigned meanings MUST NOT be redefined. Other nonzero `uint256` values are reserved for extensions and accepted by the registry as opaque standards with a nonempty address and any `uint256` ID. A future specification MUST assign an unused permanent value and define its address and ID semantics; numeric resemblance to another ERC alone is not an assignment. Future standards without token IDs MUST require ID zero. Since an immutable registry cannot recognize later assignments, clients supporting an extension MUST enforce its additional validation, including the zero-ID rule. Clients MUST NOT route through unknown standard identifiers or infer token methods from them. New assignments do not change existing encodings or hashes.

### Registration address validation

Each element of `contracts` MUST be one complete binary [ERC-7930](https://eips.ethereum.org/EIPS/eip-7930) version 1 Interoperable Address, with an explicit chain reference and nonempty address component. Ordinary 20-byte EVM addresses MUST be wrapped in this representation; raw EVM addresses are not accepted.

The registry MUST enforce:

1. At least six bytes, with the first two bytes exactly `0x0001`.
2. Two chain-type bytes, followed by a one-byte chain-reference length `r` greater than zero, then exactly `r` chain-reference bytes.
3. One address-length byte `a` at offset `5 + r`, followed by exactly `a` address bytes. Total element length MUST equal `6 + r + a`; truncation and trailing bytes are invalid.
4. For native entries in this registry profile, `a` MUST be 20, all 20 address bytes MUST be zero, and the ID MUST be zero. For every other standard, `a` MUST be greater than zero. For ERC-20 the ID MUST also be zero.
5. For EIP-155 chain type `0x0000`, `r` MUST be between 1 and 32 inclusive and the first reference byte MUST be nonzero. This profile uses positive chain IDs in minimal big-endian encoding. All EIP-155 addresses MUST be exactly 20 bytes. Chain ID zero, chainless values, leading-zero references, and other EVM address lengths are outside this registry profile.

Other chain types receive envelope validation and the native/non-native address rules above. Registrants SHOULD supply canonical address and reference encodings for their namespace; clients MUST validate the applicable namespace profile before use. The registry does not validate the existence of chains, bytecode, supported interfaces, issuer claims, or economic equivalence. A structurally valid zero contract address can be stored but is not thereby safe to use. Unknown ERC-7930 versions MUST be rejected, even if their high version bit indicates compatible framing. Supporting a new binary version requires a separately specified registry implementation; this registry cannot be upgraded.

### ENSIP-24 record

For a normalized ENS name's node, read [`data(bytes32 node, string key)` from ENSIP-24](./24.md), using exactly:

```text
payment-preference[<multichainTokenHash>]
```

`<multichainTokenHash>` MUST be lowercase hexadecimal with a `0x` prefix and exactly 64 hexadecimal digits, including leading zeroes. The square brackets are literal; there are no spaces. The key is case-sensitive. It is a data record, not a text record. No symbol-keyed fallback is defined.

Registration addresses and preference values have different roles: native asset entries carry a 20-byte zero address, while preference entries carry no address.

The returned `bytes` payload is `C1 || C2 || ... || Cn`, where each `Ci` is a complete ERC-7930 version 1 Chain Identifier, including its zero address-length byte. There is no outer array, ABI encoding, count, delimiter, length prefix, or textual hex wrapper inside the payload. The first chain is the first preference, the second is the second preference, and so on. Writers MUST produce canonical values under the applicable namespace profile.

### Preference parsing and validation

A client MUST validate the entire payload before using any preference. With cursor `p = 0` and byte length `L`, repeat until `p == L`:

1. Require at least six remaining bytes. Require version `0x0001`; any other version makes the whole record unsupported. A client MUST NOT guess future layouts or skip unknown versions, irrespective of the version's compatibility bit.
2. Read the chain type at `p + 2` and one-byte reference length `r` at `p + 4`. Require `r > 0` and at least `6 + r` remaining bytes.
3. Require the address-length byte at `p + 5 + r` to be zero. The entry occupies exactly `6 + r` bytes. A nonempty address makes the record invalid; it is not a recipient address record.
4. For EIP-155, require `1 <= r <= 32` and a nonzero first reference byte. For other supported namespaces, validate canonical chain-reference serialization according to that namespace's profile.
5. Reject duplicate chain identifiers. Byte-identical `(chain type, chain reference)` pairs are duplicates. If a supported namespace allows distinct encodings identifying the same chain, a client MUST also reject those semantic duplicates. Writers MUST NOT include either kind.
6. Append the entry and advance `p` by `6 + r`.

An unknown chain type in a correctly framed version 1 entry MAY be retained as an opaque unavailable preference and skipped during routing. A client MUST NOT send to that chain until it understands and validates the namespace. Unknown chain types do not authorize interpreting their reference as an EVM chain ID. A known chain that the wallet does not support is likewise unavailable, not malformed. Encountering malformed bytes, a duplicate, or an unsupported version anywhere MUST discard the entire preference result, including an otherwise valid prefix. No partial-prefix fallback is permitted. Implementations SHOULD impose documented byte/count and resolution-resource limits; exceeding a limit MUST yield an unusable result, never truncation to a usable prefix.

### Empty, missing, and client routing behavior

A zero-length payload means no preference is expressed. An absent record, unsupported ENSIP-24 interface, resolver failure, unknown snapshot, malformed payload, unsupported binary version, or resource-limit failure supplies no usable preference. Clients SHOULD distinguish these states in diagnostics. None authorizes a transfer, means that all payments are forbidden, or declares a default chain. Clients MAY offer their normal explicit chain-selection flow, but MUST NOT silently portray a fallback as the recipient's preference.

Clients MUST verify the snapshot hash, interpret supported standard identifiers, and match candidate chains to representations in that snapshot. A listed chain absent from the snapshot is unavailable for that snapshot and MUST be skipped; registration order is irrelevant. Clients SHOULD consider usable chains in record order while accounting for sender constraints and explicit choices. If no suitable candidate remains, require an explicit alternative or report no supported route. Preferences MUST NOT override an explicit chain in an ERC-7828 destination or other explicit sender instruction.

Before proposing or executing a transaction, a client MUST independently check chain support, token contract authenticity, token ID and standard semantics, recipient resolution on the chosen chain, and transaction safety. It MUST NOT reuse an Ethereum recipient address on another chain merely because address lengths match. Liquidity, bridging availability and trust assumptions, balances, fees, allowances, slippage, and delivery guarantees require independent checks appropriate to the proposed route. This record does not authorize bridging, spending approvals, or selecting a different asset. The recipient's preference is one routing input, not a guarantee of the best, cheapest, available, or safe route. The final destination chain, resolved recipient, exact asset and ID, amount, and any bridge operation SHOULD be visible for confirmation. Clients SHOULD revalidate mutable ENS resolution and routing assumptions before signing.

### Examples

The following bytes illustrate payment preferences, not token-authenticity endorsements:

| Chain | Chain Identifier |
| --- | --- |
| Ethereum (1) | `0x00010000010100` |
| Base (8453) | `0x0001000002210500` |
| Arbitrum One (42161) | `0x0001000002a4b100` |

For an independently authenticated USDC snapshot covering Base and Ethereum, the data value for Base then Ethereum is:

```text
0x000100000221050000010000010100
```

For `name = "Ether"`, `symbol = "ETH"`, `contracts = [hex"000100000101140000000000000000000000000000000000000000", hex"0001000002a4b1140000000000000000000000000000000000000000"]`, `standards = [uint256(0), uint256(0)]`, and `ids = [uint256(0), uint256(0)]`, calculate the hash of the five arguments and use its lowercase hex in the key. The value for Ethereum then Arbitrum is:

```text
0x000100000101000001000002a4b100
```

The following Foundry `cast` commands reproduce the hash without a transaction. The `f` signature supplies ABI types only; `cast abi-encode` excludes its selector.

```sh
encoded=$(cast abi-encode 'f(string,string,bytes[],uint256[],uint256[])' \
  Ether ETH '[0x000100000101140000000000000000000000000000000000000000,0x0001000002a4b1140000000000000000000000000000000000000000]' '[0,0]' '[0,0]')
cast keccak "$encoded"
```

The resulting hash is `0x548bc6fa7546b316406d484a72d6376ec9d6e7475f45624553fb5a35778868ca`; its key is `payment-preference[0x548bc6fa7546b316406d484a72d6376ec9d6e7475f45624553fb5a35778868ca]`. The ABI preimage is 704 bytes.

A single ERC-20 on Ethereum at illustrative address `0x1111111111111111111111111111111111111111` uses `contracts = [hex"000100000101141111111111111111111111111111111111111111"]`, `standards = [uint256(20)]`, and `ids = [uint256(0)]`. A bare address, empty arrays, or ID 1 for that ERC-20 is invalid.

## Rationale

A snapshot fingerprint avoids symbol collisions without assigning an administrator the power to decide enduring token identity. Including names and symbols binds the exact advertised metadata; changing them deliberately changes the fingerprint. Ordered registrations remain distinct snapshots, avoiding expensive on-chain sorting and disputed canonical token groupings.

Fixed-width numeric standards permit future assignments without enum-width or ordinal changes. An explicit native standard distinguishes native value from ERC-20 transfers while the chain-specific zero address supplies the native-asset sentinel. Standard `0` determines native transfer semantics; the zero address alone does not. Version 1 envelope validation makes the immutable implementation small, while clients remain responsible for namespace semantics and authenticity.

ENSIP-24 carries binary preferences efficiently. Self-delimiting ERC-7930 Chain Identifiers make an additional list encoding unnecessary. Rejecting the full record on parse failure prevents a malformed suffix from silently changing the apparent preference order.

## Backwards Compatibility

Existing ENS address, text, and other resolver profiles are unchanged. Resolvers implementing ENSIP-24 can store this record without a new method. Names without the record continue through ordinary client selection flows. ERC-7828 explicit chain destinations retain their meaning. Snapshot registration is independent of ENS ownership; only the existing ENS record authorization controls publication of a name's preferences.

## Security Considerations

Registration is permissionless and has no issuer verification. Attackers can register convincing names and symbols, malicious contracts, wrong IDs, or unrelated assets in one snapshot. Recomputing a hash proves content integrity, not authenticity. Clients need independent asset trust sources and must not choose a snapshot by symbol alone. Immutable snapshots can reference upgradeable or compromised token contracts; immutability of this registry does not freeze remote code or economics.

ENS owners can change preferences or recipient records, and cached data can become stale. Resolver and RPC integrity, chain reorganizations, and ENS ownership changes affect routing assumptions. `registrationBlock` belongs to the registry's host chain and is neither a timestamp nor evidence that remote contracts were inspected at that block. Duplicate registration cannot refresh it.

All metadata and remote resolution responses are untrusted input. Clients should bound memory, rendering, RPC work, and parsing, reject unsafe routes, and explain unavailable preferences. A preferred chain can have insufficient liquidity, unsupported recipients, malicious bridges, or unsafe token behavior. Neither registry registration nor preference publication guarantees successful payment or permits bypassing transaction checks.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
