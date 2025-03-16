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

* the [resolver profile](https://github.com/ensdomains/ens-contracts/tree/staging/contracts/resolvers/profiles) (eg. `contenthash()`) is not supported
* the name (eg. `nick.eth`) does not exist
* all other resolution errors

## Motivation

ENS and the broader Ethereum ecosystem are becoming increasingly multichain.  [ERC-3668](https://eips.ethereum.org/EIPS/eip-3668) enables offchain access and ENSIP-10 allows a complete namespace to be bridged from another chain.

Currently, it is difficult to programmatically disambiguate between resolution responses that have different end-user consequences.  Clients are forced interpret `null` and resolution reverts as *this record does not exist*.  There is no reliable technique to check if a name exists.

## Specification

An ENSIP-10 enabled contract SHOULD utilize the following errors:

### UnsupportedResolverProfile

```solidity
/// @param selector Function selector of the resolver profile that cannot be answered.
error UnsupportedResolverProfile(bytes4 selector);
```

Selector: [`0x7b1c461b`](https://adraffy.github.io/keccak.js/test/demo.html#algo=evm&s=UnsupportedResolverProfile%28bytes4%29&escape=1&encoding=utf8)

This error should be raised when the selector of supplied `calldata` corresponds to an unsupported resolver profile.

### UnreachableName

```solidity
/// @param name DNS-encoded ENS name that does not exist.
error UnreachableName(bytes name);
```

Selector: [`0x5fe9a5df`](https://adraffy.github.io/keccak.js/test/demo.html#algo=evm&s=UnreachableName%28bytes%29&escape=1&encoding=utf8)

This error should be raised when the supplied `name` does not exist, which could happen for a variety of reasons:

* incorrectly encoded
* cannot be parsed &mdash; eg. `zzz.3c.reverse` where `zzz` is expected to be 40 hexadecimal characters.
* does not exist &mdash; eg. `__dne.base.eth` where `__dne` is not a registered [Basename](https://www.base.org/names).

When existence is unknown, a `null` response is preferable to a false-positive revert.

When this error is raised, all responses for `name` are effectively `null`.

### Revert Priority

ENSIP-10 [states](./10.md#specification) *"the function MUST either return valid return data for that function, or revert if it is not supported."*  When both errors apply, `UnsupportedResolverProfile` MUST be raised before `UnreachableName`.

## Rationale

The proposed implementation makes it possible to check for extended resolver profile support, similar to [ERC-165](https://eips.ethereum.org/EIPS/eip-165).

When queried with a supported resolver profile, the existence of a name can be determined by the presence of `UnreachableName`.

Clients can utilize this information to improve the resolution experience.  All other errors likely correspond to unexpected resolution failures.

## Backwards Compatibility

This proposal does not alter the resolution process, it only supplies additional error information when a name cannot be resolved.

* Resolvers that return `null` when queried with an unsupported resolver profile should be redeployed.
* Resolvers that follow this specification but raise a different error do not require redeployment.

## Security Considerations

None.

## Copyright

<!-- Just leave this how it is -->
Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
