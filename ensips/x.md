---
description: Standardizes storing common DNS RRsets in ENSIP-24 arbitrary data records.
contributors:
  - gskril
ensip:
  created: "2026-04-22"
  status: draft
---

# ENSIP-X: DNS Resource Records via Arbitrary Data Resolution

## Abstract

This ENSIP defines a lightweight resolver profile for storing common DNS Internet-class resource record sets on ENS names using ENSIP-24's `data(bytes32 node, string key)` interface. It standardizes key names, owner-name scoping, and binary encodings for `A`, `AAAA`, `CNAME`, `TXT`, and `MX` records so gateways can resolve `.eth` names to IP addresses and other common DNS data without implementing the full DNS-in-ENS zone model from ENSIP-6.

## Motivation

Users want `.eth` names to behave like decentralized domains for simple web hosting and similar applications. A gateway such as `eth.limo` should be able to read an `A` or `AAAA` record from ENS, connect to the corresponding origin, and serve content for that name. ENSIP-6 showed that DNS data can be stored in ENS, but its zone-oriented model is unnecessarily complex for this common case.

ENSIP-24 introduces a generic `data(bytes32 node, string key) -> bytes` interface that is well suited to storing independent DNS RRsets. A simpler standard is needed so different resolvers, authoring tools, and gateways use the same keys and encodings.

This ENSIP intentionally does not attempt to recreate all DNS zone semantics onchain. It standardizes a compact subset of records and reuses DNS's native binary encodings wherever possible, which keeps the data model easy to implement and easy to bridge into conventional DNS software.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Overview

This ENSIP defines a convention for storing DNS RRsets inside ENSIP-24 arbitrary data records.

The `node` parameter is the ENS namehash of the zone apex, as defined in ENSIP-1. The `key` parameter identifies an owner name relative to that apex and a DNS RR type. The `bytes` return value encodes the RRset for that `(node, owner, rrtype)` tuple.

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
- `<owner>` is a relative owner name beneath the ENS node, expressed as lowercase ASCII DNS labels separated by `.`, with no trailing `.`.
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

This ENSIP standardizes the following RR types:

- `A` (type 1)
- `CNAME` (type 5)
- `MX` (type 15)
- `TXT` (type 16)
- `AAAA` (type 28)

This curated subset is intentional. These records cover the common cases of web hosting, canonical host aliases, simple text metadata, and mail routing without reintroducing the full complexity of DNS zone management.

Resolvers MAY expose additional nonstandard keys, but clients claiming compliance with this ENSIP MUST implement only the keys and encodings defined here. Additional RR types SHOULD be standardized in future ENSIPs rather than inferred ad hoc.

### Value Encoding

#### General Rules

The value returned by `data(node, key)` encodes the RDATA for the RRset identified by `key`. Except where this ENSIP defines an additional framing rule, each item uses the DNS RDATA wire format for that RR type rather than the full DNS resource record wire format. In particular, `NAME`, `TYPE`, `CLASS`, `TTL`, and `RDLENGTH` are not included.

All multi-octet integers MUST use network byte order.

All domain names embedded in RDATA MUST be encoded as absolute DNS names in the uncompressed RFC 1035 section 3.1 wire format, including the terminating zero-length root label. Compression pointers MUST NOT be used.

A zero-length return value means the RRset is absent. Authoring tools and resolvers SHOULD clear a key instead of intentionally storing an empty RRset.

#### A

The value for `dns.a` or `<owner>.dns.a` is the concatenation of zero or more 4-byte IPv4 addresses, matching the `A` RDATA format in RFC 1035 section 3.4.1.

If the RRset contains `N` records, the value length MUST be `N * 4`.

Example:

```
192.0.2.1, 192.0.2.2
=> 0xc0000201c0000202
```

#### AAAA

The value for `dns.aaaa` or `<owner>.dns.aaaa` is the concatenation of zero or more 16-byte IPv6 addresses, matching the `AAAA` RDATA format in RFC 3596 section 2.2.

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

### Record Construction and Parsing

For the supported RR types, gateways and authoring tools MUST apply the following rules:

- An `A` value whose length is not a multiple of 4 is invalid.
- An `AAAA` value whose length is not a multiple of 16 is invalid.
- A `CNAME` value MUST decode to exactly one absolute domain name and no trailing bytes.
- Each TXT item's `rdlength` MUST fit entirely inside the value, and its `txt-rdata` MUST be valid RFC 1035 TXT RDATA.
- Each MX item MUST contain a full 2-byte preference field followed by one absolute domain name and no trailing bytes beyond the concatenated sequence.

Clients SHOULD preserve stored record order when returning `A`, `AAAA`, and `TXT` RRsets. Clients resolving `MX` records SHOULD sort the decoded records by ascending `preference` before use, preserving stored order among records with the same preference.

### Resolution Algorithm

An application using this ENSIP MUST already know the ENS zone apex it is querying. How an application maps an incoming hostname to an ENS name is out of scope for this ENSIP.

If an application supports both exact ENS subname resolution and zone-scoped owner names, it SHOULD prefer data stored on the exact ENS name's own `dns.<rrtype>` key over data stored on a parent node's `<owner>.dns.<rrtype>` key. This preserves ENS delegation semantics for independently managed subnames.

Given an ENS zone apex `zone`, a relative owner name `owner`, and a query type `qtype`, a client MUST:

1. Normalize `zone` according to ENSIP-1 and resolve its resolver using standard ENS resolution as defined in ENSIP-1, and ENSIP-10 if wildcard ENS resolution is supported.
2. Let `node` be `namehash(zone)` using the normalized `zone`.
3. Normalize `owner` to lowercase ASCII DNS labels, using A-labels for any internationalized labels. The apex owner is the empty string.
4. Construct the key:
   - `dns.<rrtype>` when `owner` is empty.
   - `<owner>.dns.<rrtype>` otherwise.
5. Query `data(node, key)` on the resolver. If the resolver was discovered via ENSIP-10 wildcard resolution, the client MUST follow ENSIP-10 call semantics when invoking `data`.
6. If the returned value is non-empty, decode it according to the rules above and return the RRset.
7. If the returned value is empty and `qtype` is not `CNAME`, query the corresponding `CNAME` key for the same owner.
8. If a `CNAME` is present, follow the `CNAME` target using normal DNS resolution rules. Clients SHOULD cap `CNAME` chasing to a small finite limit, such as 8 hops.
9. If no exact-match RRset exists, a client MAY apply wildcard owner-name matching as described below.
10. Otherwise, return no answer.

A client MUST treat malformed encodings as an error for that RRset and MUST NOT attempt to partially decode them.

### Wildcard Owner Names

This ENSIP does not require wildcard owner-name support, but it defines a compatible convention for clients that implement it.

A wildcard owner name uses a literal `*` as the leftmost owner label in the standardized key space, such as `*.dns.a` or `*.foo.dns.a`.

A client applying wildcard owner-name matching SHOULD emulate RFC 4592 behavior as closely as practical:

1. Wildcard synthesis applies only when the exact owner name has no RRset standardized by this ENSIP.
2. The client searches for the closest enclosing wildcard owner name within the same ENS node.
3. If a matching wildcard RRset exists for the requested type, the client returns that synthesized RRset.
4. If no wildcard RRset exists for the requested type, the client MAY check for a wildcard `CNAME` RRset and follow it.

Because ENSIP-24 does not define a mandatory "has any records for owner name" primitive analogous to ENSIP-6's `hasDNSRecords`, exact-owner existence checks may be approximate unless the resolver also implements `supportedDataKeys(bytes32)`. Clients that cannot safely determine exact-owner existence SHOULD disable wildcard owner-name synthesis rather than risk returning an incorrect answer.

### TTL

This ENSIP does not store per-record or per-RRset TTL values.

Gateways and other offchain resolvers are expected to cache onchain data according to their own operational needs. Implementations SHOULD use conservative cache lifetimes and SHOULD invalidate cached values when they observe ENSIP-24 `DataChanged` events for the relevant `(node, key)` tuple.

Implementations MAY additionally consult the ENS registry TTL for the node as a general cache hint, but that value is outside this ENSIP and does not define a per-key TTL.

## Rationale

ENSIP-6 modeled DNS data as zone records and attempted to preserve more of DNS's authoritative server behavior. That design is powerful, but it is heavier than necessary for the common case of "point this ENS name at one or more IP addresses."

ENSIP-24 provides a smaller primitive: bytes keyed by string. This ENSIP builds on that primitive by treating each DNS RRset as an independently stored value. That makes common updates cheaper and simpler. Changing an `A` record does not require re-encoding the rest of a zone.

This ENSIP uses DNS's native RDATA wire format wherever possible rather than inventing a new binary schema. That choice minimizes translation logic, matches existing DNS libraries, and keeps the proposal close to established DNS conventions. The only exception is the extra `rdlength` framing for repeated `TXT` records, which is required to make concatenated TXT RDATA unambiguous.

The proposal standardizes a curated subset of RR types instead of the full DNS type space. Doing so keeps the first version focused on the primary goal of decentralized web hosting and simple gateway interoperability, while leaving room for future ENSIPs to add more record types if real demand appears.

## Backwards Compatibility

This ENSIP introduces a new convention on top of ENSIP-24 and does not change ENSIP-1, ENSIP-10, or existing resolver profiles.

Resolvers and clients MAY support both this ENSIP and ENSIP-6 at the same time. No automatic compatibility with ENSIP-6 wire data is implied, because ENSIP-6 stores whole DNS resource records and record discovery primitives, while this ENSIP stores individual RRsets under ENSIP-24 keys.

Resolvers that already expose arbitrary ENSIP-24 data remain compatible; they simply need to use the standardized keys and encodings defined here to interoperate with gateways implementing this ENSIP.

## Security Considerations

Applications using this ENSIP are trusting the controller of the ENS name, or the resolver it designates, to provide correct DNS data. A malicious or compromised resolver can direct traffic to attacker-controlled IP addresses or hostnames.

Clients MUST validate encodings strictly. Length mismatches, truncated domain names, invalid compression pointers, or trailing bytes can otherwise cause incorrect parsing or ambiguous resolution results.

Clients that follow `CNAME` records SHOULD impose loop detection and a maximum chase depth. Clients parsing `TXT` or other variable-length data SHOULD impose reasonable size limits on returned values to avoid excessive resource usage when reading onchain data.

Wildcard owner-name synthesis can produce incorrect answers if the client cannot reliably determine whether an exact owner name exists. Implementations should treat wildcard support as optional unless they can make that determination safely.

Key construction must be deterministic. Implementations should normalize owner labels to lowercase ASCII A-labels before building keys; otherwise, different applications may look up different keys for the same DNS name.

Because this ENSIP does not define TTL storage, stale cached data can persist longer than intended if an application chooses overly long cache durations. Gateways should use conservative TTLs and prefer event-driven invalidation when practical.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
