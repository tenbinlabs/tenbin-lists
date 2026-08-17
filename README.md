# Tenbin Lists

Machine-readable reference data for Tenbin protocol integrations:

| File | What it is |
| --- | --- |
| [`tokenlist.json`](tokenlist.json) | Canonical Tenbin asset token addresses, in [Token Lists](https://tokenlists.org) format |
| [`restricted-jurisdictions.json`](restricted-jurisdictions.json) | Jurisdictions from which access to the Tenbin Services is restricted |

Both files are served from `raw.githubusercontent.com` and are safe to fetch and cache:

```
https://raw.githubusercontent.com/tenbinlabs/tenbin-lists/main/tokenlist.json
https://raw.githubusercontent.com/tenbinlabs/tenbin-lists/main/restricted-jurisdictions.json
```

Pin to a tag or commit if you need a stable snapshot. `main` moves.

## tokenlist.json

Standard Token Lists schema, so it drops into wallets, aggregators, and interfaces that already
consume token lists. All entries are Ethereum mainnet (`chainId: 1`).

Each Tenbin asset has a base token (`tGLD`) and a yield-bearing staked form (`stGLD`). The two are
cross-linked through `extensions`:

```json
{
  "symbol": "tGLD",
  "extensions": {
    "underlyingMarket": "COMEX GOLD",
    "stakedToken": "0x8d301801d899dC81fEabBDE69407A53b82bdBF19"
  }
}
```

`stakedToken` points from a base token to its staked form; `baseToken` points back. Both always
resolve to another entry in the same list.

Tags: `tenbin` marks a token issued by Tenbin, `staked` marks a yield-bearing staked form.

## restricted-jurisdictions.json

```json
{
  "countries": [{ "code": "CU", "name": "Cuba", "basis": "sanctions" }],
  "regions": [{ "code": "UA-43", "country": "UA", "name": "Crimea", "basis": "sanctions" }]
}
```

`countries[].code` is ISO 3166-1 alpha-2. `regions[].code` is ISO 3166-2, for restrictions that
apply to part of a country rather than the whole of it. Both are uppercase.

`basis` says why an entry is on the list. The values are defined inline in the file under
`basisDefinitions`, so the JSON stands on its own:

- `sanctions` — comprehensively sanctioned by the US, Canada, the UK, or the EU; named as a
  Prohibited Jurisdiction in the Terms of Use.
- `us-person` — restricted under the U.S. Person eligibility rule. This one is not purely
  geographic: it turns on citizenship, residency, place of organization, or point of access, so it
  reaches U.S. Persons located outside the United States. An IP-based check will not catch all of
  them.
- `policy` — restricted under Tenbin compliance policy, informed by the FATF high-risk and
  increased-monitoring jurisdiction lists.

Regions are listed separately even where the whole country is currently restricted, so that the
region-level restriction survives any future change to the country-level entry.

### Using it

The list is a blocklist: an entry means access is restricted. Absence from the list is not an
eligibility determination — the Terms of Use impose conditions (KYC, AML and sanctions screening,
whitelisting) that no geographic list can express.

## Versioning

Both files carry a semver `version` object and an ISO 8601 `timestamp`, following the Token Lists
convention:

- **major** — entries removed, or a breaking schema change
- **minor** — entries added
- **patch** — details changed on an existing entry (name, logo, metadata)

Bump the version and the timestamp in the same commit as the change.

## Validating

```bash
node validate.mjs
```

No dependencies, no install step. CI runs it on every push and pull request.

## Authority

These files are published for integration convenience. They are not legal advice and they do not
supersede anything. The [Terms of Use](https://tenbinlabs.xyz/terms-of-use) govern eligibility and
access, and the [Geographic Restrictions](https://docs.tenbinlabs.xyz/legal-and-transparency/geographic-restrictions)
page is the human-readable statement of the restricted-jurisdiction list. Where this repository and
those documents disagree, those documents control.

Restrictions change with sanctions, AML, and compliance frameworks. Re-fetch rather than vendoring a
copy you will not revisit.
