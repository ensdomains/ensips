---
title: Root‑Context Text Record  
author: Prem Makeig (premm.eth) <premm@unruggable.com>  
discussions-to: <URL>
status: Idea  
created: 2025-05-17  
---

## Abstract

This ENSIP extends **ENSIP‑5: Text Records** by standardizing a single global text record key, **`root-context`**. The key provides a universal entry point to ENS names for agentic systems, defining a standard way to specify interfaces using the `root-context` text record. It describes *what* the name represents (data source, chatbot, autonomous agent, etc.) and *how* to interact with it. By storing context data onchain via ENS, any app (chat front ends, wallet UIs, MCP middleware, crawlers) has a reliable, verifiable place to discover AI context and interaction methods.

## Motivation

Agentic systems that require verifiable context data are emerging, including agents that can propose blockchain transactions with calldata, or that rely on critical context data requiring verifiability. ENS names are well positioned to register verifiable context data because they can be stored onchain and are supported by existing tooling. This ENSIP introduces a standard way to discover interfaces (which may include implementations) for storing verifiable AI context using the `root-context` text record. Using this standard, agentic systems can be developed using any type of interface, while allowing apps to ignore interfaces they do not require.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### Text Record Key

* **Key**: `root-context`
* **Value**: Text in UTF-8 format for a manifest that outlines one or more interfaces (for example, `chat`, `agent` or `tools`) plus any supporting metadata or implementation details.
* **Expected Format**: Plain text, Markdown, YAML, JSON, or other standard formats designed for LLM context.

The key **MUST** be published via `text(bytes32,string)` as defined in ENSIP‑5. Implementers MAY embed multiple interfaces in a single manifest. Each interface can be described in natural language or structured metadata. Implementers MAY include implementation details in the manifest, such as the address and interface of a smart contract or the URL of an API endpoint.

## Agentic System Interfaces

This section defines an interface standard for the `root-context` text record of ENS names, allowing for the definition of multiple interfaces for agentic systems.

## Interface Format

Implementers MAY embed multiple interfaces in their `root-context` manifest using the `----- Interface Name -----` (five dashes on each side of the interface name) delimiter format. An interface name MUST NOT appear more than once.

```
----- Chat -----

You are the official support bot for ExampleProject. Greet users warmly and answer questions about our API, pricing, and getting started. Use the documentation linked below for accurate information.
. . . 

----- Agent -----

When invoked as an agent via MCP middleware, this ENS name provides tools for querying the ExampleProject API, managing user accounts, and generating reports. The agent has access to real-time data and can perform actions on behalf of authenticated users.
. . . 

----- Tools -----

-- status --

Queries the ExampleProject API with the given parameters and returns structured data.

Parameters: none

-- generate-report --

Generates a usage report for a given time period.

Parameters:
- start: Start time as Unix timestamp
- end: End time as Unix timestamp
```

## Interface Types

This extension defines several interface types that ENS names MAY implement:

* **Chat** – Defines personality, knowledge sources, and conversation guidelines for AI chat applications or other user-facing AI applications.
* **Agent** – Specifies tools, capabilities, and integration methods for autonomous or semi-autonomous agents.
* **Tools** – Documents available functions, their parameters, and usage examples.
* **Resources** – Resources used for agentic systems.
* **Prompts** – Prompts that can be used within AI workflows or chat applications.

## Client Resolution Flow for Interfaces

1. Resolve `root-context` for the target ENS name.
2. Parse the manifest to identify available interfaces using the `----- Interface Name -----` delimiters.
3. Select one or more interfaces that match the client's capabilities.
4. Compose a context from the selected interfaces.

## Links

Decentralized storage protocols use content identifiers (CIDs) instead of URLs, such that the link is also a hash of the content. Interfaces MAY include embedded links and content in the form of CIDs, DataURLs, or other types of links. DataURLs MUST be included in the context received by the client. DataURLs allow for images to be encoded and included in a raw text document. Other types of links, such as IPFS CIDs, MAY be queried and included in the context received by clients. It is also possible to include URLs, which cannot be verified and SHOULD NOT be queried or included in the context. However, a URL MAY be included in the context as a reference (e.g., as a literal URL string).

## Markdown

Markdown provides useful formatting features that can be used within an interface specification. For example, it can be useful to embed JSON or code examples within an interface using a fenced code block:
````
```json
{
  "name": "Swap Agent",
  "date": "05-30-2025"
}
```
````

Headers and text styling such as bold, italics, etc., can also be used.

### Backwards Compatibility

Unaware clients will simply ignore the new key; existing behavior is unaffected.

### Example

A simple example using Ethers.js:

```js
const resolver = await provider.getResolver("example.eth");
const rootContext = await resolver.getText("root-context");
console.log(rootContext);
```

This command returns the raw content that defines the ENS name's machine-readable context.

### Security Considerations

There are no security considerations specific to this ENSIP.

## Rationale

This ENSIP creates a standardized context resource for ENS names and with a standardized interface format. The interface-based approach allows a single ENS name to support multiple AI use cases while maintaining a clean separation of concerns.

By specifying a structured format for `root-context`, this ENSIP enables developers to create more predictable and interoperable agentic systems, reducing the need for ad hoc parsing or proprietary formats. It builds a foundation for ecosystem-wide conventions that can benefit wallet developers, front-end builders, middleware, and even cross-platform agent orchestration, allowing ENS names to act not just as identity anchors, but as context-rich agents.


## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).


