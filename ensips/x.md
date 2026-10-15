---
description: Reverse resolution through the client's own connection to the target chain.
contributors:
  - premm.eth
  - raffy.eth
ensip:
  created: "2026-09-25"
  status: draft
---

# ENSIP-X: ENS Cross-Chain Reverse Resolution

## Abstract

This standard defines `x-chain:`, a special-purpose URI scheme for the `urls` array of an [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) `OffchainLookup` revert. An entry such as `x-chain:8453` signals that the client may satisfy the lookup itself by reading the named chain through its own connection, instead of contacting a gateway listed by the resolver. The client returns the result to the resolver's callback exactly as a gateway would.

## Motivation

[ENSIP-19](./19.md) defines reverse resolution per chain. For a chain-specific reverse record, the resolver on L1 reverts with `OffchainLookup`, a gateway listed by the resolver reads the reverse registrar on the target chain, and the callback verifies the response against state the target chain has posted to L1.

That verification is only possible for chains that post state to L1. Most chains do not, so their registrar contents cannot be proven on L1 at all. L2s post state roots to L1 through rollup contracts (oracles), and ENS resolvers verify gateway responses with verifier contracts that read those roots. When an L2 changes how it posts state, as OP Stack did when it replaced its output oracle with fault-proof dispute games, the verifier must be updated.

Without onchain verification, a conventional CCIP-Read gateway is a trusted party the resolver directs the client to, and the client has no basis for that trust. The client does have a party it already trusts for chain state, its own RPC provider, which it uses for every other read it performs. This proposal lets the resolver hand the read to the client, so the trust decision sits with the party that makes it everywhere else.

[ENSIP-21](./21.md) uses a special-purpose URI in the `urls` array, `x-batch-gateway:true`. `x-chain:` follows the same pattern.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### URI syntax

An `x-chain` entry in the `urls` array of an `OffchainLookup` revert has the form:

```text
x-chain:<chainId>
```

`<chainId>` is the [EIP-155](https://eips.ethereum.org/EIPS/eip-155) chain identifier of an EVM chain, written in decimal with no leading zeros, no sign, and no `0x` prefix. The entry contains no other characters. Examples: `x-chain:1`, `x-chain:8453`.

### Request and response

This ENSIP defines no request or response encoding. The resolver reverts with the same `OffchainLookup` it uses today under [ENSIP-19](./19.md), with the same `sender`, `callData`, `callbackFunction`, and `extraData`. The `x-chain` entry only signals that the client may produce the response itself.

A response the client produces SHOULD consist of the same bytes a conforming gateway listed by the resolver would return for the same `callData`, and `extraData` is passed to the callback unchanged, per EIP-3668.

### Client algorithm

A client processes an `OffchainLookup` revert according to EIP-3668. When the entry selected from `urls` uses the `x-chain` scheme, the client proceeds as follows:

1. Parse `<chainId>` according to the [URI syntax](#uri-syntax) above. If parsing fails, treat the entry as a failed lookup and continue with the next entry.
2. Obtain the response for `callData` by one of:
   - answering the lookup itself, reading chain `chainId` through a connection of the client's own choosing and producing the response bytes defined in [Request and response](#request-and-response) above, or
   - submitting `sender` and `callData` to a gateway of the client's own choosing, following the EIP-3668 gateway protocol.
3. When the client reads the chain itself, it SHOULD read at the chain's finalized block, using the `finalized` block tag or the chain's equivalent notion of finality where it has no such tag.
4. Call `callbackFunction` on the original contract with the response and `extraData`, as defined by EIP-3668. The remainder of the EIP-3668 algorithm, including the `sender` check, recursion on nested `OffchainLookup` reverts, and the lookup limit, is unchanged.

If the lookup cannot be completed, for example the client has no connection to chain `chainId` or the read errors at the transport layer, the client MUST treat the entry like an EIP-3668 5xx response and continue with the next entry in `urls`.

A client that does not support the `x-chain` scheme treats the entry as a failed lookup and continues with the next entry.

An `x-chain` entry changes only how the client obtains the lookup result. Any wider resolution procedure the lookup is part of, such as the ENSIP-19 algorithm, proceeds unchanged.

### Ordering with other entries

`urls` entries remain ordered by the resolver's priority, per EIP-3668. A resolver whose callback cannot verify a gateway response, for example on a chain that posts no state roots to L1, SHOULD list an `x-chain` entry before its HTTP gateway entries. Where the callback can verify a gateway response, the resolver chooses the order, and placing the verifiable gateway first is expected. A resolver MAY include HTTP gateway entries for compatibility with clients that do not support `x-chain`. A resolver MAY list only `x-chain` entries. A client without `x-chain` support then cannot complete the lookup, per EIP-3668 failure handling, which is the intended outcome for resolvers that do not accept unverified gateway responses.

The client processes `urls` entries in the order given, as EIP-3668 requires. An `x-chain` entry is handled at its position like any other entry. A supporting client performs the read itself, and a client that does not support the scheme, or whose read fails, moves on to the next entry. The resolver controls preference by where it places the entry.

### Resolver requirements

A resolver adopting this ENSIP changes only its `urls` array. It MUST revert with the same `sender`, `callData`, `callbackFunction`, and `extraData` it would use with only HTTP gateway entries, and it MUST accept a client-produced response wherever it would accept the same bytes from a gateway.

### Example

Reverse resolution of `0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5` on Base, chain id 8453, resolves `name()` for `b8c2c29ee19d8307cb7255e1cd9cbde883a267d5.80002105.reverse` per ENSIP-19.

1. The client calls `resolve()` on the L1 resolver for `80002105.reverse` per ENSIP-10.
2. The resolver reverts with the same `OffchainLookup` it uses today, except that `urls = ["x-chain:8453", "https://base-gateway.example.com"]`. The `callData` is the resolver's usual request for the `name()` of the reverse node, exactly as it would be sent to the gateway.
3. The client supports `x-chain`, so it answers the request itself. It reads the reverse registrar on Base through its own Base connection and produces the same response bytes the gateway would return.
4. The client calls the resolver's callback with the response and the unchanged `extraData`.
5. The callback returns the ABI-encoded result, which the client decodes to obtain the name and continues per ENSIP-19.

A client without `x-chain` support fails the first entry and uses the HTTP gateway instead. Both paths SHOULD deliver identical bytes to the callback.

## Rationale

A trustless gateway, a CCIP-Read gateway whose response the L1 callback verifies against state the remote chain posts to L1, solves two problems at once: trust, because the answer is proven, and data access, because the client does not need its own connection to the remote chain.

That only works for chains that post verifiable state to L1. There is, however, a large class of chains where the client very likely already has existing, trusted access to the chain, as a wallet already runs or uses an RPC for that chain to show balances and send transactions. For such a client, the security of its L1 call and of its read on the remote chain is the same. It trusts both connections equally, so reading the reverse record through that existing connection adds no new trust assumption from the client's perspective, and needs no gateway.

Because `x-chain:` is only an additional option in the `urls` list, it serves exactly these clients and resolvers as an extra resolution method, without changing ENSIP-19 and without removing trustless gateways where they exist.

## Backwards Compatibility

Clients without `x-chain` support fail the entry and continue with the remaining `urls`, per EIP-3668. A resolver that lists only `x-chain` entries cannot be resolved by those clients, by design. Nothing else in ENSIP-19 resolution changes.

## Security Considerations

- `x-chain:` is for chains whose state cannot be verified on L1; the response is trusted on the basis of the client's own connection to that chain.
- A client that reads the chain itself reveals the lookup to no gateway, which is why resolvers without verification list `x-chain` first.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
