---
title: Root‑Context Text Record
author: Prem Makeig (premm.eth) <premm@unruggable.com>, Ghadi Mhawej (justghadi.eth) <ghadi@justalab.co>
discussions-to: <URL>
status: Idea
created: 2025-05-17
---

## Abstract

This ENSIP extends ENSIP‑5: Text Records by standardizing a single global text record key, root-context. The key provides a universal entry point to ENS names for agentic systems, allowing them to discover context and interaction methods. By storing context data onchain via ENS, any app (chat front ends, wallet UIs, MCP middleware, crawlers) has a reliable, verifiable place to discover AI context associated with an ENS name.

## Motivation

Agentic systems that require verifiable context data are emerging, including agents that can propose blockchain transactions with calldata, or that rely on critical context data requiring verifiability. ENS names are well positioned to register verifiable context data because they can be stored onchain and are supported by existing tooling. This ENSIP introduces a standard way to store and discover verifiable AI context using the root-context text record. Using this standard, agentic systems can reliably discover context associated with ENS names without requiring ad hoc parsing or proprietary formats.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### Text Record Key

- **Key**: `root-context`
- **Value**: UTF-8 text containing context information for agentic systems
- **Format**: Any format suitable for consumption by agentic systems, including plain text, Markdown, YAML, JSON, or other standard formats designed for LLM context.

The key **MUST** be published via `text(bytes32,string)` as defined in ENSIP‑5. The content MAY describe what the ENS name represents (data source, chatbot, autonomous agent, etc.) and how to interact with it. Implementers MAY include implementation details such as smart contract addresses, API endpoints, or other relevant information.

## Client Resolution Flow for Interfaces

Clients resolve the root-context for an ENS name and interpret the content according to their capabilities and requirements. The content format is not prescribed, allowing flexibility for different use cases while maintaining the common entry point.

### Example Implementation

A simple example using Ethers.js:

```js
const resolver = await provider.getResolver("example.eth");
const rootContext = await resolver.getText("root-context");
console.log(rootContext);
```

## Backwards Compatibility

Unaware clients will simply ignore the new key; existing behavior is unaffected.

This command returns the raw content that defines the ENS name's context for agentic systems.

## Security Considerations

There are no security considerations specific to this ENSIP. Standard ENS security considerations apply to the underlying text record functionality.

## Rationale

This ENSIP creates a standardized entry point for agentic systems to discover context associated with ENS names. By defining only the key and leaving the value format flexible, this specification enables experimentation and evolution of context formats while ensuring interoperability at the discovery level.

The `root-context` key serves as a well-known location where agentic systems can expect to find relevant context, reducing the need for ad hoc discovery mechanisms. This builds a foundation for ecosystem-wide conventions that can benefit wallet developers, front-end builders, middleware developers, and agent orchestration systems.

Future ENSIPs may define more specific formats or conventions for organizing content within the `root-context` field, but this specification intentionally remains minimal to encourage adoption and experimentation.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
