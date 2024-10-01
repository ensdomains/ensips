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

- universal resolver magic
- example client implementation

<!-- ## Backwards Compatibility

Optional backwards compatibility section.
Here you can explain how this proposal affects existing systems.

## Forwards Compatibility

Optional forwards compatability section.
Here you can explain how this proposal affects future systems, or potential upgrade paths.

## Security Considerations

Optional security considerations section. -->


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
