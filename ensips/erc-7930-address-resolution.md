---
description: A resolver function for resolving ERC-7930 addresses
contributors:
  - premm.eth
ensip:
  created: "2025-01-15"
  status: draft
---

# ENSIP-XX: ERC-7930 Address Resolution

## Abstract

This ENSIP introduces a resolver function for resolving ENS names to ERC-7930 addresses. The function accepts a chain identifier and returns the corresponding address for that chain, allowing clients to resolve the necessary components to compose full ERC-7930 Interoperable Addresses from ENS names. This complements existing address resolution methods and provides a standardized approach for resolving addresses across different blockchains.

## Motivation

ERC-7930 defines a standardized binary format for representing blockchain addresses. As multichain applications become more common, there is a need for a universal way to resolve interoperable addresses using ERC-7930. This ENSIP provides a resolver function that complements the existing `addr()` (ENSIP-1) and `addr(coinType)` (ENSIP-9) functions, enabling standardized resolution of ENS names to ERC-7930 addresses.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Terminology

This ENSIP uses the following terms as defined by ERC-7930:

- `**erc7930Chain**`: The chain identifier portion of an ERC-7930 Interoperable Address, from the version bytes through ChainReference
- `**erc7930Addr**`: The address portion of an ERC-7930 Interoperable Address (consisting of address length and address bytes)
- **ERC-7930 Interoperable Address**: The complete ERC-7930 address, constructed by concatenating `erc7930Chain` and `erc7930Addr`

### Resolver Function

A new resolver function is defined:

```solidity
function erc7930Addr(bytes32 node, bytes calldata erc7930Chain) external view returns (bytes memory);
```

The EIP-165 interface ID for this function is `0xc0015e2a`.

Resolvers implementing `erc7930Addr()` MUST implement `supportsInterface(bytes4)` as specified in ENSIP-1, and MUST return `true` for the interface ID `0xc0015e2a` when queried.

When called on a resolver, this function MUST return the `erc7930Addr` for the specified node and `erc7930Chain`. If no address is set for the specified node and `erc7930Chain`, the function MUST return an empty bytes array.

### Parameters

- `node`: The namehash of the ENS name to resolve.
- `erc7930Chain`: The chain identifier portion of the ERC-7930 address, as defined in the Terminology section above.

### Return Value

The return value MUST be `bytes` containing the `erc7930Addr` as defined in the Terminology section above.

The full ERC-7930 Interoperable Address can be constructed by concatenating:

```
erc7930Chain | erc7930Addr
```

### Example

For an Ethereum address on mainnet, if the ENS name resolves to `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`, calling:

```solidity
erc7930Addr(node, 0x000100000101)
```

Would return the `erc7930Addr`:

```
0x14d8da6bf26964af9d7eed9e03e53415d37aa96045
```

The full ERC-7930 Interoperable Address is constructed by concatenating the `erc7930Chain` parameter with the returned `erc7930Addr`:

```
0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045
```

### Consistency Requirements

If a resolver supports both `erc7930Addr()` and `addr()` or `addr(coinType)`, it MUST ensure that these functions return consistent addresses for the same chain.

### Setter Function

Resolvers implementing `erc7930Addr()` MUST provide the following function for setting ERC-7930 addresses:

```solidity
function setErc7930Addr(bytes32 node, bytes calldata erc7930Chain, bytes calldata erc7930Addr);
```

`setErc7930Addr` adds or replaces the `erc7930Addr` for the given node and `erc7930Chain`. The `erc7930Addr` parameter MUST contain the `AddressLength` byte followed by the `Address` bytes, matching the format returned by `erc7930Addr()`.

When `setErc7930Addr` is called, the resolver MUST emit the `ERC7930AddrChanged` event (see Events section below).

If a resolver also supports `addr()` or `addr(coinType)`, calling `setErc7930Addr()` MUST also update the corresponding `addr()` or `addr(coinType)` records and emit the appropriate events from ENSIP-1 and ENSIP-9.

### Events

Resolvers implementing `erc7930Addr()` MUST emit the following event when ERC-7930 addresses are changed:

```solidity
event ERC7930AddrChanged(bytes32 indexed node, bytes erc7930IntAddress);
```

Where `erc7930IntAddress` is the full ERC-7930 Interoperable Address constructed by concatenating `erc7930Chain || erc7930Addr`.

This event MUST be emitted every time `setErc7930Addr` is called, regardless of whether the resolver also supports `addr()` or `addr(coinType)`.

### Example Implementation

A basic example implementation of a resolver that supports `erc7930Addr()`:

```solidity
pragma solidity ^0.8.0;

contract ERC7930Resolver is ResolverBase {
    bytes4 constant private ERC7930_ADDR_INTERFACE_ID = 0xc0015e2a;

    event ERC7930AddrChanged(bytes32 indexed node, bytes erc7930IntAddress);

    mapping(bytes32 => mapping(bytes => bytes)) _erc7930Addrs;

    function erc7930Addr(bytes32 node, bytes calldata erc7930Chain) external view returns (bytes memory) {
        return _erc7930Addrs[node][erc7930Chain];
    }

    function setErc7930Addr(bytes32 node, bytes calldata erc7930Chain, bytes calldata erc7930Addr) external authorised(node) {
        _erc7930Addrs[node][erc7930Chain] = erc7930Addr;
        bytes memory erc7930IntAddress = abi.encodePacked(erc7930Chain, erc7930Addr);
        emit ERC7930AddrChanged(node, erc7930IntAddress);
    }

    function supportsInterface(bytes4 interfaceID) public pure returns(bool) {
        return interfaceID == ERC7930_ADDR_INTERFACE_ID || super.supportsInterface(interfaceID);
    }
}
```

## Rationale

This design allows resolvers to store addresses efficiently by separating the `erc7930Chain` from the `erc7930Addr` component. When a resolver supports multiple address resolution interfaces, the consistency requirements ensure that clients can use any of the supported resolution methods interchangeably.

## Backwards Compatibility

Resolvers implementing `erc7930Addr()` are not required to support `addr()` or `addr(coinType)`. If a resolver supports multiple address resolution interfaces, it MUST maintain consistency between them as specified in the Consistency Requirements section above.

## Security Considerations

None.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).