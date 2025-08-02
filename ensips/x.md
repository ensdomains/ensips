---
description: EIP-7996 contract features for ENS.
contributors:
  - raffy.eth
ensip:
  created: "2025-07-29"
  status: draft
---

# ENSIP-X: ENS Contract Features

## Abstract

This ENSIP standardizes [ERC-7996](https://eips.ethereum.org/EIPS/eip-x) contract features relevant to ENS, enabling new optimizations while preserving compatibility with existing deployments.

## Motivation

ENS has maintained backwards compatibility with contracts created in 2016 through extensive use of [ERC-165](https://eips.ethereum.org/EIPS/eip-165).  Unfortunately, not all contract capabilities can be expressed through an unique interface.

Features allow expression of contract capabilities that preserve existing interfaces. This proposal standardizes the concept of features and standardizes the identification (naming) of features.

## Specification

Contract features are defined in EIP-7996.

### Resolver with Features

Any resolver that supports features must adhere to the following criteria:

* If the resolver utilizes [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) (CCIP-Read), it must support [recursive calls](https://eips.ethereum.org/EIPS/eip-3668#recursive-calls-in-ccip-aware-contracts).
* The resolver must be compiled with [EIP-140](https://eips.ethereum.org/EIPS/eip-140) support.

Therefore, when resolution calldata is not a `multicall`, the resolver may be invoked directly without [batch gateway](./21) infrastructure.

### <a name="eth.ens.resolver.extended.multicall">eth.ens.resolver.extended.multicall &mdash; `0x96b62db8`</a>

If a resolver is an [`IExtendedResolver`](./10) and supports this feature, `resolve(name, data)` must handle `multicall(bytes[])` as expected.

For resolvers that utilize CCIP-Read, this feature permits a single `OffchainLookup` request to fetch multiple records, which greatly reduces latency and network traffic.

A resolver with this feature may always be invoked directly without batch gateway infrastructure.

## Backwards Compatibility

Callers unaware of features or any specific feature experience no change in behavior.

## Security Considerations

As stated in ERC-7996, declaring support for a feature does not guarantee that the contract implements it.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
