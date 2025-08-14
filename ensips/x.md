---
description: Extend profile text records to include OpenPGP key fingerprint
contributors:
  - lordello.eth
ensip:
  created: '2025-08-14'
  status: draft
---

# ENSIP-X: PGP Key Text Record

## Abstract

This proposal would aim to standardize an additional `pgp` text record Profile Key containing an OpenPGP key fingerprint as an extension to [ENSIP-5: Text Records](https://docs.ens.domains/ensip/5) and [ENSIP-18: ENSIP-18: Profile Text Records](https://docs.ens.domains/ensip/18).

## Motivation

[ENSIP-18](https://docs.ens.domains/ensip/18/) standardise a set of text records for profile information associated with an ENS domain. Standardising an additional text record containing an OpenPGP key fingerprint would allow applications to query an additional key for:

- Verifying a PGP key's authenticity
- Verifying PGP signatures, in Git commits in public code for example
- Encrypting messages intended for a recipient identified by their ENS domain name. In particular, paired with the existing `email` text record, would allow applications to trivially send encrypted e-mails to the public profile associated with an ENS domain

Note that this ENSIP proposes only storing the _fingerprint_ and not the full key itself. This means that the actual PGP public key needs to be distributed over other channels (such as PGP key servers for example).

## Specification

A new `pgp` text record that extends the set of Profile Keys described in ENSIP-18. Since Profile Keys are a subset of Global Keys, this proposal would also extend the existing Global Keys described in ENSIP-5.

### `pgp`

**Description**: An OpenPGP key fingerprint

**Format**: The standard OpenPGP key fingerprint string format: upper-case hexadecimal with space separators every two bytes and a double space separator after the first ten bytes

**Example**: `84A3 E5B6 DAA2 DA53 26CC  86C3 49DF 1C60 79D8 3FAC`

**Design Considerations**: The full fingerprint MUST be displayed instead of just the short key ID, as fake keys with the same short ID are [fairly easy to craft](https://lkml.org/lkml/2016/8/15/445).

## Rationale

### Storing the Formatted Key Fingerprint

In theory, an OpenPGP key fingerprint can be encoded in 20 bytes. However, in order for `pgp` to be a text record, this proposal opted for using the standard key fingerprint format. Additionally, this proposal opted to not strip out the spaces (and leave formatting up to clients) as the additional 10 bytes to not significant storage costs on-chain (10 zero to non-zero calldata bytes, and no additional storage slots needed).

### Storing the Fingerprint Instead of the Public Key

We opted to store only key fingerprint and not the full public key. The latter is **much** larger and not suitable for on-chain storage. In particular, the public key corresponding to the above fingerprint is:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

mDMEX9Dd1hYJKwYBBAHaRw8BAQdA8iLoN//6FHMF2A1d9Aa+Wlt7gCv++A8VP76F
7/8gfXG0H1ZpdGFsaWsgQnV0ZXJpbiA8dkBidXRlcmluLmNvbT6IkAQTFggAOBYh
BISj5bbaotpTJsyGw0nfHGB52D+sBQJf0N3WAhsDBQsJCAcCBhUKCQgLAgQWAgMB
Ah4BAheAAAoJEEnfHGB52D+szKABAJWSBjQoBbeSKONq1cpvK1YuAoUWoZ/HcXUS
1dD7kIeTAQC0+Z8RXcOgGaBHkzlyEQBr19j0C98VwoeSPT/qP5N+Cbg4BF/Q3dYS
CisGAQQBl1UBBQEBB0BZhavhZI0JHsen6EEaju8yTpjYo1nohkrRL0ymCOSWAAMB
CAeIeAQYFggAIBYhBISj5bbaotpTJsyGw0nfHGB52D+sBQJf0N3WAhsMAAoJEEnf
HGB52D+sjJYBAKVAM9npm1UZM+nJNY1vhlOIPcngiUEBt84pLM6QsishAP9pLTTR
F/dquF3/CDUbjWGW95f0ierQ2ycMykpDoy4iDw==
=affU
-----END PGP PUBLIC KEY BLOCK-----
```

This corresponds to 412 bytes of data (and 640 bytes when encoded in ASCII armor format). While this public key is reasonably small to be stored on-chain (because it represents an Ed25519 root public key with a single Curve25519 encryption sub-key), others that may use RSA PGP keys have much larger exported public keys. For example, [Linus Torvald's PGP key](https://git.kernel.org/pub/scm/docs/kernel/pgpkeys.git/plain/keys/79BE3E4300411886.asc) that is used for signing Linux kernel commits and releases is 29873 bytes of data (and 40822 bytes when encoded in ASCII armor format), which is unreasonably large for on-chain storage.

It would also have been possible to store the URL to an OpenPGP public key, allowing the full PGP private key to be discoverable through ENS records. The proposal instead opted for just storing the fingerprint as there already are existing means for hosting and sharing PGP keys (such as GitHub, Git repositories, and key servers), and have ENS instead be a source of truth for which PGP key matches a given domain profile and identity.

## Backwards Compatibility

None.

## Security Considerations

None.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
