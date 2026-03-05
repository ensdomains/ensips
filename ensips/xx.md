---
title: Node Classification and Metadata
description: Additional metadata to describe the organizational role of an ENS node
contributors: 
    - jkm.eth
    - 1a35e1.eth
ensip:
  created: "2025-12-15"
  status: draft
---

# ENSIP-X: Node Classification and Metadata

## Abstract

This ENSIP proposes a standard method for using text records to declare the role of an ENS name/subname (node). Two types of standardized text records are introduced, which provide for labeling the role of the node against a larger organizational structure, and for defining the structure of additional, context-dependent metadata attributes that may be appended to that node.

## Motivation

In practice, ENS subnames are often used to represent organizational structures. For example, an ENS name belonging to an individual might have a subname which points to the individual's cold wallet, and another which points to a hot wallet that they use for voting in on-chain governance. DAOs or other on-chain organizations might have a top-level ENS name that represents the group as a whole, with subnames created to represent treasuries, smart contracts, working groups, committees, and other entities within the organization. This ENSIP offers a way to add metadata to each of those nodes to declare its role in the larger organizational structure, and to append context-specific metadata which is machine-readable and standardized, allowing dynamic discovery and recognition of the role each subname is meant to fulfill.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Metadata Records

This ENSIP builds on ENSIP-5 and ENSIP-24, and uses text records stored in each node's resolver to provide additional metadata for that node. We define two new unqualified, global key names (`class` and `schema`) which are hereby reserved for use in accordance with this ENSIP. Additional metadata attributes can also be added to a node and stored as text or data records, with their key names declared by the `schema` entry (explained below).

It is expected that each node will be configured to resolve to one or more on-chain addresses, and the metadata attributes attached to a node are understood to apply to the entity or entities represented by those addresses.

### `class` Text Record

Nodes can specify a text record with the key name of `class`, the value of which serves to label the general role or purpose of that node. These values are largely intended to be useful to humans who wish to understand what importance to give to each node, but can also be used programmatically in filtering and recognizing categories of node for automated systems.

The value of this record MUST be pascal case, using only alphabet characters. Values SHOULD be limited to those outlined in the following table to maximize compatability across the ecosystem, however other values MAY be used for specialized use cases. 

| `class` Value | Meaning |
|---|---|
| Agent | This node represents an autonomous software-controlled entity |
| Application | This node represents a software application, service, or product |
| Committee | This node represents a formal group with delegated authority to make decisions or provide oversight within a defined scope |
| Contract | This node represents, and resolves to, a smart contract |
| Council | This node represents a high-level governance body with broad strategic authority and stewardship responsibilities |
| Delegate | This node represents a voter in on-chain governance, who may or may not have been delegated voting power from others |
| Group | This node represents a logical grouping of multiple child nodes |
| Org | This node represents an organization or sub-organization within a larger entity |
| Person | This node represents an individual human |
| Treasury | This node represents an account for funds that are collectively owned and/or managed |
| Wallet | This node's main purpose is to send, receive, and/or store funds |
| Workgroup | This node represents an operational team focused on executing tasks or work within a specific domain |

It is understood that all on-chain addresses could have the ability to perform a base set of actions, including:
* sending and receiving funds
* calling smart contracts
* publishing new smart contracts
* providing signatures

Therefore, `class` designations like `contract` and `wallet` should only be interpreted as declaring that node's main purpose in the context of the organizational structure; nodes that do not use one of these classes can still point to addresses which are smart contracts and/or hold funds. The same address can be pointed to by multiple nodes, each with a different `class` designation and metadata describing a different aspect of that address/account.

### `schema` Text Record

Nodes can specify a text record with the key name of `schema`, the value of which points to a JSON schema which declares which metadata attributes can be added to the node as text or data records, in addition to the global text records already specified in existing ENSIPs. The value of `schema` MUST start with one of the following prefixes, followed by the appropriate value:

* `ipfs://` - followed by the ipfs URI pointing to the JSON payload
* `cbor:` - followed by the schema encoded in CBOR format
* `https://` - followed by the http(s) URI pointing to the JSON payload

Immutable resources such as `ipfs` and `cbor` SHOULD be used, however `https` is also allowed in case a mutable source is preferred for some reason. Implementors should be aware that schemas provided over `https` can change at any time or become unavailable at some point in the future, and implementations MUST be designed in a way that harm to users is minimized if such a thing were to happen.

### Schema Payload

If a schema is provided for a node, it specifies which additional metadata attributes are expected to be provided for that node, stored as ENSIP-5 text records or ENSIP-24 data records. Schemas MUST follow the JSON Schema specification, [version 2020-12](https://json-schema.org/draft/2020-12/json-schema-core), and describe a single-level object in which property names match the text or data record key names. Attribute key names MUST use kebab case (i.e. all lowercase with words delimited by hyphens). If additional namespacing is required, attributes MUST use dot notation as described in ENSIP-5.

#### Additional details

* The schema's `$id` field SHOULD be used to identify the schema's creator and/or version.
* The schema's `title` field identifies what entity is described in the data structure. If the schema is intended to be used with a specific `class`, the value of `title` SHOULD be the same as the class it is meant to represent.
* If a node has a `schema` present but no `class` record set, the value of the schema's `title` SHOULD be used as the class identifier for the node.
* Schema authors are encouraged to populate the `description` field with an explanation of the organizational role fulfilled by nodes which use this schema, in line with the `class` descriptions listed above.
* Schemas MAY include definitions for key names which are already declared and/or reserved for global use in other ENSIPs. These entries can include examples and expanded descriptions to give more information about how the key should be handled in the given context, however the specified use of these keys MUST NOT be in direct conflict of their original definition as provided by existing ENSIPs. Implementors should be aware that these keys could still be read or written to by other implementations that have no knowledge of schema records.
* Attributes can make us of the `format` keyword as defined in [section 7.2 of the JSON schema specification](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-00#rfc.section.7.2).
* Schemas can make use of the `required` keyword as defined in [section 6.5.3 of the JSON schema specification](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-00#rfc.section.6.5.3).


#### Custom JSON Schema Keywords

##### Record Type

Attributes can include an optional `recordType` ("text" | "data") keyword which indicates if the record is stored as `text` (ENSIP-5) or `data` (ENSIP-24) (default: `text`).

##### Inheritance

Attributes can include an optional `inherit` (bool) keyword, which indicates whether the attribute's value should be inherited from an ancestor node if no value is set locally.

When a client encounters an attribute with `inherit` set to `true` and no value is present on the current node, the client SHOULD walk up the name hierarchy (checking the parent node, then the parent's parent, and so on) until a node is found that has a value set for that attribute. If no ancestor has a value set for the specified key, the attribute is treated as absent.

If the current node already has a value set for the attribute, the inherit keyword is ignored and the local value is used.

An inherited value SHOULD be treated as satisfying the required keyword for validation purposes.

Inheritance lookups are based solely on the presence of a matching text or data record key on an ancestor node. The ancestor does not need to have a schema record set.

#### Validation and Required Fields

For clients that facilitate storing metadata records: You SHOULD validate provided values against the schema, including type/format declarations and `required` properties, before writing any records. If any individual records requested to be written would cause validation to fail, the entire write operation SHOULD be halted and an error returned.

For clients that facilitate retrieving metadata records: You MAY validate returned records and ignore an entire node's data if validation fails against the provided schema.

#### Basic schema example:

```
{
  "$id": "v1.0",
  "title": "Person",
  "description": "This node represents an individual human",
  "type": "object",
  "properties": {
    "first-name": {
      "type": "string",
      "description": "The person's first name.",
    },
    "last-name": {
      "type": "string",
      "description": "The person's last name."
    },
    "proof-of-humanity": {
      "type": "string",
      "description": "A signed attestation of proof of humanity.",
      "recordType": "data"
    },
    "avatar": {
      "type": "string",
      "description": "a URL to an image of this person to be used as their profile picture",
      "inherit": true
    }
  }
}
```

#### Parameterized Key Names

Schemas can support parameterized properties, which allow a single property to have multiple variant-specific values. Parameters are specified using bracket notation appended to the property when used as a key name:

```
key-name[parameter]
```

Schemas MAY simultaneously support both the base form (`key-name`) and parameterized form (`key-name[parameter]`). The parameterized form with empty brackets (`key-name[]`) SHALL NOT be allowed.

When both base and parameterized forms exist, clients SHOULD treat them as independent records, with the base form serving as a default when no specific parameter is requested.

To add a parameterized key to a JSON schema, add a regex pattern which enforces the use of brackets to the `patternProperties` object. The following example regex value will accept either the base form or the parameterized form, while rejected empty brackets: `^key-name(\[[^\]]+\])?$`

When parsing key names, the following regex can be used to isolate the base form (group 1) and the parameter (group 3, if provided): `^(key-name)(\[([^\]]+)\])?$`

**Note:** Defining which values are allowed to be passed inside of the brackets when setting and retrieving records is up to schema publishers and is outside the scope of this ENSIP.

#### Basic schema example including parameterized properties:

```
{
  "$id": "v1.0",
  "title": "Person",
  "description": "This node represents an individual human",
  "type": "object",
  "properties": {
    "first-name": {
      "type": "string",
      "description": "The person's first name.",
    },
    "last-name": {
      "type": "string",
      "description": "The person's last name."
    },    
    "avatar": {
      "type": "string",
      "description": "a URL to an image of this person to be used as their profile picture",
      "inherit": true
    }
  },
  "patternProperties": {
    "^proof-of-humanity(\[[^\]]+\])?$": {
      "type": "string",
      "description": "A signed proof of humanity attestation. The name of a specific provider can be passed as a parameter.",
      "recordType": "data"
    }
  }
}
```

In this example, the owner of the node could use the key `proof-of-humanity[provider]` to store a proof of humanity attestation from a specific provider, and they could use `proof-of-humanity` to publish a default attestation to be retrieved if no provider is specified.

## Backwards Compatibility

This proposal is built upon existing ENSIPs and does not affect existing ENS functionality. It introduces no breaking changes.

## Security Considerations

None.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
