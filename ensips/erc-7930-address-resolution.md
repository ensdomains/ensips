---
title: ERC-7930 Address Resolution
description: A resolver function for resolving ERC-7930 addresses
contributors: 
    - premm.eth
    - clowes.eth
ensip:
  created: "2025-01-15"
  status: draft
---

# ENSIP-X: ERC-7930 Address Resolution

## Abstract

This ENSIP introduces ERC-7930 address resolution for ENS names using ENSIP-24 `data()` records. It specifies the `data()` key and value format needed to look up an ERC-7930 address for a given chain.

## Motivation

ERC-7930 defines a standardized binary format for representing blockchain addresses. As multichain applications become more common, there is a need for a universal way to resolve interoperable addresses using ERC-7930. This ENSIP specifies a Data Key Standard using `data()` (ENSIP-24) that complements the existing `addr()` (ENSIP-1) and `addr(coinType)` (ENSIP-9) functions, enabling standardized resolution of ENS names to ERC-7930 addresses without introducing a new resolver interface.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Terminology

This ENSIP uses the term **ERC-7930 Interoperable Address** as defined by ERC-7930.

For the purposes of this ENSIP:

- A **chain identifier** is an ERC-7930 Interoperable Address with the chain specified but a zero-length address (including the zero-length byte).
- The `data()` **key** is constructed by concatenating the prefix `"erc7930.address: "` with a chain identifier.
- The `data()` **value** is the raw target address bytes (no length prefix).

### Data Key Standard

This standard defines a data key format for use with the existing ENSIP-24 `data()` profile.

Resolvers MUST implement the ENSIP-24 `data()` resolution interface to support this standard.

The standard uses the following key format:

```
erc7930.address: <chain-identifier>
```

The key is constructed by concatenating:

```
"erc7930.address: " || <chain-identifier>
```

Note the single space after the colon; it is part of the key.

A **chain identifier** is an ERC-7930 Interoperable Address with the chain specified but a zero-length address (including the zero-length byte).

This key identifies the ERC-7930 Address component and is interpreted as:

```
erc7930.address: <chain-identifier> -> ERC-7930 target address
```

`<chain-identifier>` MUST be the full ERC-7930 Interoperable Address with a zero-length address component (address length set to zero, and no address bytes present). This allows the key to encode the chain identifier and any relevant ERC-7930 metadata while omitting the target address.

### Return Value

The value stored at this key MUST be the ERC-7930 defined Address bytes for the target chain, with no length prefix.

### Example

For an Ethereum address on mainnet, the `data()` key is:

```
erc7930.address: 0x00010000010100
```

Where the `0x00` at the end represents a zero-length address.

If the ENS name resolves to `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`, the `data()` call returns the raw address bytes:

```
0xd8da6bf26964af9d7eed9e03e53415d37aa96045
```

To construct the full ERC-7930 Interoperable Address, replace the zero-length byte with `0x14` and append the returned address bytes:

```
0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045
```

### Consistency Requirements

If a resolver supports both the `erc7930.address` data profile and `addr()` or `addr(coinType)`, it MUST ensure that these functions return consistent addresses for the same chain, and the respective events are emitted when the address value is updated. 

## Rationale

This design allows resolvers to store interoperable addresses efficiently without introducing new interfaces by reusing the ENSIP-24 `data()` profile. The key encodes the chain information, while the value stores only the target address bytes. When a resolver supports multiple address resolution interfaces, the consistency requirements ensure that clients can use any of the supported resolution methods interchangeably.

## Backwards Compatibility

Resolvers implementing the `erc7930.address` data profile are not required to support `addr()` or `addr(coinType)`. If a resolver supports multiple address resolution interfaces, it MUST maintain consistency between them as specified in the Consistency Requirements section above.

## Security Considerations

None.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).