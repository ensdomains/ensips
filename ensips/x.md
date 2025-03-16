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

[EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) describes a singular `OffchainLookup` mechanism.  To perform more than one `OffchainLookup`, they must be handled in sequence.

This proposal standardizes an existing ENS solution, colloquially called the "Batch Gateway", utilized first by the [`UniversalResolver`](https://github.com/ensdomains/ens-contracts/blob/staging/contracts/utils/UniversalResolver.sol).  It is effectively `Promise.allSettled()` for a sequence of `OffchainLookup` reverts.

An additional benefit of the BGP is that the EIP-3668 protocol does not terminate if an inner `OffchainLookup` cannot be satisfied, and instead returns with error for that specific request.

## Specification

The BGP has the following Solidity interface:

```solidity
interface IBatchGateway {
	// selector: 0x01800152
    error HttpError(uint16 status, string message);

    struct Request {
        address sender;
        string[] urls;
        bytes callData;
    }

	// selector: 0xa780bab6
    function query(
        Request[] memory requests
    ) external view returns (bool[] memory failures, bytes[] memory responses);
}
```

1. Given multiple `OffchainLookup()` reverts, translate each error data into a `Request` struct.

	```
	OffchainLookup:                  Request:
	    address sender; --------------> address sender;
	    string[] urls; ---------------> string[] urls;
	    bytes callData; --------------> bytes callData;
	    bytes4 callbackFunction;
	    bytes extraData;
	```

1. Revert with a new `OffchainLookup()`, using `abi.encodeCall(IBatchedGateway.query, <array of requests>)` as the calldata.

	* The reverter must provide its own BGP gateway(s).

	* `x-batch-gateway:true` is defined as a placeholder URL, which indicates that the EIP-3668 client may use a local BGP implementation.

1. Upon receiving the callback, decode the response, and propagate the inner callbacks accordingly.  It is the callers responsibility to continue the EIP-3668 process.

### Gateway Response

* The length of `failures` and `responses` should equal the number of `requests`

* `failures[i]` should be `false` if and only if the request was a success according to EIP-3668.

* `responses[i]` should have the calldata of response.

* If an HTTP error is encountered, encode it using `HTTPError`.

* If the URLs are invalid, cannot be fetched, or some other problem occurs, use `Error(string)`.

### Developer Notes

* All compliant BGP gateways are **equivalent**.  If multiple BGP gateways are supplied, the process order is undefined.
	* If the placeholder URL is present, it should be preferred and the other gateways ignored.

* An `OffchainLookup` with `n` URLs may be split into a single BGP request, containing `n` requests, each with a single URL.

## Rationale

The BGP should be standardized so local versions may be implemented client-side.

## Backwards Compatibility

The `UniversalResolver` is the only known contract that uses the BGP.  Its ABI supports the substitution of a non-default set.  In nearly all implementations, clients utilizing the `UniversalResolver` are using the default gateways.  Providing a local BGP and substituting the placeholder is both a [latency and privacy improvement](#security-considerations).

## Security Considerations

* A local BGP gateway is **always preferable** as a centralized BGP gateway leaks information and adds latency.

* BGP gateways **should not be trusted**.  Each individual `OffchainLookup` must secure its own protocol.


## Copyright

<!-- Just leave this how it is -->
Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
