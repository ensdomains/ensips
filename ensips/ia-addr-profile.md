---
title: Interoperable Address Profile
description: Use Interoperable Address instead of coinType for addr()
contributors: 
    - premm.eth
    - raffy.eth
ensip:
  created: "2026-03-18"
  status: draft
---

# ENSIP-X: Interoperable Address Profile

## Abstract

This ENSIP extends `addr()` to use the [Interoperable Address](https://eips.ethereum.org/EIPS/eip-7930) (or its chain-identifier component) **instead of coinType** when specifying the chain. Only `addr()` uses coinType. This profile may be invoked via direct resolver calls, ENSIP-10 `resolve()`, CCIP-Read, gateway APIs, or any other resolution mechanism.

## Motivation

Existing resolver profiles such as `addr(bytes32 node, uint256 coinType)` (ENSIP-9) use a `uint256` coin type to identify the target chain when resolving address records. This ENSIP uses the Interoperable Address (ERC-7930) instead: the chain-identifier replaces coinType as the chain selector.

It is useful to define resolver profiles that:

- Extend `addr()` to use Interoperable Address (chain-identifier) instead of coinType for chain selection.
- Work with any resolution mechanism: direct calls, ENSIP-10, gateways, CCIP-Read, etc.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Scope and Invocation Model

The profile defined in this document may be invoked through any resolution mechanism, including but not limited to:

- **Direct resolver calls**: Call the profile function on the resolver contract with the full signature (including `node`).
- **ENSIP-10 ExtendedResolver**: When using `resolve(bytes name, bytes data)`, the `data` parameter is ABI-encoded calldata for the addr profile.
- **CCIP-Read, gateway APIs, and other mechanisms**: As defined by those specifications.

The same function signatures and calldata format apply across all mechanisms.

### Terminology

- **chain-identifier**: An [Interoperable Address](https://eips.ethereum.org/EIPS/eip-7930) with a zero-length target address. Per ERC-7930, the binary format is:

```
┌─────────┬───────────┬──────────────────────┬────────────────┬───────────────┐
│ Version │ ChainType │ ChainReferenceLength │ ChainReference │ AddressLength │
└─────────┴───────────┴──────────────────────┴────────────────┴───────────────┘
```

  The `chain-identifier` MUST have `AddressLength` set to zero (no Address bytes). It encodes the target chain only. Example 4 in ERC-7930 illustrates this: a Solana mainnet network with no address.

### Profile: `addr(bytes32 node, bytes chain-identifier) -> bytes`

This profile resolves an ENS name to target **address** bytes for a specific chain. It extends the existing `addr(bytes32 node, uint256 coinType)` profile (ENSIP-9): instead of `coinType`, the chain is specified by `chain-identifier` (the ERC-7930 Interoperable Address with zero-length target).

ABI signature:

```solidity
function addr(bytes32 node, bytes calldata chainIdentifier) external view returns (bytes memory);
```

When invoked:

- The resolver MUST return the target address bytes for the given `node` and `chain-identifier`.
- If no address is set for the given `node` and `chain-identifier`, the resolver MUST return an empty bytes array.

The returned bytes are the **Address bytes** for the target chain. The address MUST be in the CAIP-350 binary format, which is already standard for EVM addresses. Clients can construct a full ERC-7930 Interoperable Address by taking `chain-identifier` (which contains a zero-length address) and replacing the zero-length with the correct length of the returned bytes, then appending the returned bytes.

### Consistency Requirements

If a resolver supports both `addr(node, chainIdentifier)` (this profile) and `addr(node)` or `addr(node, coinType)` (ENSIP-1/9), it MUST ensure that records are consistent where a natural mapping exists.

### Examples

**Direct resolver call:**

```text
resolver.addr(node, chainIdentifier)
```

**Via ENSIP-10:**

```text
node = namehash("alice.eth")
resolver.resolve(dnsencode("alice.eth"), abi.encodeWithSignature("addr(bytes32,bytes)", node, chainIdentifier))
```

## Rationale

Interoperable Addresses are a new Ethereum-wide standard (ERC-7930) that solves the same problem ENS coinType (ENSIP-11) solves: creating a unique identifier for every chain without conflicts. Using Interoperable Addresses for ENS resolution makes ENS compatible with the wider ecosystem that is adopting this standard.

## Backwards Compatibility

This profile extends rather than replaces existing profiles. Existing ENS clients and resolvers can continue to use `addr(node)` and `addr(node, coinType)` (uint256) unchanged. Resolvers that implement this profile add support for `addr(node, bytes)`.

## Security Considerations

- Clients MUST treat empty bytes / empty string as "no record set".
- Implementers SHOULD ensure that `chain-identifier` is validated as an ERC-7930 interoperable identifier with a zero-length address to avoid ambiguous resolution.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
