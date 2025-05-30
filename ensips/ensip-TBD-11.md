---
title: Llms-txt Text Record  
author: Prem Makeig (premm.eth) <premm@unruggable.com>  
discussions-to: <URL>
status: Idea  
created: 2025-05-17  
---

## Abstract

This ENSIP extends **ENSIP‑5: Text Records** by standardizing a single global text record key, **`llms-txt`**. The key conforms to the llms.txt standard introduced by Jeremy Howard in September 2024, acting as an AI-friendly manifest for an ENS name. It tells agent based systems *what* the name represents (data source, chatbot, autonomous agent, etc.) and *how* to interact with it. By storing this llms.txt-compliant manifest onchain via ENS, any app (chat front‑ends, wallet UIs, MCP middleware, crawlers) has one reliable, verifiable place to discover AI-relevant context and interaction methods.

## Motivation

ENS is a globally recognized, tokenized naming system whose ownership is verifiable on-chain. This makes it a natural anchor for agents and AI-focused datasets. The llms.txt standard provides a proven format for making web content LLM-friendly, and adapting it to ENS text records creates a standardized way for AI systems to discover and interact with ENS names. A single `llms-txt` text record lets any client load the initial instructions it needs before deciding how to behave, while conforming to an emerging web standard that's already adopted by thousands of documentation sites and developer tools.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### Text Record Key

* **Key**: `llms-txt`
* **Value**: Text in UTF-8 format conforming to the llms.txt standard.
* **Expected Format**: Markdown following llms.txt specification.

The key **MUST** be published via `text(bytes32,string)` as defined in ENSIP‑5.

### llms.txt Format

The manifest follows the standard llms.txt structure:

1. **H1 Title**: A level-1 heading naming the project or site (this title is the only required element)
2. **Brief Summary**: Blockquote describing what the ENS name represents
3. **Details**: Additional paragraphs or lists providing important notes or guidance (no H2 headers allowed in this section)
4. **File Lists of URLs**: Markdown sub-headers for additional context, each containing a list of URLs

### Example

A simple example using Ethers.js:

```js
const resolver = await provider.getResolver("example.eth");
const llmsTxt = await resolver.getText("llms-txt");
console.log(llmsTxt);
```

This command returns the llms.txt-compliant manifest that defines the ENS name's context.

## Agententic System Interfaces

This section defines an optional extension to the llms.txt standard specifically for ENS names that want to define multiple AI interaction interfaces.

### Interface Format

ENS implementers MAY embed multiple interfaces in their llms.txt manifest using the `--- Interface Name ---` delimiter format in the Details section:

```markdown
# example.eth

> Example.eth is an AI agent that provides customer support and documentation for the ExampleProject ecosystem.

--- Chat ---

You are the official support bot for ExampleProject. Greet users warmly and answer questions about our API, pricing, and getting started. Use the documentation linked below for accurate information.

--- Agent ---

When invoked as an agent via MCP middleware, this ENS name provides tools for querying the ExampleProject API, managing user accounts, and generating reports. The agent has access to real-time data and can perform actions on behalf of authenticated users.

--- Tools ---

-- status --

Queries the ExampleProject API with the given parameters and returns structured data.

Parameters: none

-- generate-report --

Generates a usage report for a given time period.

Parameters:
- start: Start time as Unix timestamp
- end: End time as Unix timestamp

--- Contact ---

For support inquiries, contact support@example.com or visit our Discord at discord.gg/example.

## Chat

- [FAQ Database](https://docs.example.com/faq.md): Common questions and answers
- [Knowledge Base](https://docs.example.com/kb.md): Detailed product information
- [User Guide](https://docs.example.com/guide.md): Step-by-step tutorials

## Contact

- [Support Portal](https://support.example.com/): Submit tickets and track issues
- [Community Forum](https://forum.example.com/): Connect with other users
- [Status Page](https://status.example.com/): Service availability and updates
```

### Interface Types

This extension defines several interface types that ENS names can implement:

* **Chat interface.** Defines personality, knowledge sources, and conversation guidelines for chat applications.
* **Agent interface.** Specifies tools, capabilities, and integration methods for MCP middleware and autonomous agents.
* **Tools interface.** Documents available functions, their parameters, and usage examples.
* **Contact interface.** Provides fallback communication methods and support channels.

### Client Resolution Flow for Interfaces

1. Resolve `llms-txt` for the target ENS name.
2. Parse the manifest to identify available interfaces using the `--- Interface Name ---` delimiters.
3. Select an interface that matches the client's capabilities.
4. Initialize the context with the interface-specific instructions.
5. Optionally fetch additional resources from the H2 sections for enhanced context.

## Rationale

This ENSIP adopts the proven llms.txt standard to provide a familiar, standardized format for AI systems. By leveraging an existing specification that's already adopted by thousands of sites, we ensure compatibility with existing tools and reduce the learning curve for developers. The interface-based approach allows a single ENS name to serve multiple AI use cases while maintaining clean separation of concerns.

The choice to use `llms-txt` as the key name creates a clear connection to the broader llms.txt ecosystem while the ENS-specific adaptations (interface definitions) extend the standard in a backwards-compatible way.

### Backwards Compatibility

Unaware clients will simply ignore the new key; existing behavior is unaffected.

### Security Considerations

There are no security considerations specific to this ENSIP.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).