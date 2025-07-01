---
# Description of the proposal
description: A standard for adding verifiable metadata to smart contracts, enabling enhanced searchability and trust through ENS-based verification.
# List of ens names or github handles of contributors
contributors:
  - BloclabsHQ
  - cristian@madgeniusblink.com
  - uzzolsse
ensip:
  # Date of creation
  created: '2024-12-07'
  # Status of the proposal, draft by default, updated by the editors
  status: draft
---

# ENSIP-X: ENS Metadata Standard for Smart Contracts

## Abstract

This ENSIP proposes a standard for associating ENS names with smart contracts through a metadata management contract. The ENSMetadata contract allows contract owners to set metadata (title, description, ENS name, social media links, and external data URI) and verify the ENS name's ownership and resolution to the contract's address. This standard aims to enhance discoverability and trust in smart contracts by leveraging ENS as a decentralized naming system.

## Motivation

As the Ethereum ecosystem grows, the need for standardized methods to associate human-readable names with smart contracts becomes increasingly important. ENS provides a decentralized naming system, but there's no standard way to link ENS names with contract metadata in a verifiable manner.

Smart contracts currently lack a standardized way to provide human-readable information about themselves. This creates several challenges:

1. **Discoverability**: Users struggle to find and identify contracts without relying on centralized services.
2. **Trust Verification**: There's no standardized way to verify that a contract is associated with a specific ENS domain.
3. **Metadata Consistency**: Different platforms display contract information inconsistently due to lack of standards.
4. **Social Connections**: Users can't easily connect contracts to their creators' social presence.
5. **Extensibility**: On-chain storage constraints limit the amount and types of metadata that can be associated with a contract.

The ENSMetadata standard addresses these issues by providing:
- A consistent structure for storing essential contract metadata on-chain
- Verifiable links between contracts and ENS domains
- Standard methods to retrieve and update metadata
- Support for social media links to connect with developers and communities
- An extensible off-chain metadata system via the external data URI

## Specification

The ENSMetadata contract MUST implement the following functions and events:

### Data Structures

```solidity
struct Metadata {
    string title;
    string description;
    string ENS_name;
    bool verification;
    string[] socialMediaLinks;
    string externalDataURI;
    uint256 lastUpdated;
}
```

### Required Functions

#### Constructor
```solidity
constructor(
    string memory _title, 
    string memory _description, 
    string memory _ENS_name, 
    address _ensRegistry,
    string[] memory _socialMediaLinks,
    string memory _externalDataURI
)
```

- **Description**: Initializes the contract with metadata and ENS registry address.

#### Metadata Management
```solidity
function setMetadata(
    string memory _title,
    string memory _description,
    string memory _ENS_name,
    string[] memory _socialMediaLinks,
    string memory _externalDataURI
) public
```

- **Description**: Updates the contract's metadata and resets the verification status.

```solidity
function setSocialMediaLinks(string[] memory _socialMediaLinks) public
```

- **Description**: Updates only the social media links, preserving other metadata.

```solidity
function setExternalDataURI(string memory _externalDataURI) public
```

- **Description**: Updates only the external data URI, preserving other metadata.

#### ENS Verification
```solidity
function verifyENS() external returns (bool)
```

- **Description**: Verifies that the caller owns the ENS name and that it resolves to the contract's address. Updates the verification status upon success.

#### Getter Functions
```solidity
function getMetadata() public view returns (
    string memory title,
    string memory description,
    string memory ENS_name,
    bool verification,
    string[] memory socialMediaLinks,
    string memory externalDataURI,
    uint256 lastUpdated
)
```

- **Description**: Retrieves all metadata fields.

```solidity
function getSocialMediaLinks() public view returns (string[] memory)
```

- **Description**: Retrieves only the social media links.

```solidity
function getExternalDataURI() public view returns (string memory)
```

- **Description**: Retrieves only the external data URI.

```solidity
function getLastUpdated() public view returns (uint256)
```

- **Description**: Retrieves the last update timestamp.

### Required Events

```solidity
event MetadataUpdated(
    string title, 
    string description, 
    string ENS_name, 
    bool verification,
    string[] socialMediaLinks,
    string externalDataURI,
    uint256 lastUpdated
)
```

- **Emitted**: When metadata is updated or verified.

```solidity
event SocialMediaLinksUpdated(string[] socialMediaLinks)
```

- **Emitted**: When social media links are updated.

```solidity
event ExternalDataURIUpdated(string externalDataURI)
```

- **Emitted**: When the external data URI is updated.

### ENS Verification Process

The ENS verification process MUST:
1. Check that the ENS name is set and non-empty.
2. Compute the namehash of the ENS name.
3. Verify the caller is the owner of the ENS name through the ENS registry.
4. Check that the ENS name has a resolver set.
5. Verify that the resolver resolves the ENS name to the contract's address.
6. Update the verification status to true if all checks pass.

### External Data URI

The `externalDataURI` field SHOULD point to a JSON file containing extended metadata about the ENS name and associated contract. This enables:

1. **Rich Metadata**: Storing additional information that would be too costly to keep on-chain.
2. **Structured Data**: Following a standardized JSON schema for consistency across applications.
3. **Media Resources**: Links to logos, images, and other media assets.
4. **Extended Documentation**: Comprehensive documentation about the contract's purpose and functionality.
5. **Custom Attributes**: Domain-specific attributes relevant to the particular contract type.

Possible JSON schema for the external data:

```json
{
  "name": "Contract Name",
  "description": "Extended description of the contract",
  "image": "https://example.com/logo.png",
  "external_url": "https://example.com",
  "attributes": [
    {
      "trait_type": "Category",
      "value": "DeFi"
    },
    {
      "trait_type": "Version",
      "value": "1.0"
    }
  ],
  "links": {
    "documentation": "https://docs.example.com",
    "github": "https://github.com/example/repo",
    "forum": "https://forum.example.com"
  },
  "custom_data": {
    // Contract-specific additional data
  }
}
```

The URI SHOULD preferably point to decentralized storage such as IPFS, Arweave, or other content-addressed systems to maintain the decentralized nature of the metadata.

## Rationale

This standard separates metadata management and ENS verification into libraries to promote modularity and reusability. The design choices made in this standard include:

1. **Metadata Structure**: The metadata fields were chosen to provide essential information about contracts while remaining lightweight.

2. **ENS Verification**: By requiring the ENS name to resolve to the contract's address and the caller to be the owner of the ENS name, we ensure a strong association between the ENS name and the contract.

3. **Social Media Links**: Including social media links helps users connect contracts to their developers and communities, enhancing trust.

4. **External Data URI**: The external data URI allows for richer metadata that would be inefficient to store on-chain, such as images, detailed documentation, or additional schemas. This two-tier approach (on-chain essential data + off-chain extended data) provides flexibility while maintaining gas efficiency.

5. **Timestamp Tracking**: The lastUpdated field provides auditability by tracking when metadata was last modified.

6. **Events**: The use of events facilitates off-chain indexing and monitoring, which is essential for decentralized applications that rely on real-time data.

## Backwards Compatibility

This proposal introduces a new standard and does not affect existing contracts or ENS functionalities. Contracts that do not implement the ENSMetadata interface will continue to function as before. Adoption of this standard is voluntary, and existing contracts can integrate it through upgrades or by deploying new contracts that implement the interface.

## Security Considerations

1. **ENS Registry Trust**: The contract relies on the ENS registry to verify ownership of an ENS name. If the ENS registry is compromised, this could affect the verification process.

2. **Resolver Trust**: The ENS resolver's correctness is assumed. A malicious resolver could return incorrect addresses, leading to false verification.

3. **Permissions Control**: Implementers should consider adding access control mechanisms to determine who can update the metadata.

4. **Data Size Considerations**: Large metadata fields like extensive social media links arrays could lead to high gas costs.

5. **External Data URI Security**: The external data URI should point to trustworthy sources, preferably decentralized storage solutions like IPFS or Arweave. Applications consuming this data should implement appropriate validation to protect against malicious content.

6. **URI Availability**: Applications using this standard should handle cases where the external data URI content might be unavailable or malformed.

## Reference Implementations

The following repositories provide reference implementations and examples for using this standard:

1. **Standard Implementation**: [ENS Metadata Standard](https://github.com/BloclabsHQ/ens-metadata-standard) - A reference implementation of the ENS Metadata contract and related libraries.

2. **Real-world Usage Examples**: [ENS Metadata Showcase](https://github.com/BloclabsHQ/ens-metadata-showcase) - Examples demonstrating how to use the ENS Metadata Standard in real-life token implementations.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/). 