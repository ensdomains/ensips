---
title: Record Verification
description: A common protocol for verifying that the resource an ENS record points to has approved its association with the name.
contributors:
  - envoy1084.eth
ensip:
  created: "2026-10-20"
  status: draft
track: Ecosystem
---

# ENSIP-X: Record Verification

## Abstract

This ENSIP defines a common protocol for verifying a single ENS record. A companion text record, the _descriptor_, selects an _authority algorithm_ and a _verification method_. The account selected by the authority algorithm, the _authority_, signs an [EIP-712](https://eips.ethereum.org/EIPS/eip-712) _claim_ that binds the name, the record, and its exact value. A client checks the claim against current ENS state, then checks the authority's signature and the evidence the method requires from the record's target. Verification methods are specified separately.

## Motivation

ENS records point to external resources such as websites, blockchain accounts, and social accounts. A record says where a resource is, but not whether the resource agrees to be associated with the name. Anyone who controls a name can set its `url` record to `https://example.com`.

Existing solutions each define their own discovery, signed message, and rules for who may approve, so clients must implement each one separately. This ENSIP defines the parts every such scheme needs, once:

- where a client finds verification data for a record
- which ENS account must approve the record
- what that account signs, so that an approval cannot be reused for another name, record, or value, and
- how long a verification result remains valid.

A verification method then only needs to define the evidence the target provides. Verification is performed by clients and does not change how a record resolves.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Overview

A **record** is one resolver record of a name, such as `text(node, "url")`. Its **target** is the external resource its value identifies, such as the website `https://example.com`.

A name makes a record verifiable by publishing a **descriptor** under a companion text key. The descriptor names an **authority algorithm**, which selects the **authority** whose approval is required, and a **verification method**, which defines the evidence the target must provide. The authority signs a **claim** binding the name, the record's value, and the target. The claim, its signature, and the method's evidence are published together in an **envelope**.

To verify a record, a client:

1. reads the record and its descriptor;
2. selects the authority from current ENS state;
3. retrieves the envelope and checks that its claim matches what the client derived;
4. checks the authority's signature and the method's evidence; and
5. returns a result that remains valid for a short, bounded time.

The sections below define each part in that order.

### Descriptor Key

The descriptor for a record is an [ENSIP-5](./5.md) text record on the same name, under this key:

| Record                 | Descriptor key                   |
| ---------------------- | -------------------------------- |
| `text(node, key)`      | `verification[text][<key>]`      |
| `addr(node, coinType)` | `verification[addr][<coinType>]` |
| `contenthash(node)`    | `verification[contenthash]`      |
| `pubkey(node)`         | `verification[pubkey]`           |

- `<key>` is the text record key exactly as written. Clients MUST NOT trim, normalize, or escape it. For example, the key `agent-endpoint[mcp]` has the descriptor key `verification[text][agent-endpoint[mcp]]`.
- `<coinType>` is the coin type as a canonical decimal, from `0` to `2^256 - 1`. The legacy `addr(node)` record is `addr(node, 60)`.

An empty descriptor means verification is not configured for the record. A failed read MUST NOT be treated as an empty descriptor. Other record types are out of scope.

### Descriptor

A descriptor has the following form, where the bracketed field is optional:

```text
ensrv1 a=<authority-version> m=<method> [u=<proof-location>]
```

- `a` is the **authority version**: a canonical decimal from `1` to `2^32 - 1` that selects the authority algorithm.
- `m` is the **method identifier**: one or more segments separated by dots, followed by a version segment such as `v1`. A segment contains only `a-z`, `0-9`, and `-`, starts with a letter, and ends with a letter or digit. The version number is a canonical decimal from `1` to `2^32 - 1`. An example is `example.v1`.
- `u` is the **proof location**: an absolute URI as defined by [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986). The method determines whether `u` is required, optional, or forbidden.

Clients MUST reject a descriptor unless:

- it is ASCII, at most 32,768 bytes long, and starts with `ensrv1`;
- its fields are separated by exactly one space, with no other whitespace;
- `a` and `m` each appear exactly once, and `u` at most once; and
- it contains no empty or unknown fields.

Fields MAY appear in any order, but publishers SHOULD use the order `a`, `m`, `u`. Each field is split at its first `=`. Clients MUST match `m` exactly, with no aliases or fallback to another version. `u` MUST NOT contain user information, a fragment, or non-ASCII characters, and clients MUST NOT modify it before use.

If a client does not implement the authority algorithm named by `a` or the method named by `m`, the result is unsupported.

### ENS State

Clients MUST normalize the name according to [ENSIP-15](./15.md) and compute its node according to [ENSIP-1](./1.md), and MUST use the normalized name throughout the verification.

All ENS reads in one verification MUST be made at the same **block**. This includes the record, the descriptor, every read made by the authority algorithm, and the signature check, so that all of them describe the same state. Clients SHOULD read by block hash, as defined in [EIP-1898](https://eips.ethereum.org/EIPS/eip-1898), and MUST NOT mix in reads at `latest`. If the ENS block is removed by a chain reorganization, clients MUST discard the verification.

### Authority

The authority algorithm named by `a` takes the normalized name and the ENS block, and either fails or returns:

- `authority`, the nonzero address of the account whose approval is required; and
- optionally, `authorityValidUntil`, the time at which that account stops being the authority.

Clients MUST select the authority only by running this algorithm. They MUST NOT take the authority from the envelope, or accept another account in its place, such as a parent name's owner, an approved operator, or the account that set the record. If the algorithm fails, verification fails.

#### Authority Version 1

Authority version 1 (`a=1`) selects the owner of the exact name in ENS v1 on Ethereum mainnet, using these contracts:

| Contract       | Address                                      |
| -------------- | -------------------------------------------- |
| Registry       | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` |
| Base Registrar | `0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85` |
| Name Wrapper   | `0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401` |

A name is **wrapped** if `Registry.owner(node)` is the Name Wrapper. A **`.eth` second-level name** has exactly two labels, the second being `eth`; its `tokenId` is `uint256(keccak256(firstLabel))`. The authority is selected by the first matching row:

| Name                               | `authority`                                | `authorityValidUntil`                                  | Also requires                                        |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------- |
| Wrapped `.eth` second-level name   | `NameWrapper.getData(uint256(node)).owner` | `BaseRegistrar.nameExpires(tokenId)`                   | `BaseRegistrar.ownerOf(tokenId)` is the Name Wrapper |
| Other wrapped name                 | `NameWrapper.getData(uint256(node)).owner` | `getData` expiry, if `PARENT_CANNOT_CONTROL` is burned | None                                                 |
| Unwrapped `.eth` second-level name | `BaseRegistrar.ownerOf(tokenId)`           | `BaseRegistrar.nameExpires(tokenId)`                   | The token owner is not the Name Wrapper              |
| Any other name                     | `Registry.owner(node)`                     | None                                                   | None                                                 |

The algorithm fails if the authority is the zero address, if the ENS block's timestamp is not before `authorityValidUntil`, if a required condition does not hold, or if any read reverts. `PARENT_CANNOT_CONTROL` is the Name Wrapper fuse `0x10000`. Registration expiry excludes the renewal grace period, so a `.eth` name in its grace period has no authority.

Version 1 does not support the root name, `reverse`, or names ending in `.reverse`. A name that exists only through wildcard or offchain resolution has no Registry owner, so it has no authority.

### Claim

The claim is the statement the authority signs. It is the same for every method:

```solidity
struct ENSRecordVerification {
    string name;
    bytes32 node;
    string recordType;
    string recordKey;
    bytes32 valueHash;
    uint32 authorityVersion;
    address authority;
    string method;
    string target;
    uint64 issuedAt;
    uint64 validUntil;
}
```

| Field              | Value                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `name`             | The normalized name                                                                         |
| `node`             | The namehash of `name`                                                                      |
| `recordType`       | `text`, `addr`, `contenthash`, or `pubkey`                                                  |
| `recordKey`        | The text key for `text`; the coin type, as a canonical decimal, for `addr`; otherwise empty |
| `valueHash`        | The keccak256 hash of the record's value                                                    |
| `authorityVersion` | The descriptor's `a`                                                                        |
| `authority`        | The account selected by the authority algorithm                                             |
| `method`           | The descriptor's `m`                                                                        |
| `target`           | The target, derived from the record's value as the method defines                           |
| `issuedAt`         | The time the claim was issued                                                               |
| `validUntil`       | The time the claim expires                                                                  |

`valueHash` is the `keccak256` of the record's value as decoded from the resolver: the UTF-8 bytes for `text`, the raw bytes for `addr` and `contenthash`, and the 32-byte `x` coordinate followed by the 32-byte `y` coordinate for `pubkey`. It MUST NOT include ABI encoding or a display format such as a checksummed address. An empty value, or a public key of `(0, 0)`, means the record is not configured.

Because the claim binds the exact value, a changed record requires a new claim.

#### Claim Digest

The claim is signed as EIP-712 typed data with primary type `ENSRecordVerification` and this domain:

```json
{ "name": "ENS Record Verification", "version": "1", "chainId": 1 }
```

The domain MUST NOT include `verifyingContract` or `salt`. `chainId` identifies the ENS deployment and stays `1` even when the target is on another chain; a method that depends on the target's chain MUST include it in `target`. The EIP-712 hash of the claim is the **claim digest**.

### Envelope

The envelope carries the claim, the authority's signature, and the method's evidence. It is a JSON object or a CBOR map with exactly these members:

| Member               | Value                                               |
| -------------------- | --------------------------------------------------- |
| `v`                  | The string `ensrv1`                                 |
| `claim`              | The claim, with each field exactly once             |
| `authoritySignature` | The authority's signature over the claim digest     |
| `proof`              | The method's evidence, in a form the method defines |

Clients MUST reject an envelope with missing, duplicate, or unknown members.

- In JSON, `authorityVersion`, `issuedAt`, and `validUntil` are canonical decimal strings, and `node`, `valueHash`, `authority`, and `authoritySignature` are lowercase hex strings prefixed with `0x`.
- In CBOR, integers are unsigned integers and byte values are byte strings, using the deterministic encoding of [RFC 8949, Section 4.2.1](https://www.rfc-editor.org/rfc/rfc8949#section-4.2.1).

The envelope is not itself signed. The signature covers the claim digest, so the same claim in either format carries the same signature.

#### Envelope Location

The method determines where the envelope is published: at the descriptor's `u`, or at a location the method derives from the record. Clients MUST retrieve the envelope only from that location.

An envelope MAY be stored inline as `u=data:application/json;base64,<data>` or `u=data:application/cbor;base64,<data>`, where `<data>` is the envelope in padded standard Base64. Other locations, such as HTTPS URLs or IPFS content, are retrieved under rules defined by the method.

Envelopes are untrusted input. Clients MUST NOT accept an envelope larger than 16 KiB inline or 256 KiB otherwise, MUST NOT follow HTTP redirects, and MUST NOT execute retrieved content.

#### Proof Key

A method MAY derive the envelope location from the **proof key**, which is computed only from values the client knows before retrieval:

```solidity
proofKey = keccak256(abi.encode(
    keccak256("ENSRecordVerificationProofKey(bytes32 domainSeparator,uint32 authorityVersion,address authority,bytes32 node,bytes32 recordTypeHash,bytes32 recordKeyHash,bytes32 methodHash)"),
    domainSeparator,
    authorityVersion,
    authority,
    node,
    keccak256(recordType),
    keccak256(recordKey),
    keccak256(method)
))
```

`domainSeparator` is the EIP-712 domain separator of the claim digest. Clients MUST compute each input from ENS state and the descriptor, not from the envelope. The proof key excludes the record's value and the claim's timestamps, so a renewed envelope can be published at the same location.

### Verification Procedure

To verify a record, a client MUST:

1. Normalize the name and derive the descriptor key.
2. Read the record and the descriptor at the ENS block. If either is not configured, the result is not configured.
3. Parse the descriptor, select the authority algorithm and the method, and check that the method supports the record.
4. Select the authority.
5. Derive the expected claim fields from `name` to `target`, and the envelope location.
6. Retrieve and decode the envelope.
7. Check that each claim field from `name` to `target` equals its expected value.
8. Check the authority signature, as defined below.
9. Check the method's evidence.
10. Check the [validity](#validity) of the claim.

A record is verified only if every step succeeds. Clients MUST NOT change the authority, method, record, or envelope location to make a step succeed.

#### Authority Signature

How the signature is checked depends on whether the authority has contract code at the ENS block:

- **Without code**, the signature MUST be 65 bytes, or 64 bytes as defined in [ERC-2098](https://eips.ethereum.org/EIPS/eip-2098), with an `s` value no greater than half the curve order, and MUST recover to `authority`.
- **With code**, a call to `isValidSignature(claimDigest, authoritySignature)` on `authority`, as defined in [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271), MUST return `0x1626ba7e` without changing state. This applies to accounts delegated under [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702).

If one path rejects the signature, clients MUST NOT try the other. Signatures wrapped as defined in [ERC-6492](https://eips.ethereum.org/EIPS/eip-6492) are unsupported.

### Validity

Let `checkedAt` be the client's current time, taken immediately before returning a result. A client MUST NOT return a positive result unless:

```text
issuedAt <= checkedAt + 300
issuedAt < validUntil
validUntil - issuedAt <= maxLifetime
checkedAt < validUntil
checkedAt < authorityValidUntil     (if present)
checkedAt < evidenceValidUntil      (if present)
```

The 300-second allowance tolerates small clock differences at issuance and never extends an expiry. `maxLifetime` is the longest validity period the method allows, and `evidenceValidUntil` is the expiry of the method's evidence, if it has one.

A positive result MAY be cached for at most 300 seconds, and never beyond any of these expiry times. Clients MUST discard a cached result as soon as they learn that the record, descriptor, resolver, or authority has changed.

### Results

A verification returns one of:

- `{ "verified": true, "verificationType": "control" }`: the authority approved the claim, and the target proved its control as the method requires;
- `{ "verified": true, "verificationType": "attestation" }`: the authority approved the claim, and an issuer trusted by the client attested to it; or
- `{ "verified": false }`: a step failed or could not be completed.

The `verificationType` is determined by the method, not by the envelope.

On failure, clients SHOULD report the reason: not configured, unsupported, invalid, expired, unavailable, or blocked by client policy. A network failure or timeout MUST be reported as unavailable, not invalid. A failed verification does not change or hide the record.

### Verification Methods

Verification methods are specified separately, and new methods can be added over time without changing this ENSIP. A method specification MUST define:

1. its identifier, and the records and values it supports;
2. how `target` is derived from the record's value;
3. where the envelope is published, whether `u` is required, optional, or forbidden, and which formats are allowed;
4. the contents of `proof`, and how clients check it; and
5. its `maxLifetime`, any `evidenceValidUntil`, and its `verificationType`.

The authority signature covers only the claim, not `proof`. A method MUST therefore bind its evidence to the claim, for example by requiring the target to publish the envelope or to sign the claim digest. A method of type `attestation` MUST also define which issuers clients may trust and how attestations are revoked.

New authority algorithms are likewise specified separately, with an unused `a` value and the ENS deployment, contracts, and selection rules they use.

### Example

Alice holds the Base Registrar token for the unwrapped name `alice.eth` in the account `0x1234567890abcdef1234567890abcdef12345678`. She makes its `url` record verifiable using a hypothetical method, `example.v1`.

Under `a=1`, Alice's account is the authority, and it signs this claim:

```json
{
  "name": "alice.eth",
  "node": "0x787192fc5378cc32aa956ddfdedbf26b24e8d78e40109add0eea2c1a012c3dec",
  "recordType": "text",
  "recordKey": "url",
  "valueHash": "<keccak256 of https://example.com>",
  "authorityVersion": "1",
  "authority": "0x1234567890abcdef1234567890abcdef12345678",
  "method": "example.v1",
  "target": "<as defined by example.v1>",
  "issuedAt": "1783728000",
  "validUntil": "1786320000"
}
```

The envelope is published where `example.v1` requires, and the name sets these text records:

```text
url                     = https://example.com
verification[text][url] = ensrv1 a=1 m=example.v1
```

A client reads both records at one block, selects Alice's account as the authority, and retrieves the envelope. It checks that the claim matches the name, record, value, authority, and method, that Alice's account signed it, and that the method's evidence and the validity period hold.

If the `url` record changes, or `alice.eth` is transferred, the claim no longer matches and verification fails until the authority signs a new one.

Implementation guides, test vectors, and limits still being finalized are available at [ensip-verification.vercel.app](https://ensip-verification.vercel.app).

## Rationale

- **Companion text records.** A descriptor in a text record works with every resolver that supports [ENSIP-5](./5.md) and leaves the original record unchanged. The bracketed key follows the convention of [ENSIP-25](./25.md), [ENSIP-26](./26.md), and [ENSIP-27](./27.md).
- **The owner is the authority.** Permission to edit records is often delegated to managers and operators. Under version 1, only the name's owner can approve a claim, though a manager can still publish an envelope the owner signed.
- **Versioned authority.** Which account owns a name depends on the ENS deployment. The `a` field lets a future deployment use a new authority algorithm without changing the claim or any method.
- **One claim for all methods.** Every method relies on the same binding between name, record, value, authority, and method, so an approval cannot be replayed for anything else.
- **No resolver in the claim.** A name can move to a new resolver without invalidating its envelopes, as long as its record values are unchanged.
- **Short-lived results.** Ownership and records can change at any block, and claims cannot be revoked onchain. Re-checking state and caching briefly keeps results current.

## Backwards Compatibility

This ENSIP adds text records and client behavior only. It requires no new resolver interface and no change to existing records. Clients that do not support it are unaffected.

## Security Considerations

- **Derive, then compare.** A valid signature over values taken from the envelope proves nothing. Clients MUST derive each claim field and the authority themselves, then compare.
- **No revocation.** A claim remains valid until it expires. If the state it was signed for is restored, for example when a name returns to a previous owner, it becomes valid again. Authorities SHOULD use short validity periods.
- **Limits of version 1.** The Registry owner of an unwrapped subname remains its authority even if the parent name changes hands. For an imported DNS name, ENS ownership is not checked against current control of the DNS name.
- **Offchain records.** Records served by an offchain gateway may come from different gateway responses, even when read at the same block.
- **Privacy.** Retrieving an envelope reveals the client's network address and the name being checked to the server that hosts it.
- **Meaning of a result.** A positive result means one record was approved by its authority and passed the method's check when it was verified. It does not prove legal identity, or that the target is safe.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
