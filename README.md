# Tenbin Lists

| File | What it is |
| --- | --- |
| [`tokenlist.json`](tokenlist.json) | Tenbin token addresses (Ethereum mainnet), in [Token Lists](https://tokenlists.org) format |
| [`restricted-jurisdictions.json`](restricted-jurisdictions.json) | Jurisdictions restricted from the Tenbin Services |

```
https://raw.githubusercontent.com/tenbinlabs/tenbin-lists/main/tokenlist.json
https://raw.githubusercontent.com/tenbinlabs/tenbin-lists/main/restricted-jurisdictions.json
```

Pin a tag or commit for a stable snapshot. `main` moves.

## tokenlist.json

Standard schema, so it drops into anything that already consumes token lists. Each asset has a base
token and a staked form, cross-linked via `extensions.stakedToken` / `baseToken`.

## restricted-jurisdictions.json

`countries[].code` is ISO 3166-1 alpha-2; `regions[].code` is ISO 3166-2, for restrictions covering
part of a country. `basis` says why an entry is listed, and is defined inline in the file:

- `sanctions` — comprehensively sanctioned by the US, Canada, UK, or EU.
- `us-person` — **not purely geographic.** Turns on citizenship, residency, place of organization, or
  point of access, so it reaches U.S. Persons abroad. An IP check will not catch all of them.
- `policy` — Tenbin compliance policy, informed by the FATF lists.

This is a blocklist. Absence from it is not an eligibility determination: the Terms impose KYC, AML,
sanctions screening, and whitelisting that no geographic list can express.

## Versioning

Semver `version` plus an ISO 8601 `timestamp` on both files. Major for removals, minor for
additions, patch for edits to an existing entry. Bump both in the same commit as the change.

## Validating

```bash
node validate.mjs
```

No dependencies. CI also validates `tokenlist.json` against the official Token Lists schema.

## Authority

Published for integration convenience, not as legal advice. The
[Terms of Use](https://tenbinlabs.xyz/terms-of-use) and
[Geographic Restrictions](https://docs.tenbinlabs.xyz/legal-and-transparency/geographic-restrictions)
control where they and this repository disagree. Re-fetch rather than vendoring a stale copy.

## License

[CC0 1.0](LICENSE) — public domain. Use it however you need; the authority note above still applies.
