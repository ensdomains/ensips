# ENSIPs

This repository is a collection of ENSIPs (Ethereum Name Service Improvement Proposals) that have been submitted and are accepted as standard.

This repository pertains to standards around the ENS protocol, for DAO governance proposals see [Agora](https://agora.ensdao.org).

## Proposal List

- [ENSIP-1: ENS](https://docs.ens.domains/ensip/1) ([spec](./ensips/1.md))
- [ENSIP-2: DNS-in-ENS](https://docs.ens.domains/ensip/2) ([spec](./ensips/2.md))
- [ENSIP-3: Reverse Resolution](https://docs.ens.domains/ensip/3) ([spec](./ensips/3.md))
- [ENSIP-4: Support for contract ABIs](https://docs.ens.domains/ensip/4) ([spec](./ensips/4.md))
- [ENSIP-5: Text Records](https://docs.ens.domains/ensip/5) ([spec](./ensips/5.md))
- [ENSIP-6: DNS-in-ENS](https://docs.ens.domains/ensip/6) ([spec](./ensips/6.md))
- [ENSIP-7: Contenthash field](https://docs.ens.domains/ensip/7) ([spec](./ensips/7.md))
- [ENSIP-8: Interface Discovery](https://docs.ens.domains/ensip/8) ([spec](./ensips/8.md))
- [ENSIP-9: Multichain Address resolution](https://docs.ens.domains/ensip/9) ([spec](./ensips/9.md))
- [ENSIP-10: Wildcard Resolution](https://docs.ens.domains/ensip/10) ([spec](./ensips/10.md))
- [ENSIP-11: EVM compatible Chain Address Resolution](https://docs.ens.domains/ensip/11) ([spec](./ensips/11.md))
- [ENSIP-12: Avatar Text Records](https://docs.ens.domains/ensip/12) ([spec](./ensips/12.md))
- [ENSIP-13: SAFE Authentication For ENS](https://docs.ens.domains/ensip/13) ([spec](./ensips/13.md))
- [ENSIP-14: On Chain Source Parameter](https://docs.ens.domains/ensip/14) ([spec](./ensips/14.md))
- [ENSIP-15: ENS Name Normalization Standard](https://docs.ens.domains/ensip/15) ([spec](./ensips/15.md))
- [ENSIP-16: Offchain Metadata](https://docs.ens.domains/ensip/16) ([spec](./ensips/16.md))
- [ENSIP-17: Gasless DNS Resolution](https://docs.ens.domains/ensip/17) ([spec](./ensips/17.md))
- [ENSIP-18: Profile Text Records](https://docs.ens.domains/ensip/18) ([spec](./ensips/18.md))
- [ENSIP-19: EVM-chain Reverse Resolution](https://docs.ens.domains/ensip/19) ([spec](./ensips/19.md))

## Proposal Process

> WIP

[Example PR](https://github.com/ensdomains/ensips/pull/4) - [Example Preview](https://template-ensip.ensips.pages.dev/ensip/x)

- Fork this repository and create a new branch
- Create a new file in `/ensips/x.md` with your proposal for a new ENSIP, see [template.md](./template.md)
- Submit a PR to this repository
- Review process status will be updated via PR comments
- PR's will be assigned an ensip number upon merge by a maintainer
- README.md file is updated by a maintainer
- Profit!

### Submission Checklist

- Must have one `title` (#)
- Must have one `Abstract`, with body
- Must have one `Motivation`, with body
- Must have one `Specification`, with body
  - Unlimited subsections under `Specification` are allowed
- Must have one `Rationale`, with body
- May have one `Backwards Compatibility`, with body
- May have one `Security Considerations`, with body
- Must have one `Copyright`, with body matching the template.md
- Must not contain comments `<!-- -->`
- Must have `description` in frontmatter
- Must have `contributors` in frontmatter (nick.eth)
- Must have `ensip` in frontmatter
  - Must have `created` under `ensip` (YYYY-MM-DD)
  - Must have `status` under `ensip` (draft, obsolete, final)

#### General Formatting

- At most one enter in between sections
- No unformattable characters (im looking at you apostrophes), exceptions include name formatting ensip's

## License

All ENSIPs are licensed under the [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) license.
