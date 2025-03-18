---
description: Batch Gateway Protocol
contributors:
  - raffy.eth
ensip:
  created: '2025-03-15'
  status: draft
---

# ENSIP-X: Batch Gateway Offchain Lookup Protocol

## Abstract

This standard establishes the Batch Gateway Offchain Lookup Protocol (BGOLP).

## Motivation

[EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) describes a serial `OffchainLookup` mechanism.  To perform more than one `OffchainLookup`, they must be preformed in sequence.

This proposal standardizes an existing ENS solution, colloquially called the "Batch Gateway", utilized first by the [`UniversalResolver`](https://etherscan.io/address/0xce01f8eee7E479C928F8919abD53E553a36CeF67#code).  It is effectively `Promise.allSettled()` for a sequence of `OffchainLookup` reverts.

An additional benefit of the BGOLP is that the EIP-3668 protocol does not terminate if an inner `OffchainLookup` cannot be satisfied, and instead returns an error for that specific request.

## Specification

The BGOLP has the following Solidity interface:

```solidity
interface IBatchGateway {
    // selector: 0x01800152
    error HttpError(uint16 status, string message);

    struct Request {
        address sender;
        string[] urls;
        bytes data;
    }

    // selector: 0xa780bab6
    function query(
        Request[] memory requests
    ) external view returns (bool[] memory failures, bytes[] memory responses);
}
```

1. Given an array of `OffchainLookup()` reverts, transform each error into a `Request`.

1. Revert `OffchainLookup()` with `abi.encodeCall(IBatchedGateway.query, (<array of requests>))` as the calldata.

	* The reverter must provide its own BGOLP gateway(s).

	* `x-batch-gateway:true` is defined as a special-purpose URL, which indicates that the EIP-3668 client may use a local BGOLP implementation.

1. Upon receiving the callback, decode the response, and propagate the inner callbacks accordingly.  It is the developers responsibility to continue the EIP-3668 process.

### Gateway Response

* The length of `failures` and `responses` must equal the number of `requests`

* `failures[i]` is `false` if the request was a success according to EIP-3668.

* `responses[i]` is the response or error data.

* If an HTTP error is encountered, use `HttpError`.

* If any other problem occurs, use `Error(string)`.

### Developer Notes

* All compliant BGOLP gateways are **equivalent**.  If the special-purpose URL is present, the client should use the local gateway.

* An `OffchainLookup` with `n` URLs may be split into a single BGOLP request, containing `n` requests, each with a single URL.

## Rationale

The BGOLP should be standardized so local BGOLP implementations are available in client frameworks.

## Backwards Compatibility

The `UniversalResolver` is the only known contract that uses the BGOLP.  Its design permits client-supplied gateways.  In nearly all implementations, clients are using the default.

Using a local BGOLP gateway is a privacy and latency improvement.

## Security Considerations

A local BGOLP gateway is **always preferable** as an external gateway leaks information and adds latency.

BGOLP gateways **should not be trusted**.  Each individual `OffchainLookup` must secure its own protocol.

## Copyright

<!-- Just leave this how it is -->
Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
