---
title: ENS Package Manifest
description: A JSON package manifest format for ENS names, listing downloadable files.
contributors:
  - premm.eth
ensip:
  created: "2026-03-12"
  status: draft
---

# ENSIP-XX: ENS Package Manifest

## Abstract

This ENSIP defines a JSON package manifest for ENS names using familiar package metadata fields. An ENS name points to the manifest with its `contenthash` record, and the manifest tells clients the package name, version, files, executable commands, and where to fetch the package contents.

This lets an ENS name act as a package identifier. A client can resolve the name, fetch the manifest, download the package from a URL, IPFS, a `data:` URL, or another supported URI scheme, verify it, and optionally run an executable defined by the package.


## Motivation

ENS names can identify software packages, tools, or services.

A client resolving a name such as `file-pkg.eth` can:

1. Resolve the name's `contenthash`
2. Fetch the JSON manifest
3. Fetch the package contents
4. Verify integrity

A plain JSON document keeps the format simple and easy to consume from any tooling, including HTML interfaces that load the manifest via JavaScript for example. Reusing package metadata conventions keeps ENS packages familiar to package managers such as npm, yarn, and bun while allowing package contents to be addressed by ENS and IPFS.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Manifest Location

The package manifest MUST be published at the resource referenced by the ENS name's `contenthash` record.

The manifest MUST be a JSON document containing a top-level `manifest` object. Servers SHOULD use the MIME type `application/ens-pkg+json`, or `application/json` when a more specific type is not configurable.

The `contenthash` record MAY reference any content system supported by ENS, including IPFS (per ENSIP-7).

### Manifest Fields

The package manifest object follows package metadata conventions where possible.

The fields in this section apply to the top-level `manifest` object.

The package manifest object MUST include:

- `name`: the package name.
- `version`: the package version.
- `dist`: an object describing where to fetch the package contents, or a non-empty array of such objects describing fallback sources.

The package manifest object MAY include standard package metadata fields such as:

- `author`
- `contributors`
- `description`
- `license`
- `repository`
- `dependencies`
- `devDependencies`
- `scripts`

The package manifest object MAY include:

- `files`: an array of package-relative paths included in the package. This follows the same general meaning as the `files` field in `package.json`.
- `bin`: a string or object defining executable commands. This follows the same general meaning as the `bin` field in `package.json`.

If `bin` is an object, each key is a command name and each value is a package-relative path to an executable file. If `bin` is a string, it is the package-relative path to the default executable for the package name.

Package-relative paths MUST NOT be absolute paths, URLs, or contain `..` path segments.

### Distribution

The `dist` value describes the package artifact or package root. It is based on package registry metadata such as npm's `dist` object, extended to support URLs, IPFS, `data:` URLs, other URI schemes, and ordered fallback sources.

`dist` MUST be either:

- a single distribution object, or
- a non-empty array of distribution objects, listed in order of client preference.

Each distribution object MUST include exactly one of:

- `tarball`: a URI resolving to an archive containing the package contents.
- `directory`: a URI resolving to a package root directory.

The URI MAY use `https:`, `ipfs:`, `data:`, or another URI scheme supported by the client. For example, `tarball` MAY be an HTTPS URL, an IPFS URI, or a `data:` URL containing an archive.

If `tarball` is used, clients fetch the archive and extract package files from it.

If `directory` is used, clients resolve package-relative paths from the directory root. This is useful for IPFS directory CIDs.

Examples of a single source:

```json
{ "dist": { "tarball": "https://example.com/file-pkg-0.1.0.tgz" } }
```

```json
{ "dist": { "tarball": "data:application/gzip;base64,H4sI..." } }
```

```json
{ "dist": { "directory": "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi" } }
```

Example of fallback sources:

```json
{
  "dist": [
    { "tarball": "https://example.com/file-pkg-0.1.0.tgz", "integrity": "sha512-..." },
    { "tarball": "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi" }
  ]
}
```

When `dist` is an array, all entries MUST resolve to the same package contents. Clients try entries in order; the first entry that successfully resolves and verifies is used, and remaining entries are ignored. A successful resolution means the source was fetched and any required integrity check passed.

For non-content-addressed distribution sources, such as `https:` tarballs, each distribution object MUST include:

- `integrity`: a Subresource Integrity string for the package artifact or directory root, when one can be represented.

For content-addressed distribution sources, such as `ipfs:` URIs, `integrity` is OPTIONAL because the URI already identifies the expected content. Clients MUST verify `integrity` when it is present. Clients SHOULD also verify content-addressed sources according to their URI scheme, such as verifying IPFS content against its CID when supported.

### Signatures

The JSON document MAY include signatures over the `manifest` object.

If present, `signatures` MUST be an array.

Each signature entry MUST include:

- `type`: the signature scheme.
- `address`: the wallet address that produced the signature.
- `signature`: the signature bytes encoded as a hex string.

For Ethereum wallet signatures, `type` SHOULD be `eip191`. The signature payload MUST be the canonical JSON serialization of the `manifest` object. Clients that verify signatures MUST recover the signing address and compare it to `address`.

Signatures attest to the manifest metadata. They do not replace `dist.integrity` or content-addressed verification of the package contents.

### Example

```json
{
  "manifest": {
    "name": "file-pkg",
    "version": "0.1.0",
    "description": "Example package with executable binaries.",
    "author": "example.eth",
    "files": [
      "package.json",
      "bin/example",
      "bin/helper"
    ],
    "bin": {
      "file-pkg": "./bin/example",
      "helper": "./bin/helper"
    },
    "dist": [
      {
        "tarball": "https://example.com/file-pkg-0.1.0.tgz",
        "integrity": "sha512-..."
      },
      {
        "tarball": "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
      }
    ]
  },
  "signatures": [
    {
      "type": "eip191",
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "signature": "0x..."
    }
  ]
}
```

### Download and Run CLI Example

Packages may include executable files. The `bin` field maps command names to executable paths, following package metadata conventions. Client tooling can support download-and-run workflows.

```
ensx file-pkg.eth
# Resolves contenthash, fetches manifest, downloads package, verifies integrity, runs file-pkg

ensx file-pkg.eth helper
# Name given: downloads and runs bin/helper
```

### HTML and Other Interfaces

Clients MAY build HTML or other user interfaces that load the JSON manifest via JavaScript (e.g. `fetch()`) and present its files as links or other elements. Such presentations are out of scope of this specification; the JSON manifest is the source of truth.

### Client Behavior

A client resolving a package SHOULD:

1. Resolve the ENS name's `contenthash`
2. Fetch the JSON manifest
3. Read the package metadata from `manifest` and verify signatures when present according to client policy
4. Fetch the package contents from `dist`. If `dist` is an array, try entries in order and use the first that successfully resolves and verifies.
5. Verify `integrity` when present on the selected entry and verify content-addressed sources when supported.
6. Select the requested file or executable from `files` or `bin`

## Rationale

A JSON manifest keeps the specification minimal and easy to consume from any tooling. Using familiar fields such as `name`, `version`, `files`, `bin`, and `dist` keeps ENS packages close to existing package manager metadata while allowing package contents to be distributed through ENS-compatible systems such as IPFS. The top-level wrapper allows wallet attestations without changing the package metadata object being signed. Human-facing presentations such as HTML interfaces can load the manifest via JavaScript when needed, without complicating the canonical package definition.

## Backwards Compatibility

This ENSIP defines a new manifest format consumed by clients. It does not modify existing ENS resolution or contenthash behavior. Names that do not publish a package manifest are unaffected.

## Security Considerations

Clients MUST verify integrity information before executing files when it is present and SHOULD require explicit user approval before execution. External sources MUST be treated as untrusted until verified. Clients MUST reject package-relative paths that are absolute paths, URLs, or contain `..` path segments before writing files to disk.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
