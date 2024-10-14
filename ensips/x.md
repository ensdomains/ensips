---
description: A universal entrypoint for resolving ENS names.
contributors:
  - taytems.eth
ensip:
  created: "2024-10-14"
  status: draft
---

# ENSIP-X: Universal Resolution

## Abstract

This ENSIP defines a universal entrypoint for resolving ENS names, via an interface (i.e the UniversalResolver).

## Motivation

The process of resolving ENS names traditionally requires multiple onchain calls, and that an implementing developer has in-depth knowledge of ENS.
This is becoming more prevalent over time, especially with the introduction of wildcard resolution (ENSIP-10), and more recently cross-chain reverse resolution (ENSIP-19).
These factors mean there is a relatively high burden to implement ENS, with high latency, and a large amount of developer hours to spend to understand and implement the correct resolution process.

Given these factors, there are significant incentives for incorrect/incomplete ENS implementations, or implementations that do not rely on Ethereum as the source of truth.

Beyond the implementation burdens, maintaining many resolution implementations means that any change to ENS resolution that an ENSIP might provide becomes a challenging task to propagate amongst the ecosystem, and as such significantly limits the growth of the ENS protocol with novel concepts.

As a solution for these challenges, this specification proposes an interface that allows universally resolving any ENS name, or any reverse name.

## Specification

A compliant implementation of the UniversalResolver must implement the following interface:

```solidity
interface IUniversalResolver {
  function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory result, address resolver);
  function reverse(bytes calldata lookupAddress, uint256 coinType) external view returns (string memory name, address resolver, address reverseResolver);
}
```

### resolve

The `resolve` function should be used by any ENS client as a complete replacement for offchain resolution methods.

Similar to that of ENSIP-10, this function takes two parameters:

- `name`: The DNS-encoded name to resolve
- `data`: The encoded calldata for a resolver function

If intending to resolve multiple requests, the `data` parameter can be encoded via the following multicall interface:

```solidity
interface IMulticallable {
  function multicall(bytes[] calldata data) external view returns (bytes[] memory results);
}
```

Decoding the result of a multicall should be done by using the output of the same interface.
Errors are returned in the results array of a multicall, and can be checked with `len(result) % 32 == 4`.

Example of a multicall:

```typescript
function getData(name: string) {
  const encodedMulticallData = encodeFunctionData({
    name: "multicall",
    args: [
      [
        encodeFunctionData({
          name: "addr",
          args: [namehash(name)],
        }),
        encodeFunctionData({
          name: "text",
          args: [namehash(name), "url"],
        }),
      ],
    ],
  });
  const [encodedMulticallResult, resolverAddress] =
    await universalResolver.resolve(dnsEncodeName(name), encodedMulticallData);
  const decodedMulticallResults = decodeFunctionResult({
    name: "multicall",
    data: encodedMulticallResult,
  });

  decodedMulticallResults.forEach((result) => {
    if (result.length % 32 === 4) {
      throw new Error("Error in result");
    }
  });

  return {
    results: decodedMulticallResults,
    resolverAddress,
  };
}
```

The output of this function is:

- `bytes`: The data returned by the resolver
- `address`: The address of the resolver that resolved the name

### reverse

The `reverse` function can be used by any ENS client as a complete replacement for offchain reverse name resolution methods.

This function takes two parameters:

- `lookupAddress`: The address to resolve the name for, in **encoded** form.
- `coinType`: The coin type to resolve the name for, as defined by ENSIP-9 and ENSIP-11.

The output of this function is:

- `name`: The verified reverse resolved name.
- `resolver`: The address of the resolver that resolved the `addr` record for the name (i.e. forward verification).
- `reverseResolver`: The address of the resolver that resolved the `name` record.

## Backwards Compatibility

The UniversalResolver is intended to be a complete replacement for offchain resolution methods, and should be used as such.

## Security Considerations

None.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
