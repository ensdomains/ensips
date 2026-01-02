---
title: Contract Self-Naming
description: A standard for contracts to declare their own reverse names using ERC-8042 Diamond Storage
contributors:
  - premm.eth, raffy.eth
ensip:
  created: "2025-11-23"
  status: draft
---

# ENSIP-X: Contract Self-Naming

## Abstract

This ENSIP extends ENSIP-19 to enable contracts to declare their own reverse names using ERC-8042 Diamond Storage. By storing a namehash of the reverse name in a known storage location, contracts can self-declare their ENS name. Any account can then register this name using the reverse registrar on L1, or using an L2 reverse registrar. This enables trustless, permissionless reverse name registration for contracts without requiring the contract deployer to perform additional registration steps.

## Motivation

Current reverse name registration requires the contract owner (when there is one) to perform a separate transaction to set the reverse name after deployment. Alternatively, the contract can make a custom external call in the constructor. This ENSIP enables contracts to declare their reverse ENS name during deployment using ERC-8042 Diamond Storage with predictable storage locations. Any account can then trustlessly verify the declaration and permissionlessly register the contract's reverse name in the registrar, removing the burden from contract deployers.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Contract Requirements

#### ERC-8042 Diamond Storage Implementation

Contracts MUST use ERC-8042 Diamond Storage to declare their reverse name. The diamond storage identifier `"eth.ens.reverse-name"` MUST be used to store the reverse name.

**Storage Location**: The storage slot is computed using ERC-8042 Diamond Storage:

```solidity
bytes32 storageSlot = keccak256("eth.ens.reverse-name");
// = 0x09ded414ae6c0ce389342caf0619071d5be1687a6f7314e74bcc7cfa1a0df4bf
```

**Value Format**: The value MUST be stored as `bytes32` containing the namehash of the ENS name.

#### Setting the Reverse Name

Contracts MAY set their reverse name during deployment (in the constructor or initialization function):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract MyContract {
    bytes32 constant STORAGE_POSITION = keccak256("eth.ens.reverse-name");

    /// @custom:storage-location erc8042:eth.ens.reverse-name
    struct ReverseNameStorage {
        bytes32 reverseNameHash;
    }

    function getStorage() internal pure returns (ReverseNameStorage storage s) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            s.slot := position
        }
    }

    constructor() {
        // Declare the contract's reverse name using ERC-8042 Diamond Storage
        // `namehash(...)` refers to the ENS Namehash algorithm.
        getStorage().reverseNameHash = namehash("mycontract.eth");
    }
}
```

## Rationale

Using ERC-8042 Diamond Storage provides a simple, standardized method for contracts to declare their ENS names through predictable storage locations that enable trustless verification. This approach eliminates deployment friction by allowing contracts to self-declare their identity during initialization without requiring separate registration transactions. The permissionless registration model allows any account to complete the registration process, making it ideal for admin-free contracts while maintaining security through cryptographic verification. By storing the namehash directly in a single slot, this approach is more gas-efficient and simpler to implement than metadata mapping approaches.

## Security Considerations

None.

## Backwards Compatibility

This ENSIP is fully backwards compatible with ENSIP-19. Contracts without ERC-8042 Diamond Storage implementations continue to use traditional reverse registration. L2 registrars can support both traditional registration and contract self-naming simultaneously.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## References

* ENSIP-19: Multichain Primary Names
* ERC-8042: Diamond Storage

