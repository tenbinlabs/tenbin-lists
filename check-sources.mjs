// Checks restricted-jurisdictions.json against the documents that govern it.
//
// The docs Geographic Restrictions page is the source of truth for WHICH
// jurisdictions are restricted. The Terms of Use define the narrower set that is
// restricted as a matter of contract. This file fails when either drifts away
// from the published JSON.
//
// Zero dependencies: `node check-sources.mjs`.
import { readFileSync } from "node:fs";

const DOCS_URL = "https://docs.tenbinlabs.xyz/legal-and-transparency/geographic-restrictions.md";
const TERMS_URL = "https://tenbinlabs.xyz/terms-of-use";

// Countries the Terms name outright as Prohibited Jurisdictions. Every one must
// carry basis "sanctions" in the JSON.
const TERMS_NAMED = ["Cuba", "Iran", "Myanmar", "North Korea", "Syria"];
const TERMS_NAMED_REGIONS = ["Crimea", "Donetsk", "Luhansk"];

// The docs page and the JSON word a few entries differently. Anything not listed
// here must match after normalization, so a genuinely new country still fails.
const ALIASES = { "republic of marshall islands": "marshall islands" };

// Countries restricted by Tenbin policy rather than by any clause of the Terms.
// This gap is known and accepted (see the restricted-list audit) — the check
// exists so it cannot grow or shrink without someone noticing.
const POLICY_BASIS_BASELINE = 40;

const errors = [];
const check = (cond, msg) => cond || errors.push(msg);

const normalize = (s) =>
	s
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "") // strip diacritics: Côte -> Cote
		.replace(/[‘’]/g, "'") // curly apostrophes -> straight
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();

const alias = (name) => ALIASES[normalize(name)] ?? normalize(name);

async function get(url) {
	const res = await fetch(url, { headers: { "user-agent": "tenbin-lists-drift-check" } });
	if (!res.ok) throw new Error(`${url} returned ${res.status}`);
	return res.text();
}

const geo = JSON.parse(readFileSync(new URL("./restricted-jurisdictions.json", import.meta.url), "utf8"));

// --- docs Geographic Restrictions page vs the JSON --------------------------
const docs = await get(DOCS_URL);

// The list runs from the "prohibited:" lead-in to the sanctions catch-all.
const listMatch = docs.match(/prohibited:\s*([\s\S]*?),\s*or any other country or region/i);
if (!listMatch) {
	console.error(
		`Could not find the country list on ${DOCS_URL}.\n` +
			"The page structure changed. Re-read it and update the parser in check-sources.mjs.",
	);
	process.exit(1);
}

const docNames = listMatch[1]
	.split(",")
	.map((s) => s.replace(/\\/g, "").trim())
	.filter(Boolean);

const docSet = new Set(docNames.map(alias));
const jsonSet = new Set(geo.countries.map((c) => alias(c.name)));

for (const name of docSet) {
	check(jsonSet.has(name), `Docs page lists "${name}" but restricted-jurisdictions.json does not.`);
}
for (const name of jsonSet) {
	check(docSet.has(name), `restricted-jurisdictions.json lists "${name}" but the docs page does not.`);
}
check(
	docNames.length === geo.countries.length,
	`Docs page has ${docNames.length} countries, JSON has ${geo.countries.length}.`,
);

// --- Terms of Use vs the JSON ----------------------------------------------
const terms = await get(TERMS_URL);
const defMatch = terms.match(/Prohibited Jurisdictions(?:&quot;|"|”)\s*means([\s\S]{0,400}?)\./i);
if (!defMatch) {
	console.error(
		`Could not find the Prohibited Jurisdictions definition at ${TERMS_URL}.\n` +
			"The Terms were restructured. Re-read them and update the parser in check-sources.mjs.",
	);
	process.exit(1);
}
const definition = normalize(defMatch[1]);

const byName = new Map(geo.countries.map((c) => [alias(c.name), c]));
for (const name of TERMS_NAMED) {
	check(definition.includes(normalize(name)), `Terms no longer name "${name}" as a Prohibited Jurisdiction.`);
	const entry = byName.get(alias(name));
	check(entry !== undefined, `Terms name "${name}" but it is missing from restricted-jurisdictions.json.`);
	check(
		entry === undefined || entry.basis === "sanctions",
		`"${name}" is named in the Terms but carries basis "${entry?.basis}" instead of "sanctions".`,
	);
}

const regionNames = new Set(geo.regions.map((r) => alias(r.name)));
for (const region of TERMS_NAMED_REGIONS) {
	check(definition.includes(normalize(region)), `Terms no longer name the ${region} region.`);
	check(regionNames.has(alias(region)), `Terms name the ${region} region but it is missing from the JSON regions.`);
}

// A country the Terms newly name should be reclassified from policy to sanctions.
const policyCount = geo.countries.filter((c) => c.basis === "policy").length;
check(
	policyCount === POLICY_BASIS_BASELINE,
	`${policyCount} countries carry basis "policy", baseline is ${POLICY_BASIS_BASELINE}. ` +
		"If the Terms changed, reclassify the affected entries and update POLICY_BASIS_BASELINE. " +
		"If the list changed, confirm the new entries genuinely have no basis in the Terms.",
);

if (errors.length > 0) {
	console.error("Published sources and restricted-jurisdictions.json disagree:\n");
	console.error(errors.map((e) => `  ${e}`).join("\n"));
	console.error(`\n${errors.length} problem(s) found.`);
	process.exit(1);
}
console.log(
	`OK: ${docNames.length} countries match the docs page; ` +
		`${TERMS_NAMED.length} Terms-named jurisdictions and ${TERMS_NAMED_REGIONS.length} regions accounted for.`,
);
