---
description: A standard for storing EOA/Fallback addresses in ENS.
contributors:
  - luc.eth
ensip:
  created: '2024-10-01'
  status: draft
---

# ENSIP-X: EOA/Fallback Chain Id

## Abstract

This ENSIP specifies a way to set an EOA/Fallback address for a name. This allows for users to set one address to be used for all chains, or as a fallback for when a chain-specific address record is not set.

# testheader

## Motivation

With the rising interest and research around account abstraction, in addition to the maturation of the multi-chain ecosystem, there is a need for users to be able to set a single address to be used across all chains.

For a simple EOA user, this means setting their address once, and never having to worry about it again.
For more advanced users, this means that chain-specific records can be used for smart-contract wallets, and an EOA can be specified as fallback.

## Specification

This ENSIP aims to extend the functionality introduced in [ENSIP-9](./9) and [ENSIP-11](./11) and simply relies on the same functionality.

### CoinType for EOA

The standard CoinType for this proposed chain id is `2147483648`.

This is derived from `evmChainIdToCoinType(0)`, as per [ENSIP-11](./11).

### Resolution Order

- first normal cointype lookup for the chain designated
- then lookup for eoa chain id

### Proposed Implementation

There are multiple routes around implementing this;

For the short-term; we can already use this specification in our apps today (see Appendix A).
Adoption of this method is encouraged as it is future-proof, and can be easily updated in the future.

For the smoothest implementation, we can leverage the universal resolver to handle this functionality for us.
This would mean no additional code is needed, and we can use the regular one-liners you are used to.

## Backwards Compatibility

This proposal is backwards compatible with the existing `addr(node, coinType)` functionality, and simply adds additional fallback behavior.

## Forwards Compatibility

Implementing this proposal following Appendix A allows for a smooth transition to the new functionality.
Later implementations can be reduced down to just a single eth call.

## Appendix A: Example Implementation

Do note that the implementations below are the current implementations, and may change in the future.

### Viem Example

```typescript
import { getEnsAddress } from "viem/actions";
import { mainnet, optimism } from "viem/chains";
import { createPublicClient, http } from "viem";
import { evmChainIdToCoinType } from '@ensdomains/address-encoder/utils';

const client = createPublicClient({ transport: http(), chain: mainnet })

const name = "luc.eth";
const targetChain = optimism;

// First lookup the targetChain address
const target_address = await getEnsAddress(client, { name, coinType: evmChainIdToCoinType(targetChain.id) });

// Then lookup the EOA address if needed
const address = target_address || await getEnsAddress(client, { name, coinType: evmChainIdToCoinType(0) });
```

### Wagmi Example

```typescript
import { useEnsAddress } from "wagmi";

const { data: resolvedAddress } = useEnsAddress({
  name,
  coinType: evmChainIdToCoinType(chain.id)
});

const { data: fallbackAddress } = useEnsAddress({
  name,
  coinType: evmChainIdToCoinType(0),
  enabled: !resolvedAddress
});

const address = resolvedAddress || fallbackAddress;
```

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
