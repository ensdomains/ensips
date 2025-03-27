---
description: Batch Gateway Protocol
contributors:
    - raffy.eth
    - nick.eth
ensip:
    created: "2025-03-15"
    status: draft
---

# ENSIP-X: Batch Gateway Offchain Lookup Protocol

## Abstract

This standard establishes the Batch Gateway Offchain Lookup Protocol (BGOLP).

## Motivation

[EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) describes a serial `OffchainLookup` mechanism. To perform more than one `OffchainLookup`, lookups can be preformed in sequence using recursive calls.

This proposal standardizes an existing ENS solution, colloquially called the "Batch Gateway", utilized first by the [`UniversalResolver`](https://etherscan.io/address/0xce01f8eee7E479C928F8919abD53E553a36CeF67#code). It is effectively [`Promise.allSettled()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) for a sequence of `OffchainLookup` reverts.

## Specification

The BGOLP has the following Solidity interface:

```solidity
/// @dev Interface selector: `0xa780bab6`
interface IBatchGateway {
    /// @notice An HTTP error occurred.
    /// @dev Error selector: `0x01800152`
    error HttpError(uint16 status, string message);

    /// @dev Information extracted from an `OffchainLookup` revert.
    struct Request {
        address sender; // same as `OffchainLookup.sender`
        string[] urls;  // same as `OffchainLookup.urls`
        bytes data;     // same as `OffchainLookup.callData`
    }

    /// @notice Perform multiple `OffchainLookup` in parallel.
    /// @notice Callers should enable EIP-3668.
    /// @param requests The array of requests to lookup in parallel.
    /// @return failures The failure status of the corresponding request.
    /// @return responses The response or error data of the corresponding request.
    function query(
        Request[] memory requests
    ) external view returns (bool[] memory failures, bytes[] memory responses);
}
```

1. Given an array of `OffchainLookup` reverts, transform each error into a `Request`.

1. Revert `OffchainLookup` with `abi.encodeCall(IBatchedGateway.query, (requests))` as the calldata.

	- The reverter must supply its own BGOLP gateway(s).
	- `x-batch-gateway:true` is defined as a special-purpose URL, which indicates an EIP-3668 client may substitute a local BGOLP implementation. If present, the client should always use the local gateway and ignore the other options. All compliant BGOLP gateways are **equivalent**.

1. Upon receiving the callback, decode the response, and propagate the inner callbacks accordingly. It is the developers responsibility to continue the EIP-3668 process.

### Batch Gateway Response

- The length of `failures` and `responses` must equal the number of `requests`.
- `failures[i]` is `false` if a response was received according to EIP-3668, even if it was error data.
- `failures[i]` is `true` if the request could not be completed.
    - If a HTTP error is encountered, encode the response using `HttpError`.
    - Otherwise, encode the reason using `Error(string)`.
- `responses[i]` is the response or error data.

## Rationale

This standard is a prerequisite for local BGOLP implementations in client frameworks.

A local BGOLP gateway is a privacy and latency improvement.

## Backwards Compatibility

The `UniversalResolver` is the only known contract that uses the BGOLP. Its design permits client-supplied gateways. In nearly all implementations, clients are using the default.

## Security Considerations

A local BGOLP gateway is **always preferable** as an external gateway leaks information and adds latency.

BGOLP gateways **should curtail the maximum number of simultaneous requests** in aggregate and per host to avoid DDOS attacks.

BGOLP gateways **should not be trusted**. Each individual `OffchainLookup` must secure its own protocol.

## Copyright

<!-- Just leave this how it is -->

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## Annex: Fault Tolerance

To perform an `OffchainLookup` that never terminates, a single lookup with `n` gateways can be transformed into a BGOLP lookup with `n` requests, each with a single gateway. In exchange for fault tolerance, the response time will match the slowest gateway and successful responses will be replicated.
