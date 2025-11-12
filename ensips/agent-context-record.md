---
title: Agent‑Context Text Record
author: Prem Makeig (premm.eth) <premm@unruggable.com>, Ghadi Mhawej (justghadi.eth) <ghadi@justalab.co>
discussions-to: <URL>
status: Idea
created: 2025-05-17
---

## Abstract

This ENSIP extends ENSIP‑5: Text Records by standardizing the `agent-context` text record key. The key provides a universal entry point for agentic systems to discover context, interaction methods, agent registries (e.g., ERC-8004), and supported protocols (e.g., x402, A2A).

## Motivation

Agentic systems require verifiable context data. ENS names provide an onchain, verifiable location for this data. This ENSIP standardizes discovery via the `agent-context` text record, eliminating the need for ad hoc parsing.

As agent registries (e.g., ERC-8004) and protocols (e.g., x402, A2A) emerge, clients need a standardized way to discover which registries an agent uses and what protocols it supports. The `agent-context` record provides this discovery mechanism.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### Text Record Key

- **Key**: `agent-context`
- **Value**: UTF-8 text containing context information for agentic systems
- **Format**: Any format suitable for agentic systems (plain text, Markdown, YAML, JSON, etc.)

The key **MUST** be published via `text(bytes32,string)` as defined in ENSIP‑5. The content MAY describe what the ENS name represents and how to interact with it, including smart contract addresses, API endpoints, and other relevant information.

### Agent Registry Discovery

The `agent-context` record SHOULD include information about agent registries (e.g., ERC-8004) where the agent is registered. Clients MAY parse the record to identify registry addresses or identifiers for querying additional agent information.

### Protocol Support Discovery

The `agent-context` record MAY include information about additional protocols the agent supports (e.g., x402 for payments, A2A for agent-to-agent communication). Clients SHOULD parse the record to identify supported protocols and their configuration requirements.

### Multi-Protocol Support Preferences

When an agent supports multiple protocols or registries, the `agent-context` record SHOULD include preference information. For example, an agent may support both MCP and A2A but prefer A2A, or be registered in multiple ERC-8004 registries but prefer one on Base. Preferences MAY be expressed through explicit ordering, priority indicators, or other format-specific mechanisms.

## Client Resolution Flow for Interfaces

Clients SHOULD:
1. Resolve the `agent-context` text record for the ENS name
2. Parse the content to extract context information
3. Identify agent registries (e.g., ERC-8004) and supported protocols (e.g., x402, A2A, MCP)
4. Determine preferences when multiple options are available
5. Query relevant registries and configure protocol support according to preferences

### Example Implementation

```js
const resolver = await provider.getResolver("example.eth");
const agentContext = await resolver.getText("agent-context");
// Parse agentContext to discover registries and protocols
```

## Backwards Compatibility

Unaware clients will ignore the new key; existing behavior is unaffected.

## Security Considerations

There are no security considerations specific to this ENSIP. Standard ENS security considerations apply to the underlying text record functionality.

## Rationale

This ENSIP creates a standardized entry point for discovering agent context, registries, and protocols. By defining only the key and leaving the value format flexible, it enables experimentation while ensuring interoperability.

The `agent-context` key serves as a well-known location for agentic systems, reducing the need for ad hoc discovery mechanisms. As the ecosystem evolves with competing standards, the ability to express preferences becomes essential for optimizing interactions while maintaining client flexibility.

Future ENSIPs may define more specific formats, but this specification intentionally remains minimal to encourage adoption and experimentation.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
