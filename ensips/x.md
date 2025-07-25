---
description: Decentralized services for dapps
contributors:
  - jthor.eth
ensip:
  created: '2025-07-25'
  status: draft
---

# ENSIP-X: DService Text Records

## Abstract

This ENSIP defines a standard for registering and retrieving *dservice* URLs.

## Motivation

Besides talking to an Ethereum rpc endpoint, most decentralized applications usually rely on some sort of indexer or similar auxiliary services. Unfortunately this leads to centralization since this service usually is hardcoded into the app (even if the app frontend itself is hosted in a decentralized way, e.g. using ENS + IPFS.

## Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”,  “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “NOT RECOMMENDED”, “MAY”, and  “OPTIONAL” in this document are to be interpreted as described in RFC  2119 and RFC 8174.

### Retrieving DService URLs

To retrieve the list of Service URLs for a given ENS name, the client MUST first look up the resolver for the name and call `.text(namehash(name), 'dservice')` on it to retrieve the avatar URI for the name.

The client MUST treat the absence of a resolver, an revert when calling the `text` method on the resolver, or an empty string returned by the resolver identically, as a failure to find a valid dservice URL list.

### General Format

The `dservice` text field MUST be a list of valid URLs (*rfc1738*), separated by a newline character (`\n`). Clients MUST ignore invalid URLs, treating them as if that URL was not provided.

It is RECOMMENDED that the URL protocol *scheme* is `https`.

### DService Definition

A decentralized service, or dservice for short, is a backend service that  provides the dapp with specialized functionality beyond what is provided through ethereum RPCs and bundlers. Each dapp MAY implement one dservice (it MUST NOT implement more than one) and it is RECOMMENDED to  provide multiple endpoints for this service that are hosted on independent infrastructure (these URLs are to be provided in the `dservice` text record).

#### DService Requirements

1. MUST only rely on indexed data from the following sources:
   1. The Ethereum blockchain, i.e. Ethereum L1 and L2s
   2. Content-addressed data, e.g. the IPFS network
2. MUST be deterministic, all DService nodes given the same input should produce the same state
3. MUST be open source so that anyone can run their own instance
4. Dapps SHOULD provide multiple endpoints for redundancy

### Usage in Dapps

A dapp hosted using an ENS name can lookup its own `dservice` record to discover DService URLs.

#### Endpoint priority

If there are multiple URLs in the `dservice` text record, dapps SHOULD implement a failover mechanism where if one endpoint is unavailable the next one is tried until either one works, or there are no more URLs in the list. The URLs are to be used in no particular order. Dapps are RECOMMENDED to randomize the order in which they use the URLs.

#### External DServices

A dapp MAY also use DServices provided through ENS names beyond its own. For example, `dapp-a.eth` could look up the `dservice` text record of `dapp-b.eth` to get the latest endpoints for its dservice, then query those endpoints directly.

#### Query Parameter Overrides

If the dapp is using any dservice, it MUST provide the ability  to override them based on their ENS name using the following query parameter: `?ds-<ens-name>=<url>` The provided `<url>` MUST be URL encoded.

If a custom url is provided through one of the ENS name specific query parameters:

1. Dapps MUST only use the provided URL, and not any of the URLs from the `dservice` text record
2. Dapps are RECOMMENDED to display an information banner or modal, informing the user that the provided DService URL will be used.

## Rationale

The introduction of the *dservice* concept is an  acknowledgement that most applications need to rely on some sort of  indexer to access blockchain data. The ethereum rpc api is simply not  sophisticated enough for advanced query functionality. Unfortunately most applications simply build a backend indexer and call it a day. If  their endpoint goes down the application goes down with it, losing the  benefit of distributing the frontend over ENS and IPFS in the first  place. DServices mitigates this by allowing apps to specify multiple backup endpoints. Additionally since the dapp is required to support the dservice fallback query param, even if all provided endpoints go down, users can run their own indexer as a last resort.

### DService Requirements

The DService requirements listed in the spec above are provided to ensure that dservices remain decentralized and in the control of the community, rather than the application developer. This means that DServices that store data beyond what is based on blockchain state and content-addressed storage is considered to be in violation of the spec, because it would centralize DService functionality to specific DService instances. The open source requirement enables the community to audit the application backend to ensure these qualities are guaranteed.

### DService Economy

Another possible consequence of dapps being able to use the DServices of other dapps is the emergence of a DService economy. Completely mitigating any vendor lock-in. DService implementations could access control their endpoints with CORS, so that only dapps on allow-lists would be permitted access. These allow-lists could be implemented on-chain using any arbitrary payment logic or otherwise.

### Implementations

Dservice functionality is currently implemented by [simplepage.eth](https://simplepage.eth.link):

- [DService fetch](https://github.com/stigmergic-org/simplepage/blob/main/packages/common/src/dservice.js) - implement endpoint randomization and failover
- [new.simplepage.eth](https://app.ens.domains/new.simplepage.eth?tab=records) - the domain where the DService endpoints are stored

## Backwards Compatibility

Not applicable.

## Security Considerations

The possibility of providing DService URLs through query parameters opens up an attack vector where a bad actor could post links to your dapp including a url to a malicious dservice. This is the reason for adding the recommendation to display a warning message in a banner or modal when a URL is provided in this way.

## Copyright

<!-- Just leave this how it is -->
Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
