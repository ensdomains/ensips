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

This ENSIP standardizes [IUniversalResolver](#specification) (UR), an universal entrypoint for resolving ENS names.  UR incorporates onchain algorithms for [ENSIP-10](./10#pseudocode), [ENSIP-19](./19#algorithm), [ENSIP-21](./21), and [ENSIP-22](./22) to reduce ENS integration complexities.

## Motivation

The process of resolving ENS names requires multiple onchain calls and in-depth knowledge of the [latest standards](/).

Resolution has become more complex over time, especially with the introduction of [wildcard resolution](./10.md) and [multichain primary names](./19).  ENSv2 will also introduce a new registry design and many other improvements.

Maintaining these changes across multiple client frameworks demands significant development effort.  The growth and evolution of the ENS protocol should not be constrained by the pace of client deployments or hindered by outdated libraries.

UR offers a standard entrypoint for client frameworks to perform ENS resolution.  It lifts many algorithms out of client frameworks and puts them onchain for transparency and security.  This ENSIP standardizes an interface for [forward](#resolve) and [primary name](#reverse) resolution.

## Specification

UR has the following Solidity [interface](https://github.com/ensdomains/ens-contracts/blob/staging/contracts/universalResolver/IUniversalResolver.sol):

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

    /// @notice Find the resolver address for `name`.
    ///         Does not perform any validity checks on the resolver.
    /// @param name The name to search.
    /// @return resolver The found resolver, or null if not found.
    /// @return node The namehash of `name`.
    /// @return resolverOffset The offset into `name` corresponding to `resolver`.
    function findResolver(
        bytes memory name
    )
        external
        view
        returns (address resolver, bytes32 node, uint256 resolverOffset);

    /// @notice Performs ENS forward resolution for the supplied name and data.
    ///         Caller should enable EIP-3668.
    /// @param name The DNS-encoded name to resolve.
    /// @param data The ABI-encoded resolver calldata.
    ///             For a multicall, encode as `multicall(bytes[])`.
    /// @return result The ABI-encoded response for the calldata.
    ///                For a multicall, the results are encoded as `(bytes[])`.
    /// @return resolver The resolver that was used to resolve the name.
    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory result, address resolver);

    /// @notice Performs ENS primary name resolution for the supplied address and coin type, as specified in ENSIP-19.
    ///         Caller should enable EIP-3668.
    /// @param lookupAddress The byte-encoded address to resolve.
    /// @param coinType The coin type of the address to resolve.
    /// @return primary The verified primary name, or null if not set.
    /// @return resolver The resolver that was used to resolve the primary name.
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

This function performs onchain [ENSIP-1 § Registry](./#registry-specification) traversal of a DNS-encoded `name`.  It returns the first non-null `resolver` address, the namehash of `name` as `node`, and the `resolverOffset` into `name` that corresponds to the resolver.  If no resolver is found, `resolver` is null.

`findResolver()` does not perform any validity checks on the resolver and simply returns the value in the registry.  The resolver may not be a contract or a resolver.

#### <a name="resolve-example">Pseudocode Example</a>

```js
name = dnsEncode("sub.nick.eth") = "\x03sub\x04nick\x03eth\x00"

1. registry[namehash("\x03sub\x04nick\x03eth\x00")] = null ❌️
2. registry[namehash(/*-4-*/"\x04nick\x03eth\x00")] = 0x2222222222222222222222222222222222222222 ✅️ // "nick.eth"
3. registry[namehash(/*-----9-----*/"\x03eth\x00")] = ... // not
4. registry[namehash(/*---------13-------*/"\x00")] = ... // checked

findResolver(name)
    resolver = registry[namehash("\x04nick\x03eth\x00")] = 0x2222222222222222222222222222222222222222
        node = namehash("\x03sub\x04nick\x03eth\x00") = 0xe3d81fd7b7e26b124642b4f160ea05f65a28ecfac48ab767c02530f7865e1c4c
      offset = 4 // name.slice(4) = "\x04nick\x03eth\x00" = dnsEncode("nick.eth")
```

### resolve

This function performs ENS forward resolution using the `resolver` found by [`findResolver()`](#findresolver).  It provides a standard interface for interacting [ENSIP-1](./1) and [ENSIP-10](./10) resolvers for onchain and offchain resolution.  Provided a DNS-encoded `name` and ABI-encoded `data`, it returns the ABI-encoded resolver `result` and the valid `resolver` address.

UR automatically handles wrapping calldata and unwrapping responses when interacting with an [`IExtendedResolver`](./10#pseudocode) and safely interacts with contracts deployed before [EIP-140](https://eips.ethereum.org/EIPS/eip-140).

##### <a name="resolve-resolution-errors">Resolution Errors</a>

* If no resolver was found, reverts `ResolverNotFound`.
* If the resolver was not a contract, reverts `ResolverNotContract`.
* If [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) (CCIP-Read) was required and it was not handled by the client, reverts `OffchainLookup`.
* If CCIP-Read was handled but the `OffchainLookup` failed, reverts `HTTPError`.

##### <a name="resolve-resolver-errors">Resolver Errors</a>

* If the called function was not implemented, reverts `UnsupportedResolverProfile`.
* If the called function reverted, reverts `ResolverError`.

#### Smart Multicall

Traditionally, resolvers have been written to answer direct profile requests, eg. `addr()` returns one address.  To perform multiple requests, the caller must perform multiple independent requests (in sequence, parallel, or via batched RPC) or utilize an [external multicall contract](https://www.multicall3.com/) which does not support CCIP-Read.

UR supports multicall with CCIP-Read.  To perform multiple calls:
```solidity
bytes[] memory calls = new bytes[](3);
calls[0] = abi.encodeCall(IAddrResolver.addr, (node));
calls[1] = abi.encodeCall(ITextResolver.text, (node, "avatar"));
calls[2] = hex"00000000"; // invalid selector
```
```ts
const calls = [
    encodeFunctionData({ functionName: "addr", args: [node] }),
    encodeFunctionData({ functionName: "text", args: [node, "avatar"] }),
    "0x00000000", // invalid selector
];
```
Using the following [interface](https://github.com/ensdomains/ens-contracts/blob/staging/contracts/resolvers/IMulticallable.sol):
```solidity
interface IMulticallable {
    function multicall(bytes[] calldata data) external view returns (bytes[] memory);
}
```
Encode the calls, invoke [`resolve()`](#resolve) normally, and decode the result:
```solidity
bytes memory data = abi.encodeCall(IMulticallable.multicall, (calls));
(bytes memory result, address resolver) = UR.resolve(name, data); // note: could revert OffchainLookup
bytes[] memory results = abi.decode(result, (bytes));
```
```ts
const data = encodeFunctionData({ functionName: "multicall", args: [calls] });
const [result, resolver] = await UR.read.resolve(name, data);
const results = decodeFunctionResult({ functionName: "multicall", data: result });
```
The same [resolution errors](#resolve-resolution-errors) apply but [resolver errors](#resolve-resolver-errors) are handled differently.  The call **always succeeds** and decodes into an array of results.  The number of calls is always equal to the number of results.  If `results[i]` is not multiple of 32 bytes, it is an ABI-encoded error for the corresponding `calls[i]`.

```solidity
address ethAddress = abi.decode(results[0], (address));
string avatar = abi.decode(results[1], (string));
// results[2] == abi.encodeWithSelector(UnsupportedResolverProfile.selector, bytes4(0x00000000));
```
```ts
const ethAddress = decodeFunctionResult({ functionName: "addr", data: results[0] });
const avatar = decodeFunctionResult({ functionName: "text", data: results[1] });
const error = decodeErrorResult({ data: result[2] }); // { errorName: "UnsupportedResolverProfile", args: ["0x00000000"] }
```

### reverse

This function performs ENS primary name resolution according to [ENSIP-19](./19.md).  Provided a [byte-encoded](./9) `lookupAddress` and desired `coinType`, it returns the verified primary `name` and the addresses of forward `resolver` and `reverseResolver`.  UR supports CCIP-Read during the forward and reverse phases.  

* If [reverse resolution](./19#reverse-resolution) of the reverse name was not successful, reverts a [`resolve()` error](resolve-resolution-errors).
* If the resolved primary name was null, returns `("", address(0), <reverseResolver>)`.
* If [forward resolution](./19#forward-resolution) of the primary name was not successful, also reverts a [`resolve()` error](resolve-resolution-errors).
* If the resolved address of `coinType` doesn't equal the `lookupAddress`, reverts `ReverseAddressMismatch`.

`reverse()` is effectively (2) sequential `resolve()` calls.

#### <a name="reverse-example">Pseudocode Example</a>

```js
// valid primary name: vitalik.eth on mainnet
reverse("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", 60)
    1. reverse: resolve("d8da6bf26964af9d7eed9e03e53415d37aa96045.addr.reverse", name()) = "vitalik.eth"
    2. forward: resolve("vitalik.eth", addr(60)) = 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    3. 0xd8dA == 0xd8dA => ✅️ "vitalik.eth"

// invalid primary name: imposter vitalik.eth
reverse("0x314159265dD8dbb310642f98f50C066173C1259b", 60)
	1. reverse: resolve("314159265dd8dbb310642f98f50c066173c1259b.addr.reverse", name()) = "vitalik.eth"
	2. forward: resolve("vitalik.eth", addr(60)) = 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
	3. 0x3141 != 0xd8d => ❌️ ReverseAddressMismatch()

// no primary name: burn address on Base mainnet
resolve("0x000000000000000000000000000000000000dEaD", 0x80000000 ^ 8453)
	1. reverse: resolve("000000000000000000000000000000000000dead.addr.reverse", name()) => ❌️ ResolverNotFound()
```

## Backwards Compatibility

UR supports **ALL** known resolver types if the caller supports CCIP-Read.  Otherwise, it can only resolve onchain names.

It is a **complete replacement** for existing ENS resolution procedures.  Client frameworks should focus on building calldata and handling responses and rely on UR to facilitate resolution.

## Security Considerations

UR uses a batch gateway to perform CCIP-Read requests.  If the client does not support [ENSIP-21](./21), a trustless external batch gateway service is used which adds latency and leaks information.

UR is deployed as an immutable contract and as an ENS DAO-managed upgradeable proxy.  The main purpose of the proxy is to facilitate a seamless transition to [ENS v2](https://ens.domains/ensv2) and track the latest standards.  Client frameworks should default to the proxy so their libraries are future-proof, with the option to specify an alternative implementation.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
