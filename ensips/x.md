---
description: Some description about the proposal
contributors:
  - ens.eth
ensip:
  created: '2024-01-01'
  status: draft
---

# ENSIP-X: EOA Chain Id

## Abstract

This ENSIP specifies a way to set an EOA/Fallback address for a name. This allows for users to set one address to be used for all chains, or as a fallback for when a chain-specific address record is not set.

## Motivation

With the rising interest and research around account abstraction, in addition to the maturation of the multi-chain ecosystem, there is a need for users to be able to set a single address to be used across all chains.

For a simple EOA user, this means setting their address once, and never having to worry about it again.
For more advanced users, this means that chain-specific records can be used for smart-contract wallets, and an EOA can be specified as fallback.

## Specification

This ENSIP aims to extend the functionality introduced in [ENSIP-9](./9) and [ENSIP-11](./11) and simply relies on the same functionality.

### CoinType for EOA

The standard CoinType for this proposed chain id is `2147483648`.

This is derived from `evmChainIdToCoinType(0)`, as per [ENSIP-11](./11).

### Resolution Order

- first normal cointype lookup for the chain designated
- then lookup for eoa chain id

### Proposed Implementation

- universal resolver magic
- example client implementation

## Rationale

Optional rationale for the proposal.
Here you can elaborate why certain decisions were made.

## Backwards Compatibility

Optional backwards compatibility section.
Here you can explain how this proposal affects existing systems.

## Forwards Compatibility

Optional forwards compatability section.
Here you can explain how this proposal affects future systems, or potential upgrade paths.

## Security Considerations

Optional security considerations section.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
