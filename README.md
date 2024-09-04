# ENSIPs

This repository is a collection of ENSIPs (Ethereum Name Service Improvement Proposals) that have been submitted and are accepted as standard.

## Proposal List

- [ENSIP-1: ENS](https://docs.ens.domains/ensip/1)
- [ENSIP-2: DNS-in-ENS](https://docs.ens.domains/ensip/2)
- [ENSIP-3: Reverse Resolution](https://docs.ens.domains/ensip/3)
- [ENSIP-4: Support for contract ABIs](https://docs.ens.domains/ensip/4)
- [ENSIP-5: Text Records](https://docs.ens.domains/ensip/5)
- [ENSIP-6: DNS-in-ENS](https://docs.ens.domains/ensip/6)
- [ENSIP-7: Contenthash field](https://docs.ens.domains/ensip/7)
- [ENSIP-8: Interface Discovery](https://docs.ens.domains/ensip/8)
- [ENSIP-9: Multichain Address resolution](https://docs.ens.domains/ensip/9)
- [ENSIP-10: Wildcard Resolution](https://docs.ens.domains/ensip/10)
- [ENSIP-11: EVM compatible Chain Address Resolution](https://docs.ens.domains/ensip/11)
- [ENSIP-12: Avatar Text Records](https://docs.ens.domains/ensip/12)
- [ENSIP-13: SAFE Authentication For ENS](https://docs.ens.domains/ensip/13)
- [ENSIP-14: On Chain Source Parameter](https://docs.ens.domains/ensip/14)
- [ENSIP-15: ENS Name Normalization Standard](https://docs.ens.domains/ensip/15)
- [ENSIP-16: Offchain Metadata](https://docs.ens.domains/ensip/16)
- [ENSIP-17: Gasless DNS Resolution](https://docs.ens.domains/ensip/17)
- [ENSIP-18: Profile Text Records](https://docs.ens.domains/ensip/18)
- [ENSIP-19: EVM-chain Reverse Resolution](https://docs.ens.domains/ensip/19)

## Proposal Process

> WIP

- Please PR to `/ensips/x.md` with your proposal for a new ENSIP
- PR's will be assigned an ensip number upon merge by a maintainer
- README.md file is updated by a maintainer accordingly (please do not include in PR)

## Rule List

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
- Must have `contributors` in frontmatter
- Must have `ensip` in frontmatter
  - Must have `created` under `ensip`
  - Must have `status` under `ensip` (draft, obsolete, final)

### General Formatting

- At most one enter in between sections
- No unformattable characters (im looking at you apostrophes), exceptions include name formatting ensip's

## License

All ENSIPs are licensed under the [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) license.
