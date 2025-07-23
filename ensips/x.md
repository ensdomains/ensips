---
description: An universal entrypoint for resolving ENS names.
contributors:
  - taytems.eth
  - raffy.eth
ensip:
  created: "2024-10-14"
  status: draft
---

# ENSIP-X: Universal Resolver

## Abstract

This ENSIP standardizes an universal entrypoint [UniversalResolver](#specification) (UR) for resolving ENS names according to the latest standards.  The UR contains onchain algorithms for [ENSIP-10 § Pseudocode](./10#pseudocode), [ENSIP-19 § Algorithm](./19#algorithm), and [ENSIP-21](./21) client implementation.

## Motivation

The process of resolving ENS names requires multiple onchain calls in-depth knowledge of the latest ENS standards.

Resolution is becoming more involved over time, especially with the introduction of wildcard resolution (ENSIP-10), and more recently cross-chain reverse resolution (ENSIP-19).
These factors mean there is a relatively high burden to implement ENS, with high latency, and a large amount of developer hours to spend to understand and implement the correct resolution process.

Given these factors, there are significant incentives for incorrect/incomplete ENS implementations, or implementations that do not rely on Ethereum as the source of truth.

Beyond the implementation burdens, maintaining many resolution implementations means that any change to ENS resolution that an ENSIP might provide becomes a challenging task to propagate amongst the ecosystem, and as such significantly limits the growth of the ENS protocol with novel concepts.

As a solution for these challenges, this specification proposes an interface that allows universally resolving any ENS name, or any reverse name.

## Specification

The UR has the following Solidity interface:

```solidity
/// @dev Interface selector: `0xcd191b34`
interface IUniversalResolver {
    /// @notice A resolver could not be found for the supplied name.
    /// @dev Error selector: `0x77209fe8`
    error ResolverNotFound(bytes name);

    /// @notice The resolver is not a contract.
    /// @dev Error selector: `0x1e9535f2`
    error ResolverNotContract(bytes name, address resolver);

    /// @notice The resolver did not respond.
    /// @dev Error selector: `0x7b1c461b`
    error UnsupportedResolverProfile(bytes4 selector);

    /// @notice The resolver returned an error.
    /// @dev Error selector: `0x95c0c752`
    error ResolverError(bytes errorData);

    /// @notice The resolved address from reverse resolution does not match the supplied address.
    /// @dev Error selector: `0xef9c03ce`
    error ReverseAddressMismatch(string primary, bytes primaryAddress);

    /// @notice An HTTP error occurred on a resolving gateway.
    /// @dev Error selector: `0x01800152`
    error HttpError(uint16 status, string message);

    /// @dev Find the resolver address for `name`.
    ///      Does not perform any validity checks on the resolver.
    /// @param name The name to search.
    /// @return resolver The resolver or `address(0)` if not found.
    /// @return node The namehash of `name`.
    /// @return offset The offset into `name` corresponding to `resolver`.
    function findResolver(
        bytes memory name
    ) external view returns (address resolver, bytes32 node, uint256 offset);

    /// @notice Performs ENS name resolution for the supplied name and resolution data.
    /// @notice Caller should enable EIP-3668.
    /// @param name The name to resolve, in normalised and DNS-encoded form.
    /// @param data The resolution data, as specified in ENSIP-10.
    ///             For a multicall, the data should be encoded as `multicall(bytes[])`.
    /// @return result The result of the resolution.
    ///                For a multicall, the result is encoded as `(bytes[])`.
    /// @return resolver The resolver that was used to resolve the name.
    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory result, address resolver);

    /// @notice Performs ENS reverse resolution for the supplied address and coin type.
    /// @notice Caller should enable EIP-3668.
    /// @param lookupAddress The address to reverse resolve, in encoded form.
    /// @param coinType The coin type to use for the reverse resolution.
    ///                 For ETH, this is 60.
    ///                 For other EVM chains, coinType is calculated as `0x80000000 | chainId`.
    /// @return primary The reverse resolution result.
    /// @return resolver The resolver that was used to resolve the name.
    /// @return reverseResolver The resolver that was used to resolve the reverse name.
    function reverse(
        bytes calldata lookupAddress,
        uint256 coinType
    )
        external
        view
        returns (
            string memory primary,
            address resolver,
            address reverseResolver
        );
}
```

### findResolver

This function performs onchain [ENSIP-1 § Registry](./#registry-specification) traversal of a DNS-encoded `name`.  It returns the first non-null `resolver` address, the namehash of `name` as `node`, and the `offset` into `name` that corresponded to the match.  If no resolver is found, `resolver` is null.

This function does not perform any validity checks on the resolver and simply returns the value in the registry.  The resolver may not be a contract or a resolver.

#### Example

```js
name = dnsEncode("sub.nick.eth") = "\x03sub\x04nick\x03eth\x00"

registry[namehash(                      "\x00")].resolver = null
registry[namehash(               "\x03eth\x00")].resolver = null
registry[namehash(       "\x04nick\x03eth\x00")].resolver = 0x1111111111111111111111111111111111111111
registry[namehash("\x03sub\x04nick\x03eth\x00")].resolver = null

findResolver(name) = [
    0x1111111111111111111111111111111111111111, // resolver for "sub.nick.eth"
    0xe3d81fd7b7e26b124642b4f160ea05f65a28ecfac48ab767c02530f7865e1c4c, // namehash("sub.nick.eth")
    4, // offset into name, eg. name.slice(4) = dnsEncode("nick.eth") = "\x04nick\x03eth\x00"
]
```

### resolve

This function performs ENS forward resolution according to [ENSIP-10](./10#pseudocode) using the `resolver` found by [`findResolver()`](#findresolver).  It provides a standard interface for interacting [ENSIP-1](./1) and [ENSIP-10](./10) resolvers for onchain and offchain resolution.  Provided a DNS-encoded `name` and ABI-encoded `data`, it returns the ABI-encoded resolver `result` and the valid address of the `resolver`.

##### <a name="resolve-resolution-errors">Resolution Errors</a>

* If no resolver was found according to the standard, reverts `ResolverNotFound`.
* If the resolver was not a contract, reverts `ResolverNotContract`.
* If [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) (CCIP-Read) was required and it was not handled by the client, reverts `OffchainLookup`.
* If CCIP-Read was handled but the `OffchainLookup` failed, reverts `HTTPError`.

##### <a name="resolve-resolver-errors">Resolver Errors</a>

* If the resolver function was not implemented, reverts `UnsupportedResolverProfile`.
* If the resolver function reverted, reverts `ResolverError`.

#### Smart Multicall

Resolvers are written to answer singular requests, eg. `addr()` returns one address.  Traditionally, to perform multiple requests, the caller must perform multiple requests (in sequence, parallel, or via batched RPC) or utilize an [external multicall contract](https://www.multicall3.com/).  Unfortunately, a multicall containing a CCIP-Read request does not work.

To perform multiple calls, encode with the following function, and call [resolve()](#resolve) normally.
```solidity
interface IMulticallable {
    /// @dev Selector: 0xac9650d8
    function multicall(bytes[] calldata data) external view returns (bytes[] memory);
}
```
The same [Resolution Errors](#resolve-resolution-errors) apply but [Resolver Errors](#resolve-resolver-errors) are handled differently.  The call always succeeds and decodes into an array of results via `abi.decode(result, (bytes[]))`.  The number of calls is always equal to the number of results.  If an individual result is not multiple of 32 bytes, it is an ABI-encoded error.

#### Example

```solidity
// encode
bytes[] memory calls = new bytes[](3);
calls[0] = abi.encodeCall(IAddrResolver.addr, (node));
calls[1] = abi.encodeCall(ITextResolver.text, (node, "avatar"));
calls[2] = hex"00000000"; // invalid selector
bytes memory data = abi.encodeCall(IMulticallable.multicall, (calls));

// call
bytes memory result = UR.resolve(name, data);

/// decode
bytes[] memory results = abi.decode(result, (bytes[]));

address ethAddress = abi.decode(results[0], (address));
string avatar = abi.decode(results[1], (string));
// results[2] == abi.encodeWithSelector(UnsupportedResolverProfile.selector, 0x00000000);
```

### reverse

The `reverse` function can be used by any ENS client as a complete replacement for offchain reverse name resolution methods.

This function takes two parameters:

- `lookupAddress`: The address to resolve the name for, in **decoded** form (as per ENSIP-9).
  - Example: with an Ethereum address of `0x314159265dD8dbb310642f98f50C066173C1259b`, this value would be `314159265dd8dbb310642f98f50c066173c1259b`.
  - Example: with a Bitcoin address of `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`, this value would be `0062e907b15cbf27d5425399ebf6f0fb50ebb88f18`.
- `coinType`: The coin type to resolve the name for, as defined by ENSIP-9 and ENSIP-11.

The output of this function is:

- `name`: The verified reverse resolved name.
- `resolver`: The address of the resolver that resolved the `addr` record for the name (i.e. forward verification).
- `reverseResolver`: The address of the resolver that resolved the `name` record.

In the scenario that a name is not set for the given parameters, all outputs will resolve to `0x`.

### Errors

- **ResolverNotFound**
  - A resolver could not be found for the given name.
  - Parameters
    - `bytes name`: The name a resolver could not be found for.
  - Can throw from **all** functions.
- **ResolverNotContract**
  - The resolver found for the given name is not a contract.
  - Parameters
    - `bytes name`: The name the resolver was found for.
    - `address resolver`: The address of the resolver that is not a contract.
  - Can throw from **all** functions.
- **UnsupportedResolverProfile**
  - The resolver for the given name did not respond, i.e. responded with `0x`.
  - Parameters
    - `bytes4 selector`: The function selector that the resolver did not respond to.
  - Can throw from **all** functions.
  - Can be propagated up from an internal resolver error.
- **HttpError**
  - An HTTP error occurred on a resolving gateway, either from a gateway used by the UniversalResolver itself, or by the resolver for the given name.
  - Parameters
    - `uint16 status`: The HTTP error status, e.g. 400, 404
    - `string message`: The HTTP error message, e.g. "Resource not found"
  - Can throw from **all** functions.
  - Can be propagated up from an internal resolver error.
- **ReverseAddressMismatch**
  - The resolved address from reverse resolution does not match the resolved address for the primary name.
  - Parameters
    - `string primary`: The resolved primary name from reverse resolution.
    - `bytes primaryAddress`: The resolved address for the primary name, from reverse resolution. In decoded form (as per ENSIP-9).
  - Can throw from the **reverse** function.
- **ResolverError**
  - The resolver for the given name threw an unrecognised error. Used to distinguish between a resolution error and an internal resolver error.
  - Parameters
    - `bytes errorData`: The error data thrown from the resolver.
  - Can throw from **all** functions.

## Backwards Compatibility

The UR supports **ALL** known resolver types.

The UR is a complete replacement for client-side resolution.  Client frameworks should focus on assembling calldata and processing responses and use the UR to facilitate ENS resolution.

## Security Considerations

The UR uses a batch gateway to perform [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) requests.  If the client does not support [ENSIP-21](./21) an trustless external batch gateway service is used which adds latency and leaks information.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
