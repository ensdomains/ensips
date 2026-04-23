---
description: Standardizes storing common DNS RRsets in ENSIP-24 arbitrary data records.
contributors:
  - gskril
ensip:
  created: "2026-04-22"
  status: draft
---

# ENSIP-X: DNS RRsets via Arbitrary Data Resolution

## Abstract

This ENSIP defines a resolver profile for storing common Internet-class (`IN`) DNS RRsets on ENS names via ENSIP-24's `data(bytes32 node, string key)` interface. It standardizes a compact key grammar, owner-name scoping relative to a selected ENS zone apex, and binary encodings for `A`, `AAAA`, `CNAME`, `TXT`, and `MX` RRsets. The goal is to make simple website, alias, text, and mail-routing use cases interoperable without requiring the full DNS-in-ENS zone model from ENSIP-6.

## Motivation

Users want `.eth` names to behave like practical decentralized domains for simple web hosting and similar applications. A gateway such as `eth.limo` should be able to read an `A` or `AAAA` RRset from ENS, connect to the corresponding origin, and serve content for that name. Related use cases include canonical host aliases via `CNAME`, lightweight metadata via `TXT`, and basic mail-routing declarations via `MX`.

ENSIP-6 demonstrated that DNS data can be stored in ENS, but its zone-oriented model is heavier than necessary for this common case. Many applications only need to read or update a single RRset without re-encoding the rest of a DNS zone.

ENSIP-24 introduces a generic `data(bytes32 node, string key) -> bytes` interface that is well suited to storing independent DNS RRsets. A simpler standard is needed so different resolvers, authoring tools, and gateways use the same keys, normalization rules, and encodings.

This ENSIP intentionally does not attempt to recreate full DNS authoritative-server behavior onchain. It standardizes a compact subset of record types and reuses DNS's native RDATA encodings wherever possible, which keeps the data model easy to implement and easy to bridge into conventional DNS software.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Dependencies and Terminology

- ENS fundamentals and `namehash` are as defined in ENSIP-1.
- The `data(bytes32 node, string key)` interface is as defined in ENSIP-24.
- DNS wire formats are as defined in RFC 1035, RFC 3596 for `AAAA`, RFC 4592 for wildcard terminology and behavior, and RFC 7505 for Null MX.
- Unless otherwise stated, "zone apex" means the ENS name whose `namehash` is supplied as `node`.
- Unless otherwise stated, "owner name" means the DNS owner name relative to that zone apex. The apex owner name is the empty string.

### Overview

This ENSIP defines a convention for storing DNS RRsets inside ENSIP-24 arbitrary data records.

The `node` parameter is the ENS `namehash` of the zone apex, as defined in ENSIP-1. The `key` parameter identifies an owner name relative to that apex and a DNS RR type. The `bytes` return value encodes the RRset for that `(node, owner, rrtype)` tuple.

This ENSIP applies only to Internet-class (`IN`) DNS data. It does not define storage of DNS classes, DNSSEC records, zone transfers, authoritative nameserver behavior, or other full-zone features from ENSIP-6.

Each standardized key stores exactly one RRset. Multiple records of the same type are represented inside a single `bytes` value.

### Key Naming

Standardized keys have the following form:

```
dns.<rrtype>
<owner>.dns.<rrtype>
```

Where:

- `<rrtype>` is one of `a`, `aaaa`, `cname`, `txt`, or `mx`.
- `<owner>` is a relative owner name beneath the zone apex, expressed as lowercase ASCII DNS labels separated by `.`, with no trailing `.`, and with no empty labels.
- Internationalized labels in `<owner>` MUST be represented as lowercase A-labels.
- The empty owner name is represented by omitting the owner prefix entirely. Accordingly, `dns.a` means the apex `A` RRset for the ENS node itself.

Clients and authoring tools MUST construct keys by appending the suffix `.dns.<rrtype>` to the relative owner name when an owner name is present, or by using `dns.<rrtype>` directly for the apex. This ensures that owner names containing the label `dns` remain unambiguous.

Examples:

- `dns.a` for the apex `A` RRset
- `dns.aaaa` for the apex `AAAA` RRset
- `www.dns.a` for the `A` RRset of `www.<zone>`
- `api.v2.dns.txt` for the `TXT` RRset of `api.v2.<zone>`

An implementation MAY store wildcard owner names by using a literal `*` as the leftmost label, for example `*.dns.a` or `*.shop.dns.txt`. Wildcard matching behavior is specified below.

If a resolver supports ENSIP-24's optional `supportedDataKeys(bytes32)` interface, it SHOULD include these keys in that list.

### Supported Record Types

This ENSIP defines the following interoperable RR type subset:

- `A` (type 1)
- `CNAME` (type 5)
- `MX` (type 15)
- `TXT` (type 16)
- `AAAA` (type 28)

This curated subset is intentional. These records cover the common cases of web hosting, canonical host aliases, simple text metadata, and mail routing without reintroducing the full complexity of DNS zone management.

Resolvers and clients MAY support additional RR types, but behavior outside this subset is out of scope for strict interoperability under this ENSIP version. A resolver or client claiming compliance for one of the RR types listed above MUST use the corresponding key and encoding defined here.

### Value Encoding

#### General Rules

The value returned by `data(node, key)` encodes the RDATA for the RRset identified by `key`. Except where this ENSIP defines an additional framing rule, each item uses the DNS RDATA wire format for that RR type rather than the full DNS resource record wire format. In particular, `NAME`, `TYPE`, `CLASS`, `TTL`, and `RDLENGTH` are not included.

All multi-octet integers MUST use network byte order.

All domain names embedded in RDATA MUST be encoded as absolute DNS names in the uncompressed RFC 1035 section 3.1 wire format, including the terminating zero-length root label. Compression pointers MUST NOT be used.

Authoring tools SHOULD encode all ASCII letters in embedded domain names in lowercase and SHOULD use A-labels for internationalized labels so semantically equivalent names have a deterministic byte representation.

A resolver compliant with this ENSIP MUST return a zero-length value (`0x`) when a standardized RRset is absent. Clients MUST treat a zero-length return value as absence. Authoring tools and resolvers SHOULD clear a key instead of intentionally storing an empty RRset.

#### A

The value for `dns.a` or `<owner>.dns.a` is the concatenation of one or more 4-byte IPv4 addresses, matching the `A` RDATA format in RFC 1035 section 3.4.1.

If the RRset contains `N` records, the value length MUST be `N * 4`.

Example:

```
192.0.2.1, 192.0.2.2
=> 0xc0000201c0000202
```

#### AAAA

The value for `dns.aaaa` or `<owner>.dns.aaaa` is the concatenation of one or more 16-byte IPv6 addresses, matching the `AAAA` RDATA format in RFC 3596 section 2.2.

If the RRset contains `N` records, the value length MUST be `N * 16`.

#### CNAME

The value for `dns.cname` or `<owner>.dns.cname` is exactly one uncompressed RFC 1035 section 3.3.1 wire-format domain name.

A `CNAME` RRset stored under this ENSIP MUST contain exactly one record. Encodings containing zero or more than one `CNAME` target are invalid.

A name that has a `CNAME` RRset MUST NOT have any other RRset standardized by this ENSIP at the same owner name.

#### TXT

The value for `dns.txt` or `<owner>.dns.txt` is a sequence of one or more TXT RDATA items.

Each item is encoded as:

```
uint16 rdlength || txt-rdata
```

Where:

- `rdlength` is the length in octets of `txt-rdata`, encoded as an unsigned 16-bit big-endian integer.
- `txt-rdata` is the raw RFC 1035 section 3.3.14 TXT RDATA for a single TXT record, consisting of one or more length-prefixed character strings.

This length prefix is required because a TXT RR's native RDATA can contain multiple character strings, so adjacent TXT records are not otherwise self-delimiting.

Within a single `txt-rdata`, long logical text may be split across multiple DNS character strings exactly as RFC 1035 permits. This ENSIP preserves that structure and does not reinterpret it.

#### MX

The value for `dns.mx` or `<owner>.dns.mx` is the concatenation of one or more MX RDATA items, matching RFC 1035 section 3.3.9.

Each item is encoded as:

```
uint16 preference || exchange
```

Where:

- `preference` is the MX preference as an unsigned 16-bit big-endian integer.
- `exchange` is the uncompressed wire-format absolute DNS name of the mail exchanger.

Because `exchange` ends with the root label, each MX item is self-delimiting.

This encoding also represents Null MX, as defined in RFC 7505, by storing `preference = 0` followed by the wire-format root name `.`.

### Record Construction and Parsing

For the supported RR types, gateways and authoring tools MUST apply the following rules:

- An `A` value whose length is not a multiple of 4 is invalid.
- An `AAAA` value whose length is not a multiple of 16 is invalid.
- A `CNAME` value MUST decode to exactly one absolute domain name and no trailing bytes.
- Each TXT item's `rdlength` MUST fit entirely inside the value, and its `txt-rdata` MUST be valid RFC 1035 TXT RDATA.
- Each MX item MUST contain a full 2-byte preference field followed by one absolute domain name and no trailing bytes beyond the concatenated sequence.
- Domain-name parsers MUST reject compression pointers, relative names, truncated labels, labels longer than 63 octets, and trailing bytes beyond the declared RRset framing.

Clients SHOULD preserve stored record order when returning `A`, `AAAA`, `TXT`, and `MX` RRsets. Clients consuming `A` and `AAAA` RRsets MAY randomize or otherwise balance among equivalent addresses for connection attempts. Clients consuming `MX` RRsets SHOULD sort the decoded records by ascending `preference` before use, preserving stored order among records with the same preference.

### Resolution Algorithm

An application using this ENSIP MUST already know the selected ENS zone apex `zone` and the relative owner name `owner` beneath that zone. How an application maps an incoming hostname to a particular `(zone, owner)` pair is out of scope for this ENSIP.

TODO: This draft should explicitly specify how zone-scoped owner-name lookups interact with exact ENS subnames that have their own registry-set resolver.

Given an ENS zone apex `zone`, a relative owner name `owner`, and a query type `qtype`, a client MUST:

1. Normalize `zone` according to ENSIP-1.
2. Discover the resolver for `zone` using standard ENS resolution. If the client supports ENSIP-10, it MAY use ENSIP-10 resolver discovery for `zone`.
3. If no resolver can be found for `zone`, return no answer.
4. Let `node` be `namehash(zone)` using the normalized `zone`.
5. Normalize `owner` to lowercase ASCII DNS labels, using A-labels for any internationalized labels. The apex owner is the empty string.
6. Construct the key:
   - `dns.<rrtype>` when `owner` is empty.
   - `<owner>.dns.<rrtype>` otherwise.
7. Query the resolver for `data(node, key)`. If the resolver was discovered on the exact `zone` node, call `data` directly. If the resolver was discovered only via ENSIP-10 wildcard resolution, invoke `data` using ENSIP-10 call semantics, such as `resolve(dnsencode(zone), abi.encodeCall(IDataResolver.data, (node, key)))`.
8. If the returned value is non-empty, decode it according to the rules above and return the RRset.
9. If the returned value is empty and `qtype` is not `CNAME`, repeat step 7 for the corresponding `CNAME` key for the same owner.
10. If a `CNAME` is present, follow the `CNAME` target using normal DNS resolution rules. Clients SHOULD cap `CNAME` chasing to a small finite limit, such as 8 hops, and MUST detect loops.
11. If no exact-match RRset exists, and the client can determine that the exact owner name does not otherwise exist within this ENSIP key space, a client MAY apply wildcard owner-name matching as described below.
12. Otherwise, return no answer.

A client MUST treat malformed encodings as an error for that RRset and MUST NOT attempt to partially decode them.

### Wildcard Owner Names

This ENSIP does not require wildcard owner-name support, but it defines a compatible convention for clients that implement it.

A wildcard owner name uses a literal `*` as the leftmost owner label in the standardized key space, such as `*.dns.a` or `*.foo.dns.a`.

A client applying wildcard owner-name matching SHOULD emulate RFC 4592 behavior as closely as practical:

1. Wildcard synthesis applies only when the exact owner name has no RRset standardized by this ENSIP.
2. The client searches for the closest enclosing wildcard owner name within the same ENS node.
3. A practical search algorithm for an owner name such as `www.app` is to try `*.app` and then `*`, stopping at the first matching wildcard owner name. More generally, clients replace the leftmost remaining label with `*` and repeat while moving toward the apex.
4. If a matching wildcard RRset exists for the requested type, the client returns that synthesized RRset.
5. If no wildcard RRset exists for the requested type, the client MAY check for a wildcard `CNAME` RRset and follow it.

Because ENSIP-24 does not define a mandatory "has any records for owner name" primitive analogous to ENSIP-6's `hasDNSRecords`, exact-owner existence checks may be approximate unless the resolver also implements `supportedDataKeys(bytes32)`. Clients that cannot safely determine exact-owner existence SHOULD disable wildcard owner-name synthesis rather than risk returning an incorrect answer.

### TTL

This ENSIP does not store per-record or per-RRset TTL values. Onchain values represent authoritative record content only.

Gateways and other offchain resolvers are expected to cache onchain data according to their own operational needs. Implementations SHOULD use conservative cache lifetimes and SHOULD invalidate cached values when they observe ENSIP-24 `DataChanged` events for the relevant `(node, key)` tuple or when resolver selection for the zone changes in the ENS registry.

Implementations MAY additionally consult the ENS registry TTL for the node as a general cache hint, but that value is outside this ENSIP and does not define a per-key TTL.

## Rationale

ENSIP-6 modeled DNS data as zone records and attempted to preserve more of DNS's authoritative server behavior. That design is powerful, but it is heavier than necessary for the common case of "point this ENS name at one or more IP addresses."

ENSIP-24 provides a smaller primitive: bytes keyed by string. This ENSIP builds on that primitive by treating each DNS RRset as an independently stored value. That makes common updates cheaper and simpler. Changing an `A` record does not require re-encoding the rest of a zone.

This ENSIP uses DNS's native RDATA wire format wherever possible rather than inventing a new binary schema. That choice minimizes translation logic, matches existing DNS libraries, and keeps the proposal close to established DNS conventions. The only exception is the extra `rdlength` framing for repeated `TXT` records, which is required to make concatenated TXT RDATA unambiguous.

The fixed `.dns.<rrtype>` suffix makes keys easy to parse from the right and keeps owner names unambiguous even when they themselves contain a `dns` label.

The proposal standardizes a curated subset of RR types instead of the full DNS type space. Doing so keeps the first version focused on the primary goal of decentralized web hosting and simple gateway interoperability, while leaving room for future ENSIPs to add more record types if real demand appears.

## Backwards Compatibility

This ENSIP introduces a new convention on top of ENSIP-24 and does not change ENSIP-1, ENSIP-10, or existing resolver profiles.

Resolvers and clients MAY support both this ENSIP and ENSIP-6 at the same time. No automatic compatibility with ENSIP-6 wire data is implied, because ENSIP-6 stores whole DNS resource records and record discovery primitives, while this ENSIP stores individual RRsets under ENSIP-24 keys.

Resolvers that already expose arbitrary ENSIP-24 data remain compatible; they simply need to use the standardized keys and encodings defined here to interoperate with gateways implementing this ENSIP.

## Security Considerations

Applications using this ENSIP are trusting the controller of the ENS name, or the resolver it designates, to provide correct DNS data. A malicious or compromised resolver can direct traffic to attacker-controlled IP addresses or hostnames.

Gateways and other clients resolving onchain data should account for block-finality and reorg risk when reading recent state, caching results, or serving responses derived from a specific block.

Clients MUST validate encodings strictly. Length mismatches, truncated domain names, invalid compression pointers, overlong labels, or trailing bytes can otherwise cause incorrect parsing or ambiguous resolution results.

Gateways or other systems that dereference `A`, `AAAA`, or `CNAME` targets to make outbound network connections MUST treat the resulting destinations as untrusted input. They SHOULD reject loopback, link-local, private-use, unique-local, multicast, unspecified, and other special-purpose addresses that could expose internal services or enable SSRF, and SHOULD apply the same policy after every `CNAME` hop.

Clients that follow `CNAME` records SHOULD impose loop detection, a maximum chase depth, and reasonable response-size limits. Clients parsing `TXT` or other variable-length data SHOULD impose reasonable size limits on returned values to avoid excessive resource usage when reading onchain data.

Wildcard owner-name synthesis can produce incorrect answers if the client cannot reliably determine whether an exact owner name exists. Implementations should treat wildcard support as optional unless they can make that determination safely. Incomplete `supportedDataKeys()` results are particularly dangerous if a client treats them as authoritative for wildcard suppression.

Key construction must be deterministic. Implementations should normalize owner labels and embedded domain names to lowercase ASCII A-labels before building keys or encodings; otherwise, different applications may look up or store different bytes for the same DNS name.

Because this ENSIP does not define TTL storage, stale cached data can persist longer than intended if an application chooses overly long cache durations. Gateways should use conservative TTLs and prefer event-driven invalidation when practical.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
