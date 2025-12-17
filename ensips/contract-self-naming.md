---
title: Contract Self-Naming
description: A standard for contracts to declare their own reverse names using ERC-8049 metadata
contributors:
  - premm.eth
ensip:
  created: "2025-11-23"
  status: draft
---

# ENSIP-XX: Contract Self-Naming

## Abstract

This ENSIP extends ENSIP-19 to enable contracts to declare their own reverse names using ERC-8049 contract metadata. By storing a reverse name in a known storage location via ERC-8049's Optional Diamond Storage extension, contracts can self-declare their ENS name. Any account can then register this name using the reverse registrar on L1, or using an L2 reverse registrar. This enables trustless, permissionless reverse name registration for contracts without requiring the contract deployer to perform additional registration steps.

## Motivation

Current reverse name registration requires the contract owner (when there is one) to perform a separate transaction to set the reverse name after deployment. Alternatively, the contract can make a custom external call in the constructor. This ENSIP enables contracts to declare their reverse ENS name during deployment using ERC-8049 metadata with predictable Diamond Storage locations. Any account can then trustlessly verify the declaration and permissionlessly register the contract's reverse name in the registrar, removing the burden from contract deployers.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Contract Requirements

#### ERC-8049 Implementation

Contracts MUST implement ERC-8049 with the Optioinal Diamond Storage extension to declare their reverse name. The metadata key `"eth.ens.reverse-name"` MUST be used to store the reverse name.

**Storage Location**: ERC-8042 defines the diamond storage slot for the ERC-8049 Optional Diamond Storage metadata mapping:

```solidity
bytes32 baseSlot = keccak256("erc8049.contract.metadata.storage");
// = 0x7c6988a1b2cb39fbaff1c9413b7b80ed9241f1bdbe6602ef83baf9d6673fd50a
```

This slot contains a struct comprising a `mapping(string key => bytes value)` called `metadata`. The reverse name is stored at the mapping key `"eth.ens.reverse-name"`.

The actual storage slot for the reverse name value is computed as:

```solidity
bytes32 keyHash = keccak256(bytes("eth.ens.reverse-name"));
bytes32 storageSlot = keccak256(abi.encode(keyHash, baseSlot));
```

For the key `"eth.ens.reverse-name"`:
```solidity
keyHash = keccak256(bytes("eth.ens.reverse-name"))
        = 0x09ded414ae6c0ce389342caf0619071d5be1687a6f7314e74bcc7cfa1a0df4bf

storageSlot = keccak256(abi.encode(0x09ded414ae6c0ce389342caf0619071d5be1687a6f7314e74bcc7cfa1a0df4bf, 0x7c6988a1b2cb39fbaff1c9413b7b80ed9241f1bdbe6602ef83baf9d6673fd50a))
            = 0x94270372dde1798328336feac81168e7d959b12f3d2497d26f9e1b935b793b3b
```

**Value Format**: The value MUST be stored as `bytes` containing the UTF-8 string representation of the ENS name (e.g., `bytes("mycontract.eth")`).

#### Setting the Reverse Name

Contracts MAY set their reverse name during deployment (in the constructor or initialization function):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC8049ContractMetadata} from "./ERC8049ContractMetadata.sol";

contract MyContract is ERC8049ContractMetadata {
    constructor() {
        // Declare the contract's reverse name
        _setContractMetadata("eth.ens.reverse-name", bytes("mycontract.eth"));
    }
}
```

## Rationale

Using ERC-8049 with its Optional Diamond Storage extension provides a standardized, low-friction method for contracts to declare their ENS names through predictable storage locations that enable trustless verification. This approach eliminates deployment friction by allowing contracts to self-declare their identity during initialization without requiring separate registration transactions. The permissionless registration model allows any account to complete the registration process, making it ideal for admin-free contracts while maintaining security through cryptographic verification. This standardization also ensures composability with other ERC-8049 metadata and enables efficient single-slot verification for names under 32 characters.

## Security Considerations

None.

## Backwards Compatibility

This ENSIP is fully backwards compatible with ENSIP-19. Contracts without ERC-8049 implementations continue to use traditional reverse registration. L2 registrars can support both traditional registration and contract self-naming simultaneously.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## References

* ENSIP-19: Multichain Primary Names
* ERC-8049: Contract-Level Onchain Metadata
* ERC-8042: Diamond Storage

