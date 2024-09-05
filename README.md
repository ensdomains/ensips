# ENSIPs

This repository is a collection of ENSIPs (Ethereum Name Service Improvement Proposals) that have been submitted and are accepted as standard.

This repository pertains to standards around the ENS protocol, for DAO governance proposals see [Agora](https://agora.ensdao.org).

## Proposal Process

[Example PR](https://github.com/ensdomains/ensips/pull/4) - [Example Preview](https://template-ensip.ensips.pages.dev/ensip/x)

- Fork this repository and create a new branch
- Create a new file in `/ensips/x.md` with your proposal for a new ENSIP, see [template.md](./template.md)
- Submit a PR to this repository
- Review process status will be updated via PR comments
- PR's will be assigned an ensip number upon merge by a maintainer
- README.md file is updated by a maintainer

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
