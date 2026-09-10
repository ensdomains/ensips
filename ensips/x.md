---
title: Payment Preferences
description: Ordered payment chain preferences keyed by immutable multichain token snapshots
contributors:
  - premm.eth
ensip:
  created: '2026-09-10'
  status: draft
---

# ENSIP-X: Payment Preferences

## Abstract

An ENS name and token alone do not tell a sender which chain the recipient prefers for payment.
This proposal lets recipients publish ordered per-token chain preferences through ENSIP-24 records.
Preferences are keyed by immutable multichain token snapshot hashes, identifying specific token representations without relying on ambiguous symbols.

## Motivation

ENS can provide a recipient's address on a chosen chain, but the sender must first decide which chain to use.
ERC-7828 makes that choice explicit in a destination such as `alice.eth@ethereum`; it does not supply the choice when the sender knows only `alice.eth`.
The recipient's preferred chain may also depend on the token: they might prefer USDC on Base and ETH on Ethereum.
This ENSIP lets recipients publish an ordered list of preferred chains for each token, giving senders that information before they choose a chain and resolve the receiving address.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### Registry

Tokens such as USDC are deployed on many chains, but no protocol-level identifier groups those deployments as one token. A name or symbol cannot provide that identity because anyone can reuse it, while a contract address identifies only one deployment.

The Multichain Token Registry lets anyone register a name, symbol, and list of deployed contracts as an immutable snapshot. The registry hashes that snapshot to create the token fingerprint used in the ENSIP-24 `payment-preference[<multichainTokenHash>]` key. A token may have several fingerprints when registrations use different contract lists or metadata, and each fingerprint identifies only the snapshot from which it was created.

Registration is not an endorsement. The registry does not check whether the name, symbol, or contract addresses are correct or belong to the same token, so anyone can create a false or misleading snapshot. Its purpose is only to create an immutable identifier from the submitted data; clients must establish authenticity independently.

The canonical registry will be deployed on Ethereum mainnet (chain ID 1), and clients MUST identify it by the address specified in this ENSIP. **Editorial note: add the canonical mainnet address before finalization.** The registry at `0x33bE57E9541ABeaF3bab59C362e1904804de66e3` on Sepolia (chain ID 11155111) is the test deployment ([verified source on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x33bE57E9541ABeaF3bab59C362e1904804de66e3#code)).

The contract enforces the registration rules below: nonempty symbols, array lengths, representation framing and the listed standard/ID checks, exact hashing and storage, duplicate handling, and event/getter behavior. Authenticity, display handling, namespace semantics beyond those checks, and preference parsing and routing are specification/client responsibilities; the registry does not enforce them.

The registry MUST implement the following interface and the contract-enforced registration rules below:

```solidity
interface IMultichainTokenRegistry {
    struct Token {
        string name;
        string symbol;
        bytes[] contracts;
        uint256[] standards;
        uint256[] ids;
        uint256 registrationBlock;
    }

    function registerMultichainToken(
        string calldata name,
        string calldata symbol,
        bytes[] calldata contracts,
        uint256[] calldata standards,
        uint256[] calldata ids
    ) external returns (bytes32 tokenHash);

    function getMultichainToken(bytes32 tokenHash)
        external view returns (Token memory);

    event MultichainTokenRegistered(
        bytes32 indexed multichainTokenHash,
        string name,
        string symbol,
        bytes[] contracts,
        uint256[] standards,
        uint256[] ids
    );

    error TokenNotFound(bytes32 tokenHash);
}
```

### Contract-enforced registration rules

The registry computes the snapshot identifier as:

```solidity
keccak256(abi.encode(name, symbol, contracts, standards, ids))
```

Symbols must be nonempty. Names and symbols are stored without normalization, and array order is preserved; these choices affect the hash. Registration is permissionless and immutable, and registering the same snapshot again returns its existing hash.

### Token representations

Each array index describes one token representation: its chain-specific [ERC-7930](https://eips.ethereum.org/EIPS/eip-7930) address, standard, and token ID. Array order does not express a chain preference.

| Standard | Meaning | ID |
| --- | --- | --- |
| 0 | Native asset, represented by a 20-byte zero address | Zero |
| 20 | ERC-20 | Zero |
| 721, 6909, 1155 | Corresponding ERC | Token ID |
| Other nonzero | Extension | Defined by the extension |

The native zero address identifies an asset, not a payment recipient; wrapped tokens use their actual contracts. Extensions MUST retain existing standard assignments. Clients MUST understand a standard and validate its chain-specific meaning before using it. The contract checks input structure; it does not establish token authenticity or interpret ENS preferences.

### ENS record and parsing

For the normalized name's node, query [ENSIP-24](./24.md) `data(bytes32 node,string key)`:

```text
payment-preference[<multichainTokenHash>]
value = C1 || C2 || ... || Cn
```

Write `<multichainTokenHash>` as all lowercase hex preceded by `0x`. Each `Ci` MUST be an ERC-7930 Chain Identifier. Earlier entries rank higher.

### Snapshot and client requirements

Preferences apply to a specific snapshot and do not automatically carry over to another hash. Clients should retrieve the snapshot from the Ethereum L1 registry, verify its hash and token authenticity, and consider supported chains from that snapshot in the recipient's preferred order. Preferences are one input to chain selection and must respect the sender's explicit choices.

## Backwards Compatibility

This proposal uses the existing ENSIP-24 interface and does not change how ENS addresses or ERC-7828 names are resolved.

## Security Considerations

The registry cannot prevent false or fraudulent registrations. Hashes prove which data produced an identifier, assuming collision resistance, but not that the data is authentic or economically equivalent. Symbols, metadata, contracts, and resolver responses are untrusted; clients MUST handle deceptive or invalid display data safely. Immutable snapshots do not freeze remote contracts. Registration blocks describe only the host chain, not remote inspection times.

Clients should treat a token payment preference as one piece of information when directing a payment to the ENS name owner's preferred chain. A preference alone does not establish that a payment is safe or appropriate; clients remain responsible for validating the token, recipient, and chosen chain before sending funds.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
