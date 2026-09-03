---
title: Contract Self-Naming
description: Two interfaces for contracts to name themselves or delegate naming authority for ENSIP-19 reverse resolution
contributors:
  - premm.eth, raffy.eth
ensip:
  created: "2025-11-23"
  status: draft
---

# ENSIP-X: Contract Self-Naming

## Abstract

This ENSIP extends [ENSIP-19](./19) with two interfaces that let contracts control their own reverse names. A contract that implements `IContractName` declares its chosen ENS name through a view function and emits a `ContractNameSet` event when that name changes, so indexers and resolvers can discover and follow the contract's name directly. A contract that implements `IContractNamer` delegates naming authority to one or more addresses through a single function dedicated to naming, generalizing the previous Ownable-only delegation pattern.

## Motivation

Today, a contract can have its reverse name set in two main ways. The contract itself can call the reverse resolver, either on deployment from its constructor or from a later transaction. The contract can also implement the Ownable interface and let `owner()` set the name through the reverse registrar. This ENSIP adds two ENS-specific options that give contract authors more flexibility.

A contract can name itself by publishing its own ENS name. The name is exposed through a view function and announced through an event, so indexers and resolvers that support this interface can discover and follow the name directly.

A contract can also delegate naming authority to any address or set of addresses through a function dedicated to naming, which is independent of Ownable's broader semantics like ownership transfer, renouncement, and a privileged role over the contract's other functionality. This supports multisigs, role-based access controls, and other custom authorization patterns.

Both options enable permissionless reverse name registration and let contract authors choose the lightest mechanism that fits their design.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A contract MAY implement `IContractName`, `IContractNamer`, or both. A contract that implements either interface MUST conform to its specification below. Implementations SHOULD advertise the interface through ERC-165 for reliable detection.

### `IContractName`

ERC-165 interface identifier: `0x75d0c0dc`.

```solidity
interface IContractName {
    /// @notice Emitted when the contract's name is set or changed.
    event ContractNameSet(string name);

    /// @notice The unverified ENS name for this contract, e.g. "mycontract.eth".
    function contractName() external view returns (string memory);
}
```

A contract implementing `IContractName` declares the ENS name it wishes to use for reverse resolution. The returned name is unverified and MUST be verified through ENSIP-19 forward resolution before it is trusted. Indexers and resolvers that support `IContractName` discover the name directly from the contract. No registration in the reverse registry is required.

A contract implementing `IContractName` MUST emit `ContractNameSet(string name)` whenever the value returned by `contractName()` changes, including the initial value set at deployment.

### `IContractNamer`

ERC-165 interface identifier: `0x6f3ff726`.

```solidity
interface IContractNamer {
    /// @notice Determine if an account is authorized to name this contract.
    function isContractNamer(address namer) external view returns (bool);
}
```

A contract implementing `IContractNamer` delegates naming authority to any address for which `isContractNamer(namer)` returns true. The reverse registrar MUST consult this function to authorize a name change request.

### Reverse Registrar Behavior

Because authorizing a name change has security implications, a reverse registrar MUST detect implementations of `IContractNamer` through ERC-165.

When a caller submits a name change for a contract that implements `IContractNamer`, the registrar MUST call `isContractNamer(caller)` on the contract. If the call returns true, the registrar MUST set the reverse record to the supplied name.

A contract MAY implement both `IContractName` and `IContractNamer`. The two paths operate independently. `IContractName` is read directly by indexers and resolvers that support it. `IContractNamer` is consulted by the reverse registrar to authorize name changes.

### Precedence

If both a reverse record in the reverse resolver registry and an `IContractName.contractName()` value exist for the same contract address, the reverse resolver registry takes precedence. Consumers MUST use the value from the reverse resolver registry in this case. When no reverse record is set in the reverse resolver registry, consumers MAY fall back to `IContractName.contractName()`.

## Rationale

The two interfaces serve distinct trust models. `IContractName` allows a contract to declare a single canonical name with no external authorization required for registration, which fits immutable or admin-free contracts. `IContractNamer` allows a contract to delegate naming to addresses of its choice, which generalizes the previous Ownable-based pattern and accommodates multisigs, role-based access, and custom authorization logic.

`IContractName` is fully self-contained. The contract publishes its name and emits an event, which indexers and resolvers that support this interface can use to discover and follow the name. No on-chain reverse-registry transaction is required. This makes self-naming the lightest mechanism for a contract to declare its identity.

Separating the two interfaces keeps each one minimal and explicit. A contract that wants both flexibility and a default canonical name may implement both. A contract that is fully immutable can implement only `IContractName` and never expose a delegated naming surface.

## Security Considerations

The value returned by `contractName()` is unverified. Consumers, including indexers, resolvers, and applications, MUST verify the declared name through ENSIP-19 forward resolution before treating it as a reliable identifier.

Consumers SHOULD use ERC-165 to confirm that a contract implements `IContractName` or `IContractNamer` before invoking its methods. Without this check, a consumer may misinterpret a colliding function selector on a contract that does not implement this ENSIP, which for `IContractNamer` can cause a reverse registrar to incorrectly authorize a name change.

`isContractNamer` is fully under the contract's control. A contract that returns true for every address effectively grants open naming authority, which may not be the intended behavior. Reverse registrars cannot detect this misconfiguration on behalf of the contract.

## Backwards Compatibility

This ENSIP is fully backwards compatible with ENSIP-19. Contracts that do not implement either interface continue to use existing reverse registration flows.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## References

* ENSIP-19: Multichain Primary Names
* ERC-165: Standard Interface Detection
