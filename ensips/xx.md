---
description: A standard for publishing third-party attestations of ENS text records.
contributors:
  - jkm.eth
  - 1a35e1.eth
ensip:
  created: '2026-08-31'
  status: draft
---

# ENSIP-X: Text Record Attestations

## Abstract

[ENSIP-5](https://docs.ens.domains/ensip/5) introduced text records for ENS names. Name owners use these records to advertise social media accounts and other profile information. For many records, an authority or a trusted third-party observer can verify the claimed association. This document defines how such a third party creates an attestation of a record's validity, how a name owner publishes it, and how a consumer interprets it.

## Motivation

Name owners use text records to add profile or identity information to an ENS name: an account on a centralized social media platform, a website, or personal information such as the owner's name. Nothing in the record proves the validity of that information, and any name owner can claim any social media account or any website. A consumer of the record has no way to tell a true claim from a false one.

Many of these claims are verifiable in some fashion. For a social media account, the platform itself could verify account ownership and authoritatively state whether the ENS name owner also owns the social media account. Alternatively, a trusted observer could watch the name owner sign in to the account and prove control of the ENS name in one session, thereby proving ownership.

What is missing is a standard way for these authorities or trusted third-party observers to publish what they have verified. This standard fills that gap, by defining a compact attestation format which can be signed by a trusted party and published alongside the corresponding ENS text record. Consumers will be free to pick which entities they trust, and can easily see which records have been verified by said entities.

## Specification

The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", and "MAY" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

This document refers to the following parties:

- The *name owner* is the party that holds an ENS name and publishes text records on it.
- The *manager* of a name is the account authorized to update the name's records, represented by the owner's Ethereum address.
- The *attester* is the third party that verifies the claim a text record makes and signs an attestation of that verification.
- The *consumer* is the party that reads a name's text records and validates their attestations before relying on them.

### What an attestation asserts

An attestation can be either valid or invalid, and is a statement of one narrow claim: the attester observed that a specified text record held a correct value, in the context of the specified ENS name, at the time of issuance.

For most records, correct means that the value satisfies the record's definition as presented in an ENSIP or other documentation. For example, an [ENSIP-18](https://docs.ens.domains/ensip/18) profile service key can identify a social media account belonging to the ENS name owner, so an attestation of such a record verifies that ownership. If a record's definition points to personal details of the owner, an attestation of that record means the attester verified those details.

An attester SHOULD NOT issue an attestation for information that is self-validating or impossible to verify. For example, a `description` record is self-validating: it holds a free-form statement from the owner, and its publication already proves that the owner had permission to publish it.

An attestation carries no authority of its own. Any key can sign an attestation for any record, and so a consumer MUST accept an attestation only from an attester that it trusts to verify that record type.

### Creating an attestation

An attester MUST have an ENS name that resolves to its signing address. The name lets a consumer identify the attester's attestations, and lets the attester deprecate a compromised key by updating the name. It is RECOMMENDED for attesters to run their attestation service under a dedicated subname, for example `atst.example.eth`. A subname lets the attester manage the service's key independently of the parent name.

Before signing, the attester MUST verify that all of the following are true:

1. The name owner that requests the attestation controls a wallet address `a`.
2. `a` is the current manager of the ENS name `n`.
3. The claim that the record value represents is valid, established by a method appropriate to the record type.

The attestation payload is a map of five fields, encoded as canonical [DAG-CBOR](https://ipld.io/docs/codecs/known/dag-cbor/):

| Field        | Key | Description                                          |
| ------------ | --- | ---------------------------------------------------- |
| Name         | `n` | The ENS name the attestation is bound to.            |
| Address      | `a` | The wallet address that manages the ENS name.        |
| Record key   | `k` | The key of the text record being attested.           |
| Record value | `v` | The value of that text record at issuance.           |
| Issued at    | `t` | The timestamp of issuance, as integer Unix seconds.  |

The attester signs the payload with its key, using [EIP-191](https://eips.ethereum.org/EIPS/eip-191) over the keccak256 hash of the encoded payload bytes.

The attestation is a CBOR envelope under tag `1635021684`, which is `0x61747374`, the ASCII encoding of `atst`:

```
Tag(1635021684) [
    1,           ; envelope version
    <integer>,   ; timestamp t
    <bytes 65>,  ; signature, EIP-191 over keccak256(payload)
]
```

At minimum, the envelope carries only the version, the timestamp, and the signature. The consumer reconstructs every other payload field from ENS data, as described in [Validating an attestation](#validating-an-attestation).

An attester MAY append fields to the envelope to expand on an attestation's details, such as an expiration time. Any appended value MUST also appear in the signed payload under the same field key. The name of an appended key MUST NOT conflict with a field key in the preceding table, and SHOULD be as short as possible.

#### Example: attest ownership of a social media account

1. The name owner signs a challenge with their wallet key to authenticate with the attester. This yields a verified address `a`.
2. The attester checks on-chain that `a` is the current manager of the name owner's ENS name `n`.
3. The name owner authenticates to the social media platform through an OAuth flow bound to the same session. This yields a verified handle `v` for the platform's service key `k`, such as `com.x`.
4. With every field bound to one session, the attester sets `t` to the current time, then assembles and encodes the payload.
5. The attester signs the payload, builds the envelope, and returns it to the name owner for publication.

### Publishing an attestation

After issuance, the name owner publishes the attestation as a text record on their own ENS name, under a key of the following form:

```
attestations[RECORD_KEY][ATTESTER_NAME]
```

Replace `RECORD_KEY` with the key of the attested text record, and `ATTESTER_NAME` with the attester's ENS name.

`RECORD_KEY` MUST match the attested record's key exactly. A consumer extracts `RECORD_KEY` from the record name and matches it against the name's text records to determine which record the attestation refers to. This binds each attestation to one name, record, and attester triple.

For example, `user.eth` publishes an attestation by `atst.example.eth` of its `com.x` record under the key `attestations[com.x][atst.example.eth]`. If an alternate metadata schema is in use, the name owner MAY use any key name that also includes `RECORD_KEY` and `ATTESTER_NAME`. Otherwise, the name owner MUST use the default key name format listed above.

The record value holds the CBOR envelope, encoded either as `0x`-prefixed hexadecimal or as base64. A name owner SHOULD use base64, especially when additional fields are included in the attestation. A consumer MUST accept both, and MUST distinguish them by the presence of the `0x` prefix.

A name owner MAY also publish an envelope as an [ENSIP-24](https://docs.ens.domains/ensip/24) `data()` record. This gains efficiency at the cost of discoverability.

### Validating an attestation

To validate an attestation, start with the name owner's ENS name `n`, a record key `k`, and an attester ENS name, then do the following:

1. Read the name's text record at `attestations[RECORD_KEY][ATTESTER_NAME]`, then decode the envelope to obtain `t` and the signature `s`.
2. Query the ENS registry for the current manager of the name `n` to obtain `a`.
3. Read the name's text record for the given record key `k` to obtain `v`.
4. Reconstruct the payload from `n`, `a`, `k`, `v`, and `t`, then encode it as canonical DAG-CBOR.
5. Compute the keccak256 hash of the encoded payload, then recover the signer address `sa` from the digest and the signature `s` with EIP-191.
6. Resolve the attester's ENS name to obtain the expected attester address `aa`.
7. Compare the two addresses, `sa` and `aa`. The attestation is valid if, and only if, the recovered signer address equals the expected attester address.

The consumer reconstructs every payload field except the timestamp from live ENS data, so nothing beyond the envelope needs to be stored or supplied. Any change to that data after issuance makes recovery yield a different address. Validation therefore fails in each of the following cases:

- The name transfers to a new manager.
- The attested record is removed or replaced.
- The envelope is republished under a different ENS name.
- The attester rotates the address that its name resolves to.

### Revoking an attestation

An attestation is a snapshot in time. It proves that the attester observed a claim to be true at the moment of issuance. A later change in circumstances does not make that observation false, so this standard defines no way to revoke a single attestation. A consumer that needs freshness can apply its own policy to the issuance timestamp `t`.

If an attester issues an attestation fraudulently, its private key is no longer trustworthy. The attester deprecates the key by changing the address that its ENS name resolves to. Because a consumer resolves the attester's name at validation time, this change invalidates every attestation that the old key signed.

## Rationale

Text records target a human reader. Attestations augment that data as a protocol-level feature, and no human is expected to read them directly. This standard therefore keeps the published artifact as compact as possible and builds on the primitives that existing ENS infrastructure provides.

A standard attestation takes no more on-chain storage than an IPFS URL. A larger format could push attesters to store attestations on IPFS and publish only a URI, which would save storage cost but force every consumer into an extra out-of-band retrieval.

Reconstruction from live ENS data, rather than embedding the payload in the envelope, keeps the stored artifact small and makes the attestation self-invalidating. No duplicated data needs to stay in sync, and any divergence between the attested state and the current state surfaces as a signature mismatch, so the standard needs no revocation infrastructure. The changes that invalidate an attestation are listed in [Validating an attestation](#validating-an-attestation).

## Security Considerations

An attestation proves only that a particular key signed a particular claim. It does not establish that the signer had the authority or the competence to verify that claim. As required in [What an attestation asserts](#what-an-attestation-asserts), a consumer maintains its own list of trusted attesters for each record type.

Individual attestations cannot be revoked. Rotating the attester's address invalidates every attestation that the old key signed. Name owners with attestations from that attester must obtain new ones. For more detailed revocation, attesters could include an attestation id in the payload which can be used for revocation checks through an oracle or other on-chain resource.

By default, an attestation's scope only extends to the value of the target text record. Name owners generally publish their platform username, but not the internal UUID that the platform uses to identify specific users. If a platform offers mutable usernames, an attestation could remain valid even after the name owner's username has been changed on the platform. If the platform offers non-unique usernames, the attested value might not point to one specific individual. Additional fields added to the payload, such as a platform's immutable account identifier, can close this gap.

The attester asserts the timestamp `t`, which is only as trustworthy as the attester.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).