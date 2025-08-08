---
description: L2 Registry and Resolver Events for Cross-Chain Name Services
contributors:
  - matoken.eth
ensip:
  status: draft
  created: 2025-08-04
---

# ENSIP-X: L2 Registry and Resolver Events for Cross-Chain Name Services

## Abstract

This ENSIP specifies standardized registry and resolver events for L2 and cross-chain name services that build upon ENSIP-16's metadata discovery mechanism. It defines events that support ENS v2's hierarchical registry model on NameChain and provides a framework for independent L2 subname issuing services through enhanced event-based indexing.

## Motivation

As ENS expands to L2 chains and adopts a hierarchical registry model, there is a need for standardized events that allow indexers to track name ownership, registry relationships, and resolver updates across chains. This ENSIP works in conjunction with ENSIP-16, which provides the discovery mechanism via the MetadataChanged event, to create a complete cross-chain name service infrastructure.

## Specification

### Events

#### Registry Events

```solidity
// Emitted when a new subname is registered
event NewSubname(bytes32 indexed labelhash, string label);

// Standard ERC1155 transfer event for name ownership changes
event TransferSingle(
    address indexed operator,
    address indexed from,
    address indexed to,
    uint256 id,
    uint256 value
);

// Standard ERC1155 transfer event for multiple name ownership changes
event TransferBatch(
  address indexed operator,
  address indexed from,
  address indexed to,
  uint256[] ids,
  uint256[] values
)

// Standard ERC721 transfer event for name ownership changes
event Transfer(
  address indexed from,
  address indexed to,
  uint256 tokenId,
)

// Emitted when subregistry is updated
event SubregistryUpdate(
    address indexed registry,
    uint256 indexed id,
    address subregistry
);

// Emitted when resolver is updated
event ResolverUpdate(
    address indexed registry,
    uint256 indexed id,
    address resolver
);
```

NOTE: The registry contract supports either ERC721 (Transfer) or ERC1155 (TransferSingle, TransferBatch)

#### Resolver Events

To keep compatibility with ENS v1, resolver events maintain the same event interface as ENS v1 with one notable difference.

```solidity
// Emitted when address record changes in dedicated resolver
// Note: node is always 0x0000... for alias support
event AddressChanged(
    bytes32 indexed node,
    uint256 coinType,
    bytes newAddress
);

event AddrChanged(
  bytes32 indexed node,
  address a
);

event TextChanged(
    bytes32 indexed node,
    string indexed indexedKey,
    string key,
    string value
);

event ContenthashChanged(
  bytes32 indexed node,
  bytes hash
);
```

To cater for the alias feature enabled by the hierarchical registry model, node can be set as 0x, representing that the record is for any names that uses the resolver. 

The following diagram shows the relationship of each registry and its dedicated resolver.

```mermaid
graph TD
    %% Registry hierarchy
    eth["🏛️ ETH Registry<br/>Contract: 0xabc...123<br/>Manages: .eth TLD"]
    xyz["🏛️ XYZ Registry<br/>Contract: 0xdef...456<br/>Manages: .xyz TLD"]
    foo["🏛️ FOO Registry<br/>Contract: 0x789...abc<br/>Manages: foo subdomain<br/>Parent: eth"]
    example["🏛️ EXAMPLE Registry<br/>Contract: 0x456...def<br/>Manages: example subdomain<br/>Parents: eth, xyz (ALIAS)"]
    
    %% Registry relationships
    eth -->|SubregistryUpdate| foo
    eth -->|SubregistryUpdate| example
    xyz -->|SubregistryUpdate| example

    %% Resolver relationships
    example -.->|ResolverUpdate| resolver_example["🔧 Dedicated Resolver<br/>Contract: 0x111...222<br/>node: 0x000...000 (alias mode)<br/>📍 address: 0xuser...1<br/>📝 text: description='shared resolver'"]
    foo -.->|ResolverUpdate| resolver_foo["🔧 Dedicated Resolver<br/>Contract: 0x333...444<br/>node: 0x000...000 (alias mode)<br/>📍 address: 0xuser...2<br/>📝 text: purpose='foo specific'"]

    %% Styling
    classDef registry fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000,text-wrap:nowrap;
    classDef resolver fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#000,text-wrap:nowrap;
    classDef example fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#000,text-wrap:nowrap;
    class eth,xyz,foo registry;
    class example example;
    class resolver_example,resolver_foo resolver;
```

The ENS v2 contract does not restrict a subregistry from pointing to one of its ancestors in the hierarchy. This causes a circular structure. Indexers should stop indexing if a circular dependency is detected.

#### Indexer Implementation Notes

To prevent circular dependencies and redundant indexing:

1. **Track Visited Registries**: Maintain a set of visited registry addresses when traversing the hierarchy to detect cycles
2. **Skip Redundant Paths**: When a registry is reached through multiple parent registries (alias feature), index it only once
3. **Canonical Path Selection**: For aliased names, indexers should determine a canonical path (e.g., shortest path or first discovered path) to avoid duplicate entries
4. **Cycle Detection**: If a registry's subregistry points to any of its ancestors, stop traversal at that point to prevent infinite loops

Example indexing logic:
```
function indexRegistry(registry, visitedSet, path) {
    if (visitedSet.has(registry)) {
        // Circular dependency detected, stop indexing
        return;
    }
    visitedSet.add(registry);
    
    // Index current registry events
    // Then recursively index subregistries
    for (subregistry of registry.subregistries) {
        indexRegistry(subregistry, visitedSet, path + label);
    }
}
```

### Event Usage Patterns

#### ENS v2 Hierarchical Name Construction

To construct full domain names in the hierarchical model:

1. Start from the root registry and traverse down through subregistries
2. Use `SubregistryUpdate` events to find child registries for each label
3. Query `NewSubname` events at each registry level to get label information
4. Build the complete name by concatenating labels as you traverse down the hierarchy
5. Resolve final records using `ResolverUpdate` and resolver-specific events
6. Resolvers use `node = 0x0000...` to set record 

#### Cross-Chain Name Resolution

For names pointing to L2 chains:

1. Name must first be ejected from L2 to L1 via `TransferSingle`, `TransferBatch`, `Transfer` event
2. L1 resolver emits `MetadataChanged` event (defined in ENSIP-16) with L2 chain information
3. Clients query the specified `graphqlUrl` for L2 name data
4. L2 registries may use either hierarchical or simplified models
5. When using simplified models, then specify node by namehashing the full name.

### Simplified Registry-Resolver Model

#### Overview

For simpler L2 implementations that don't require the full hierarchical registry architecture, contracts can combine registry and resolver functionality into a single contract. This approach is suitable for:
- Independent L2 subname services  
- Flat namespace implementations
- Lightweight name service deployments

#### Implementation Pattern

The simplified model:
1. Combines registry ownership tracking with resolver record storage
2. Emits both registry events (NewSubname, Transfer) and resolver events (AddressChanged, TextChanged, etc.)
3. Uses namehash for node identification instead of hierarchical traversal
4. Maintains compatibility with the standard events defined in this ENSIP

#### Event Emission

In the simplified model:
- `NewSubname` events are emitted when creating subnodes
- `Transfer` events track ownership changes
- Resolver events use the full namehash as the node parameter
- No `SubregistryUpdate` or `ResolverUpdate` events are needed since registry and resolver are combined

#### Example Implementation

```solidity
contract SimplifiedL2Registry is ERC721, AddrResolver {
    mapping(bytes32 => bytes) public names;
    
    function createSubnode(
        bytes32 parentNode,
        string memory label
    ) external returns (bytes32 node) {
        bytes32 labelhash = keccak256(bytes(label));
        uint256 tokenId = uint256(labelhash);
        
        // Registry functionality: mint the NFT
        _mint(msg.sender, tokenId);
        
        // Calculate and store the full node
        node = keccak256(abi.encodePacked(parentNode, labelhash));
        names[node] = abi.encodePacked(names[parentNode], uint8(bytes(label).length), label);
        
        // Emit registry event
        emit NewSubname(labelhash, label);
        emit Transfer(address(0), msg.sender, tokenId);
    }
    
    function setAddr(bytes32 node, address addr) external {
        require(isAuthorised(node), "Not authorized");
        
        // Resolver functionality: store the address
        addresses[node] = addr;
        
        // Emit resolver event with full namehash
        emit AddrChanged(node, addr);
    }
}
```

#### Usage Pattern

1. Contract creates a subname and emits `NewSubname(labelhash, label)`
2. Same transaction can emit resolver events like `AddressChanged(namehash, coinType, address)`
3. Ownership transfers emit standard ERC721/ERC1155 Transfer events
4. All resolver updates use the full namehash for the node parameter

### GraphQL Schema

The following schema should be implemented by L2 indexers to provide a standard interface for querying name data:

```graphql
type Domain {
  id: ID!
  name: String
  namehash: Bytes
  labelName: String
  labelhash: Bytes
  resolvedAddress: Bytes
  subdomains: [Domain!]!
  subdomainCount: Int!
  resolver: Resolver!
  expiryDate: BigInt
  "The account that owns the domain"
  owner: Account!
  # ENS v2 hierarchical registry extensions
  registry: Registry!
  # Enhanced cross-chain metadata
  chainId: BigInt
  l2RegistryAddress: Bytes
  graphqlUrl: String
}

type Registry {
  id: ID!
  domains: [Domain!]!
  subregistryUpdates: [SubregistryUpdate!]!
  resolverUpdates: [ResolverUpdate!]!
}

type Resolver {
  id: ID!
  node: Bytes
  address: Bytes
  domain: Domain
  addr: Bytes
  contentHash: Bytes
  texts: [String!]
  coinTypes: [BigInt!]
}

type Account @entity {
  "The unique identifier for the account"
  id: ID!
  "The domains owned by the account"
  domains: [Domain!]! @derivedFrom(field: "owner")
}
```

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).