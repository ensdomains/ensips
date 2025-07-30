---
description: A list of EIP-X features for ENS.
contributors:
  - raffy.eth
ensip:
  created: "2025-07-29"
  status: draft
---

# ENSIP-X: ENS Features

## Abstract

This ENSIP standardizes [EIP-X](https://eips.ethereum.org/EIPS/eip-x) features relevant to ENS, enabling future optimizations while preserving compatibility with existing deployments.

## Motivation

ENS has maintained backwards compatibility with contracts created in 2016 through extensive use of [EIP-165](https://eips.ethereum.org/EIPS/eip-165).  Unfortunately, not all contract capabilities can be expressed through an unique public interface.

EIP-X is the solution to this problem and enables an new mechanism for expressing onchain contract capabilities that preserve standard ENS interfaces.

## Specification

Contract features are defined in EIP-X.  ENS features should be a reverse domain name (eg. `eth.ens.registrar.free`) that uniquely defines its implication.

### Resolver with Features

All resolvers that implement features must express EIP-165 support for the interface selector `0x582de3e7`, defined in EIP-X.   

A resolver may support this interface without implementing any individual features.

Feature support indicates that the resolver is considered *modern* and adheres to the following criteria:

* If the resolver utilizes [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) (CCIP-Read), it must support [recursive calls](https://eips.ethereum.org/EIPS/eip-3668#recursive-calls-in-ccip-aware-contracts).
* The resolver must be compiled with [EIP-140](https://eips.ethereum.org/EIPS/eip-140) support.

During resolution, if the calldata is not a `multicall`, the resolver may be safely called directly without [batch gateway](./21) infrastructure.

### <a name="eth.ens.resolver.extended.multicall">eth.ens.resolver.extended.multicall &mdash; `0x96b62db8`</a>

If a resolver is an [`IExtendedResolver`](./10) and supports this feature, `resolve(name, data)` must handle `multicall(bytes[])` as expected.

For resolvers that utilize CCIP-Read, this feature permits a single `OffchainLookup` request to fetch multiple records, which greatly reduces latency and network traffic.

When a resolver calls another resolver, this feature permits calldata to be passed directly without modification.

### <a name="eth.ens.resolver.singular">eth.ens.resolver.singular &mdash;  `0x86fb8da8`</a>

If a resolver supports this feature, it promises to return the same results regardless of the resolved name.

## Backwards Compatibility

Callers unaware of a feature experience no change in behavior.

## Security Considerations

As with EIP-165, declaring support for a feature does not guarantee that the contract implements it.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
