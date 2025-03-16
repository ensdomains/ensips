---
description: Batch Gateway Protocol
contributors:
  - raffy.eth
ensip:
  created: '2025-03-15'
  status: draft
---

# ENSIP-X: Batch Gateway Protocol

## Abstract

This standard establishes the Batch Gateway Protocol (BGP).

## Motivation

[EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) describes a serial `OffchainLookup` mechanism.  To perform more than one `OffchainLookup`, they must be preformed in sequence.

This proposal standardizes an existing ENS solution, colloquially called the "Batch Gateway", utilized first by the [`UniversalResolver`](https://etherscan.io/address/0xce01f8eee7E479C928F8919abD53E553a36CeF67#code).  It is effectively `Promise.allSettled()` for a sequence of `OffchainLookup` reverts.

An additional benefit of the BGP is that the EIP-3668 protocol does not terminate if an inner `OffchainLookup` cannot be satisfied, and instead returns an error for that specific request.

## Specification

The BGP has the following Solidity interface:

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

	* The reverter must provide its own BGP gateway(s).

	* `x-batch-gateway:true` is defined as a placeholder URL, which indicates that the EIP-3668 client may use a local BGP implementation.

1. Upon receiving the callback, decode the response, and propagate the inner callbacks accordingly.  It is the developers responsibility to continue the EIP-3668 process.

### Gateway Response

* The length of `failures` and `responses` must equal the number of `requests`

* `failures[i]` is `false` if the request was a success according to EIP-3668.

* `responses[i]` is the response or error data.

* If an HTTP error is encountered, encode it using `HTTPError`.

* If the URLs are invalid, cannot be fetched, or some other problem occurs, use `Error(string)`.

### Developer Notes

* All compliant BGP gateways are **equivalent**.  If the placeholder URL is present, the client should use the local gateway.

* An `OffchainLookup` with `n` URLs may be split into a single BGP request, containing `n` requests, each with a single URL.

## Rationale

The BGP should be standardized so local BGP implementations are available in client frameworks.

## Backwards Compatibility

The `UniversalResolver` is the only known contract that uses the BGP.  Its design permits client-supplied gateways.  In nearly all implementations, clients are using the default.

Using a local BGP gateway and processing the placeholder URL is a privacy and latency improvement.

## Security Considerations

A local BGP gateway is **always preferable** as a centralized BGP gateway leaks information and adds latency.

BGP gateways **should not be trusted**.  Each individual `OffchainLookup` must secure its own protocol.

## Copyright

<!-- Just leave this how it is -->
Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
