---
description: A standard for verifiable credentials in text records in ENS
contributors:
  - luc.eth
ensip:
  status: draft
  created: 2024-05-21
test
---

# ENSIP-20: Verifiable Credentials in ENS

## Abstract

This ENSIP aims to standardize the usage of [W3C Verifiable Credentials & Presentations](https://www.w3.org/TR/vc-data-model-2.0/) within ENS records.

## Motivation

With the increasing prevalence of self-custodial digital identity & attestation solutions, it is of importance to have a standardized way to publicly share verifiable credentials using your ENS profile.
Allowing for easy sharing of verifiable credentials right on your profile.

## Specification

### Verifications in Profiles

Defines the use of the `verifications` record.
This record aims to store a list of verifiable credentials or did's, pointing towards certain credentials.
Under ideal circumstances this record relies on a yet to be written ENSIP that allows for multidimensional records.
However in its current state assumes that the `verifications` **record contains an abi encoded** `string[]` **of verifiable credentials**.

```
https://myapp.com/credentials/1234.json
```

### Credentials & Presentations

The documents stored in the `verifications` record are verifiable credentials or presentations following the [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/).
These credentials are JSON-LD documents that contain a set of claims, metadata, and proof, signed by the issuer.

Note the requirement for `id` to be `did:ens:luc.eth` in order to prevent credential spoofing.

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://www.w3.org/2018/credentials/examples/v1" // your custom context
  ],
  "id": "https://example.com/credentials/1234",
  "type": ["VerifiableCredential"],
  "issuanceDate": "2024-05-21T00:00:00Z",
  "credentialSubject": {
    "id": "did:ens:luc.eth", // the subject's ens name
    "isCool": "definitely", // your custom field
  }
}
```

### End-User Experience

This method allows users to publicly share their verifiable credentials in a standardized way.
Users can visit an app that lets them create a verifiable credential, and then share the link to that credential in their ENS profile.

Name Manager Applications can then read, and iterate over these credentials and display them in a user-friendly way.
As well as allow for setting/removing/revoking credentials.

### Developer Experience

From the front-end developer perspective reading verifiable credentials is as simple as (name, predicate):

```tsx
const { credentials } = useVC('luc.eth', (c) => c.type == 'TelegramCredential');
```

Under the hood this will resolve to the `verifications` record, which is a `string[]` abi encoded.

### Resolver Interface

Although no resolver modifications are required to support this ENSIP, it is recommended to implement a resolver interface that allows for easier and more gas-efficient adding and removing of verifiable credentials.
An example of such is the proposed below.

It is assumed that credential data is stored in an unsorted set, and that indexes can be used to remove credentials.

```solidity
interface IVerifiableCredentialResolver {
    function addCredentials(bytes32 node, bytes[] calldata data) external;
    function removeCredentials(bytes32 node, uint256[] indexes) external;
}

// TODO: Solidity Arrays vs Abi Encoded
interface IVerifiableCredentialMultiResolver {
    function addCredential(bytes32 node, bytes[] calldata data) external;
    function removeCredential(bytes32 node, uint256[] indexes) external;
}
```

After performing a removeCredential operation it is recommended to re-fetch the credentials record to ensure your app shows the correct order.

## Considerations

### Revocation & Expiration

Verifiable Credentials are meant to be used as long-lived documents.
However this does not mean that they can't be revoked or expired.
In a similar manner to physical documents, a credentials validity can be checked by contacting the issuer or verifying a signature.

The implementation of verification is specific to each issuer, and can be inferred from `verificationMethod` in the credential.
In addition to the `expirationDate` field, which causes the credential to automatically invalidate after a certain date.

This means that identity platforms can allow users to revoke (or expand) credentials without needing to modify the records in ENS.

## Backwards Compatibility

This ENSIP relies on the existing ENS text record functionality introduced in [ENSIP-5](/ensip/5), and only standardizes the usage of the specific `verifications` record.
It imposes forwards compatibility by allowing for future upgrading of record dimensionality while maintaining backwards compatibility.

## Security Considerations

All verifiable credentials stored in a profile or on a blockchain should be assumed to be public and unverified data.
Platforms should decide for themselves what issuers they trust and what credentials they allow and filter for those credentials.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
