---
title: Interoperable Address Resolver Profiles
description: ENSIP-10 extended resolver profiles for ERC-7930 interoperable identifiers
contributors: 
    - premm.eth
ensip:
  created: "2026-01-16"
  status: draft
---

# ENSIP-X: Interoperable Address Resolver Profiles

## Abstract

This ENSIP defines three resolver profiles for resolving interoperable identifiers and data for ENS names using ENSIP-10 ExtendedResolver `resolve()` calls. These profiles are designed to be used as ABI-encoded calldata passed to `resolve(bytes name, bytes data)` and intentionally omit the `node` parameter.

## Motivation

Existing resolver profiles such as `addr()` (ENSIP-1/9) and `data()` (ENSIP-24) are commonly called via ENSIP-10 extended resolution. However, the calldata for these profiles includes a `node` parameter (the namehash), even though ENSIP-10 already supplies the DNS-encoded name and allows the resolver to compute the node internally.

For interoperable, cross-chain resolution (ERC-7930), it is useful to define resolver profiles that:

- Avoid repeating the `node` in calldata when using ENSIP-10.
- Provide a standard way to request chain-specific target addresses using ERC-7930 interoperable identifiers.
- Provide a standard way to request arbitrary bytes data keyed by strings, consistent with ENSIP-24.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Scope and Invocation Model (ENSIP-10)

The profiles defined in this document are intended to be invoked through ENSIP-10 `resolve(bytes name, bytes data)`. In this model:

- `name` is the DNS-encoded ENS name being resolved.
- `data` is ABI-encoded calldata for one of the profile functions defined below.

Because the profiles below do not include a `node` parameter, they are **only well-defined** when used via ENSIP-10 `resolve()`.

Resolvers implementing these profiles MUST implement the ENSIP-10 ExtendedResolver interface and MUST follow ENSIP-10's requirements for returning ABI-encoded return data (or reverting if a requested function is not supported).

### Terminology

- **chain-identifier**: The `chain-identifier` parameter is an ERC-7930 Interoperable Address used to identify the target chain. For the purposes of this ENSIP, the `chain-identifier` MUST encode the chain information and MUST have a zero-length target address (including the zero-length byte and no address bytes).
- **Target address bytes**: The raw address bytes for the requested chain, with no length prefix.

### Profile: `iAddress(chain-identifier) -> bytes`

This profile resolves an ENS name to target address bytes for a specific chain identified by `chain-identifier`.

ABI signature:

```solidity
function iAddress(bytes calldata chainIdentifier) external view returns (bytes memory);
```

When invoked via ENSIP-10 `resolve(name, data)` where `data` encodes `iAddress(chain-identifier)`:

- The resolver MAY compute `node` by applying `namehash` (ENSIP-1) to the ENS name represented by the DNS-encoded `name` parameter (ENSIP-10 / RFC1035 encoding rules).
- The resolver MUST return the target address bytes for the given `name` and `chain-identifier`.
- If no address is set for the given `name` and `chain-identifier`, the resolver MUST return an empty bytes array.

The returned bytes are the **ERC-7930 Address bytes** for the target chain (no length prefix). Clients can construct a full ERC-7930 Interoperable Address by taking `chain-identifier` (which contains a zero-length address) and replacing the zero-length with the correct length of the returned bytes, then appending the returned bytes.

### Profile: `iReverse(chain-identifier) -> string`

This profile returns a human-readable name associated with the chain-specific target address for the ENS name being resolved.

ABI signature:

```solidity
function iReverse(bytes calldata chainIdentifier) external view returns (string memory);
```

When invoked via ENSIP-10 `resolve(name, data)` where `data` encodes `iReverse(chain-identifier)`:

- The resolver MAY compute `node` from `name` as described above.
- The resolver MUST return a name (as a UTF-8 string) that is associated with the chain-specific target address for the given `name` and `chain-identifier`.
- If no name is set, the resolver MUST return the empty string.

This profile is intended to support chain-specific "reverse naming" patterns. The mechanism for establishing and verifying reverse associations is out of scope for this ENSIP.

### Profile: `iData(key) -> bytes`

This profile resolves an ENS name to arbitrary bytes data associated with a string key, consistent with ENSIP-24.

The `key` argument is a `string` type for simplicity and clarity, matching ENSIP-24.

ABI signature:

```solidity
function iData(string calldata key) external view returns (bytes memory);
```

When invoked via ENSIP-10 `resolve(name, data)` where `data` encodes `iData(key)`:

- The resolver MAY compute `node` from `name` as described above.
- The resolver MUST return the bytes value associated with the given `name` and `key`.
- If no value is set for `(node, key)`, the resolver MUST return an empty bytes array.

### Consistency Requirements

If a resolver supports both:

- `iAddress(chain-identifier)` and `addr()` / `addr(coinType)`, or
- `iData(key)` and `data(node, key)` (ENSIP-24),

it MUST ensure that records are consistent where a natural mapping exists.

### Calldata and return encoding

When called via ENSIP-10 `resolve(name, data)`, the `data` parameter MUST be the ABI-encoded calldata for the requested profile function, and the resolver MUST return the ABI-encoded return data for that function (or revert if unsupported), consistent with ENSIP-10.

### Examples (ENSIP-10 usage)

Let `resolver` be an ENSIP-10 ExtendedResolver.

- Resolve a chain-specific address for `alice.eth`:

```text
resolver.resolve(dnsencode("alice.eth"), abi.encodeWithSignature("iAddress(bytes)", chainIdentifier))
```

- Resolve a chain-specific reverse name for `alice.eth`:

```text
resolver.resolve(dnsencode("alice.eth"), abi.encodeWithSignature("iReverse(bytes)", chainIdentifier))
```

- Resolve arbitrary data for `alice.eth`:

```text
resolver.resolve(dnsencode("alice.eth"), abi.encodeWithSignature("iData(string)", "some.key"))
```

## Rationale

ENSIP-10 already provides the DNS-encoded name to the resolver, which can compute the `node`. Omitting `node` from the calldata for these profiles reduces duplication and produces a cleaner interface for interoperable, multichain resolution flows.

## Backwards Compatibility

These profiles are designed for ENSIP-10 `resolve()` and do not replace existing profiles. Existing ENS clients and resolvers can continue to use `addr()` / `addr(coinType)` and `data(node, key)` unchanged.

## Security Considerations

- Clients MUST treat empty bytes / empty string as "no record set".
- Implementers SHOULD ensure that `chain-identifier` is validated as an ERC-7930 interoperable identifier with a zero-length address to avoid ambiguous resolution.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
