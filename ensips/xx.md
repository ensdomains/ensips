---
title: Passthrough Resolution
description: A mechanism for resolvers to delegate queries to a previous resolver, enabling resolver upgrades without record migration.
contributors:
  - jkm.eth
ensip:
  created: '2026-07-02'
  status: draft
---

# ENSIP-X: Passthrough Resolution 

## Abstract

This ENSIP defines a standard by which a resolver may designate another resolver as a "passthrough" resolver. When the resolver receives a resolution query for which it holds no record, it forwards the query to the next resolver in the chain that supports the query type and returns the result to the caller. Because each passthrough target may itself designate a further passthrough resolver, resolvers of increasing functionality can be daisy-chained together, with the newest resolver able to answer queries for all records set on any downstream resolver in the chain.

The standard resolution methods retain their existing signatures and forward silently, so the mechanism is invisible to existing ENS clients. Two new methods expose the passthrough resolver's address and query a resolver's own records without passthrough, making it possible to locate which resolver in a chain contains a given record.

## Motivation

The ENS Registry associates each node with exactly one resolver. Resolver capabilities have grown over time: the original address records (ENSIP-1) have been joined by text records (ENSIP-5), multichain addresses (ENSIP-9), data records (ENSIP-24), and more. New methods will continue to be introduced in the future.

Today, a name owner who wishes to adopt a resolver with new functionality must deploy or select a new resolver contract, update the registry to point at it, and then re-set every existing record on the new contract. This operation can be costly and error-prone, which supresses the adoption of new resolver upgrades.

This ENSIP removes the migration step entirely. The new resolver is deployed with its passthrough set to the old resolver's address, and the registry is updated to point at the new resolver. All previously-set records remain resolvable through the new resolver, while new records (and updates to old ones) are written to the new resolver. The upgrade can be repeated indefinitely, with each new resolver chaining to its predecessor.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### Overview

Passthrough resolution involves a resolver contract that stores the address of at most one other resolver, its *passthrough resolver*. A sequence of resolvers linked in this way is a *resolver chain*, beginning with the *head resolver* (the one set in the ENS Registry) and ending with a *tail resolver* (one which does not implement this specification, or which designates no passthrough resolver).

### Resolver Interface

Resolvers that offer passthrough resolution MUST implement the following interface:

```solidity
interface IPassthroughResolver {
    /// @notice Returns the address of the passthrough resolver.
    /// @return The passthrough resolver address, or the zero address if none is set.
    function passthroughResolver() external view returns (address);

    /// @notice Resolves a record from this resolver's own storage only,
    ///         without consulting the passthrough resolver.
    /// @param data The ABI-encoded calldata for a resolution function
    ///        (e.g. the encoding of `addr(namehash(name))` or
    ///        `text(namehash(name), key)`).
    /// @return result The ABI-encoded return data of the resolution function
    ///         if this resolver holds a record answering the query, or
    ///         zero-length bytes if it does not.
    function resolveWithoutPassthrough(bytes calldata data)
        external
        view
        returns (bytes memory result);
}
```

The [EIP-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of this interface is `0x661a23b6`. A resolver implementing this specification MUST return `true` when `supportsInterface()` is called with this ID.

### Passthrough Resolution

When a resolver following this specification receives a call to a resolution method it supports, it MUST perform the following steps in this order (if a step returns a value, do not continue to the next step):

1. If the resolver holds a non-zero record answering the query in its own storage, return that record.
2. If the resolver has no passthrough resolver set, return the zero value for the method's return type.
3. Call `supportsInterface()` on the passthrough resolver with the [EIP-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the method being queried. If the passthrough resolver implements the method, forward the identical call (same function selector and arguments) to the passthrough resolver and return the forwarded call's return value unchanged.
4. Call `supportsInterface()` on the passthrough resolver with the [EIP-165](https://eips.ethereum.org/EIPS/eip-165) interface ID for passthrough resolution (this ENSIP). If the passthrough resolver does not implement passthrough resolution, return the zero value for the method's return type.
5. Call `passthroughResolver()` on the passthrough resolver to get the address of the next resolver in the chain. If the next resolver is the zero address, return the zero value for the method's return type.
6. Return to step 3, using the latest passthrough resolver address, until the chain is ended.

Because the forwarded call is identical in signature and semantics to the original, the passthrough target may be any existing resolver. It does not need to implement or be aware of this specification. If the target itself implements this specification, resolution recurses down the chain until a resolver holds the record or the chain ends, and the value found (or the zero value) propagates back to the original caller.

### Non-passthrough Queries

`resolveWithoutPassthrough(data)` answers a query from the resolver's own storage only:

* `data` is the ABI-encoded calldata for a resolution function, exactly as it would be supplied in a direct call to the resolver (this mirrors the `data` argument of `resolve()` in ENSIP-10).
* If the resolver holds a record answering the query, it MUST return the ABI-encoded return data of the resolution function.
* If it does not, it MUST return zero-length bytes.
* If `data` encodes a resolution function the resolver does not implement, it MUST revert, matching the behavior of calling the resolver directly with that method.

### Updating and Deleting Records

Changing an existing record to a new, non-empty value can be done by writing to the head resolver, as records stored in the head resolver take precedence during a query. However, stale data stored in a downstream resolver will still be visible if that resolver is queried directly. If the user wishes to fully remove stale data, outdated records must be cleared on all downstream resolvers.

Similarly, to delete a record entirely such that it returns an empty value when the head resolver is queried, corresponding records must be cleared in all downstream resolvers to ensure the passthrough chain does not find any non-empty values.

The methods introduced by this interface can be used to walk through a chain of resolvers and find which ones have a particular value set, resulting in a list of resolvers for which the value can be cleared:

```javascript
// calldata: ABI-encoded resolution call, e.g. text(namehash(name), key)
function findResolversWithRecord(node, calldata) {
    const found = [];
    let resolver = ens.resolver(node);
    while (resolver !== ZERO_ADDRESS) {
        if (!resolver.supportsInterface('0x661a23b6')) {
            // Terminal, non-passthrough resolver: query it directly.
            try {
                const result = resolver.call(calldata);
                if (!isZeroValue(result)) {
                    found.push(resolver);
                }
            } catch {
                // Resolver does not implement the queried method.
            }
            break;
        }
        try {
            const result = resolver.resolveWithoutPassthrough(calldata);
            if (result.length > 0) {
                found.push(resolver);
            }
        } catch {
            // Resolver does not implement the queried method; continue down the chain.
        }
        resolver = resolver.passthroughResolver();
    }
    return found;
}
```

### Passthrough Resolver Address Mutability

Since resolver contracts with passthrough functionality are meant to be an upgrade or expansion to an existing, known resolver, the value of `passthroughResolver` SHOULD be set at the time of contract deployment and SHOULD be immutable. If there is a good reason for the value to be mutable, the contract MUST put access controls in place to ensure the value is not updated in a reckless manner, and SHOULD emit the following event on change:

```solidity
event PassthroughResolverChanged(address previousResolver, address newResolver);
```

## Backwards Compatibility

This specification requires no changes to the ENS Registry, existing resolvers, or ENS clients. All standard resolution methods keep their existing signatures and return types; passthrough occurs silently inside the resolver. Any existing resolver can serve as a passthrough target without modification. Legacy management tools that are unaware of this specification can read and write records on the head resolver without breaking functionality. One exception is legacy tools that attempt to delete a record that exists in a downstream resolver: these tools will attempt to set an empty value on the head resolver, which is not sufficient. This tradeoff seems acceptable, as we expect users who update their registry to use a passthrough resolver will also be aware of this aspect and will use the correct tools when attemping to update records in the future.

## Security Considerations

### Trust in the chain

A name owner who points their name at a passthrough resolver is trusting every contract in the chain to resolve records on their behalf. If any resolver in the chain feature a mutable passthrough address, the name owner is essentially giving control of record resolution to whomever has permissions to update that address. Owners SHOULD verify the full chain before adopting a passthrough resolver, and SHOULD prefer immutable passthrough addresses where practical.

### Circular chains and chain length

A chain of resolvers in which the tail resolver points back to an upstream resolver will cause unbounded recursion, resulting in failed queries. Potential damage is limited to names that point to a circular resolver chain, and the issue can always be remedied by users updating their names to point to a new head resolver. Tools that assist with deploying passthrough resolvers and resolvers with mutable passthrough addresses SHOULD reject an address that would result in a chain that loops back on itself.

Very long resolver chains will cost increased gas to query. This issue can be solved by migrating existing records to a shorter resolver chain.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
