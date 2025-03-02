---
description: Custom Errors for ENSIP-10 
contributors:
  - raffy.eth
ensip:
  created: '2025-03-01'
  status: draft
---

# ENSIP-X: Custom Errors for ENSIP-10

## Abstract

This standard establishes [custom errors](https://docs.soliditylang.org/en/latest/contracts.html#custom-errors) for [ENSIP-10](./10.md) `resolve()` to improve the resolution experience and disambiguate the following situations:

* the resolver profile (eg. `contenthash()`) is not supported
* the name (eg. `nick.eth`) does not exist
* all other resolution errors

## Motivation

ENS and the broader Ethereum ecosystem are becoming increasingly multichain.  [ERC-3668](https://eips.ethereum.org/EIPS/eip-3668) enabled crosschain state access and ENSIP-10 allows a complete namespace to be bridged from another chain.

Currently, it is difficult to programmatically disambiguate between resolution responses that have different end-user consequences.  Clients are forced interpret `null` and resolution reverts as *this record does not exist*.  There is no reliable technique to check if a name exists.

## Specification

An ENSIP-10 enabled contract SHOULD utilize the following errors:

### UnknownResolverProfile

```solidity
/// @param selector Function selector of the resolver profile that cannot be answered.
error UnknownResolverProfile(bytes4 selector);
```

Selector: [`0xa427eaf9`](https://adraffy.github.io/keccak.js/test/demo.html#algo=evm&s=UnknownResolverProfile%28bytes4%29&escape=1&encoding=utf8)

This error should be raised when the selector of supplied `calldata` corresponds to an unknown resolver profile.

### Unreachable

```solidity
/// @param name DNS-encoded ENS name that does not exist.
error Unreachable(bytes name);
```

Selector: [`0x9e2fd406`](https://adraffy.github.io/keccak.js/test/demo.html#algo=evm&s=Unreachable%28bytes%29&escape=1&encoding=utf8)

This error should be raised when the supplied `name` does not exist, which could happen for a variety of reasons:

* `name` is encoded incorrectly
* `name` cannot be parsed &mdash; eg. `zzz.3c.reverse` where `zzz` is expected to be 40 hexadecimal characters.
* `name` does not exist &mdash; eg. `__dne.base.eth` where `__dne` is not a registered  [Basename](https://www.base.org/names).

When existence is unknown, a `null` response is preferable to a false-positive revert.

### Revert Priority

ENSIP-10 states *the function MUST either return valid return data for that function, or revert if it is not supported.*  When both situations apply, `UnknownResolverProfile` MUST be raised before `Unreachable`.

## Rationale

The proposed implementation makes it possible to check for extended resolver profile support, similar to [ERC-165](https://eips.ethereum.org/EIPS/eip-165).

When queried with a supported resolver profile, the existence of a name can be determined by the presence of `Unreachable`.

Clients can utilize this information to improve the resolution experience.  All other errors likely correspond to unexpected resolution failures.

## Backwards Compatibility

This proposal does not alter the resolution process, it only supplies additional error information when a name cannot be resolved.

Resolvers that answer the equivalent of `null` when an unsupported resolver profile is queried should be redeployed.

## Security Considerations

None.

## Copyright

<!-- Just leave this how it is -->
Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
